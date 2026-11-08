import { conteudoUsuario, montarTentativas, validarImagens } from '@/lib/ai-server';

// Roda no servidor (Node) — as chaves ficam em process.env (ver .env.example)
// e NUNCA vão ao navegador. Faz proxy streaming do provedor escolhido; se ele
// falhar (sem chave, cota, modelo removido, fora do ar), tenta automaticamente
// o próximo da lista (fallback). Os headers X-PMRV-* dizem quem respondeu.
export const runtime = 'nodejs';

// Tempo máximo até o provedor começar a responder (o streaming não tem limite).
// Com fotos o upload e a leitura demoram mais.
const TIMEOUT_INICIO_MS = 25000;
const TIMEOUT_INICIO_IMAGENS_MS = 60000;
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_PROMPT_CHARS = 50000;
const MAX_SYSTEM_CHARS = 20000;
const MAX_TOKENS = 4096;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const requestsPorIp = new Map();

function erroJson(error, status, extra = {}) {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function lerJsonLimitado(req) {
  const contentLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return { grande: true };
  if (!req.body) return { json: null };
  const reader = req.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return { grande: true };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { json: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { json: null };
  }
}

// Limite por instância para reduzir abuso acidental e rajadas. Em deployments
// com múltiplas instâncias, um limitador distribuído deve substituir este mapa.
function excedeuLimite(req) {
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const agora = Date.now();
  const registro = requestsPorIp.get(ip);
  if (!registro || agora - registro.inicio >= RATE_WINDOW_MS) {
    if (requestsPorIp.size >= 2000) {
      for (const [chave, valor] of requestsPorIp) {
        if (agora - valor.inicio >= RATE_WINDOW_MS) requestsPorIp.delete(chave);
      }
    }
    if (requestsPorIp.size >= 2000) return true;
    requestsPorIp.set(ip, { inicio: agora, quantidade: 1 });
    return false;
  }
  registro.quantidade += 1;
  return registro.quantidade > RATE_LIMIT;
}

// Motivo legível da falha do provedor (sem segredos: só a mensagem de erro dele).
async function motivoDoErro(resp) {
  const texto = await resp.text().catch(() => '');
  let msg = texto;
  try {
    const obj = JSON.parse(texto);
    msg = obj?.error?.message || obj?.message || obj?.detail || obj?.error || texto;
  } catch {
    /* corpo não é JSON: usa o texto */
  }
  return String(typeof msg === 'string' ? msg : JSON.stringify(msg)).replace(/\s+/g, ' ').trim().slice(0, 200);
}

async function tentar({ provedor, modelo, apiKey, chatUrl }, mensagens, { temperature, maxTokens, timeoutMs }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(chatUrl, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: mensagens,
        temperature,
        [provedor.tokensParam || 'max_tokens']: maxTokens,
        top_p: 1,
        stream: true,
      }),
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req) {
  if (excedeuLimite(req)) return erroJson('rate_limit', 429, { retryAfter: 60 });
  const recebido = await lerJsonLimitado(req).catch(() => ({ json: null }));
  if (recebido.grande) return erroJson('invalid', 413);
  const payload = recebido.json;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return erroJson('invalid', 400);

  const { prompt, system = null, temperature = 1, maxTokens = 2048, model = null } = payload;
  const imagens = validarImagens(payload.images);
  if (
    imagens === false ||
    typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS ||
    (system !== null && (typeof system !== 'string' || system.length > MAX_SYSTEM_CHARS)) ||
    !Number.isFinite(temperature) || temperature < 0 || temperature > 2 ||
    !Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > MAX_TOKENS ||
    (payload.apiKey != null && (typeof payload.apiKey !== 'string' || payload.apiKey.length > 512))
  ) return erroJson('invalid', 400);

  const opcoes = {
    provider: payload.provider,
    model,
    apiKeyCliente: typeof payload.apiKey === 'string' ? payload.apiKey : '',
    fallback: payload.fallback !== false,
  };
  const tentativas = montarTentativas({ ...opcoes, visao: Boolean(imagens), qtdImagens: imagens?.length || 0 });
  if (!tentativas.length) {
    // 422: há chave, mas nenhum provedor configurado tem modelo que lê imagem.
    const temChave = imagens && montarTentativas(opcoes).length > 0;
    return temChave ? erroJson('novisao', 422) : erroJson('nokey', 500);
  }

  const mensagens = [];
  if (system) mensagens.push({ role: 'system', content: system });
  mensagens.push({ role: 'user', content: conteudoUsuario(prompt, imagens) });

  const timeoutMs = imagens ? TIMEOUT_INICIO_IMAGENS_MS : TIMEOUT_INICIO_MS;
  const falhas = [];
  let ultimoStatus = 502;
  for (const t of tentativas) {
    const falha = { provedor: t.provedor.label, modelo: t.modelo };
    let upstream;
    try {
      upstream = await tentar(t, mensagens, { temperature, maxTokens, timeoutMs });
    } catch (err) {
      const motivo = err.name === 'AbortError' ? `sem resposta em ${timeoutMs / 1000}s` : `falha de rede (${err.message})`;
      console.warn(`[api/ai] ${t.provedor.id}/${t.modelo}: falha de conexão`);
      falhas.push({ ...falha, status: 504, motivo });
      ultimoStatus = 504;
      continue;
    }
    if (upstream.ok && upstream.body) {
      // Repassa o stream (SSE) do provedor diretamente para o cliente.
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-PMRV-Provider': t.provedor.id,
          'X-PMRV-Model': encodeURIComponent(t.modelo),
          'X-PMRV-Fallback': t === tentativas[0] ? '0' : '1',
        },
      });
    }
    ultimoStatus = upstream.status;
    const motivo = await motivoDoErro(upstream);
    console.warn(`[api/ai] ${t.provedor.id}/${t.modelo}: HTTP ${upstream.status}`);
    falhas.push({ ...falha, status: upstream.status, motivo });
  }

  // Todas falharam: devolve o status da última (401/403 → auth, 429 → cota...)
  // e o motivo de cada tentativa. 500 é reservado para "sem chave" no cliente.
  return erroJson('upstream', ultimoStatus === 500 ? 502 : ultimoStatus, { falhas });
}
