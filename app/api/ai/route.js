import { conteudoUsuario, montarTentativas, validarImagens } from '@/lib/ai-server';

// Roda no servidor (Node) — as chaves ficam em process.env (ver .env.example)
// e NUNCA vão ao navegador. Faz proxy streaming do provedor escolhido; se ele
// falhar (sem chave, cota, modelo removido, fora do ar), tenta automaticamente
// o próximo da lista (fallback). Os headers X-PMRV-* dizem quem respondeu.
export const runtime = 'nodejs';

// Tempo máximo até o provedor começar a responder (o streaming não tem limite).
const TIMEOUT_INICIO_MS = 25000;

function erroJson(error, status) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function tentar({ provedor, modelo, apiKey, chatUrl }, mensagens, { temperature, maxTokens }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_INICIO_MS);
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
  let payload;
  try {
    payload = await req.json();
  } catch {
    return erroJson('invalid', 400);
  }

  const { prompt, system = null, temperature = 1, maxTokens = 2048, model = null } = payload;
  const imagens = validarImagens(payload.images);
  if (imagens === false || typeof prompt !== 'string' || !prompt.trim()) return erroJson('invalid', 400);

  const opcoes = {
    provider: payload.provider,
    model,
    apiKeyCliente: typeof payload.apiKey === 'string' ? payload.apiKey : '',
    fallback: payload.fallback !== false,
  };
  const tentativas = montarTentativas({ ...opcoes, visao: Boolean(imagens) });
  if (!tentativas.length) {
    // 422: há chave, mas nenhum provedor configurado tem modelo que lê imagem.
    const temChave = imagens && montarTentativas(opcoes).length > 0;
    return temChave ? erroJson('novisao', 422) : erroJson('nokey', 500);
  }

  const mensagens = [];
  if (system) mensagens.push({ role: 'system', content: system });
  mensagens.push({ role: 'user', content: conteudoUsuario(prompt, imagens) });

  let ultimoStatus = 502;
  for (const t of tentativas) {
    let upstream;
    try {
      upstream = await tentar(t, mensagens, { temperature, maxTokens });
    } catch (err) {
      console.warn(`[api/ai] ${t.provedor.id}/${t.modelo}: ${err.name === 'AbortError' ? 'timeout' : err.message}`);
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
    console.warn(`[api/ai] ${t.provedor.id}/${t.modelo}: HTTP ${upstream.status}`);
    await upstream.body?.cancel().catch(() => {});
  }

  // Todas falharam: devolve o status da última (401/403 → auth, 429 → cota...).
  // 500 é reservado para "sem chave" no cliente, então vira 502.
  return erroJson('upstream', ultimoStatus === 500 ? 502 : ultimoStatus);
}
