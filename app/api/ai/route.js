import { modeloValido } from '@/lib/ai-models';
import { resolverProvedor } from '@/lib/ai-server';

// Roda no servidor (Node) — as chaves ficam em process.env (ver .env.example)
// e NUNCA vão ao navegador. Faz proxy streaming do provedor escolhido (qualquer
// um de PMRV_PROVEDORES_IA, todos compatíveis com OpenAI) de volta ao cliente.
export const runtime = 'nodejs';

function erroJson(error, status) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return erroJson('invalid', 400);
  }

  const { provedor, chave, chatUrl } = resolverProvedor(payload.provider);

  // Chave do servidor tem prioridade; o cliente pode enviar um override opcional
  // (botão 🔑), mas ela NÃO fica embutida no bundle.
  const apiKey = chave || payload.apiKey || '';
  if (!apiKey || !chatUrl) return erroJson('nokey', 500);

  const { prompt, system = null, temperature = 1, maxTokens = 2048, model = null } = payload;

  const mensagens = [];
  if (system) mensagens.push({ role: 'system', content: system });
  mensagens.push({ role: 'user', content: prompt });

  const resolvedModel = modeloValido(model) ? model : provedor.padrao;

  const body = {
    model: resolvedModel,
    messages: mensagens,
    temperature,
    [provedor.tokensParam || 'max_tokens']: maxTokens,
    top_p: 1,
    stream: true,
  };
  // Ferramentas só existem nos sistemas groq/compound*.
  if (provedor.id === 'groq' && resolvedModel.startsWith('groq/compound')) {
    body.compound_custom = { tools: { enabled_tools: ['web_search', 'code_interpreter', 'visit_website'] } };
  }

  const upstream = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // Repassa o stream (SSE) do provedor diretamente para o cliente.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
