import { PMRV_GROQ_MODEL, PMRV_OPENROUTER_MODEL, PMRV_GEMINI_MODEL } from '@/lib/pmrv';

// Roda no servidor (Node) — as chaves ficam em process.env (GROQ_API_KEY,
// OPENROUTER_API_KEY e GEMINI_API_KEY) e NUNCA vão ao navegador. Faz proxy
// streaming do provedor escolhido (groq | openrouter | gemini) de volta ao cliente.
export const runtime = 'nodejs';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// Endpoint compatível com OpenAI do Gemini — aceita o mesmo formato de body/SSE.
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// Chave padrão do Gemini (usada apenas se GEMINI_API_KEY não estiver definida no .env.local).
const GEMINI_DEFAULT_KEY = 'AQ.Ab8RN6IotNa1oU_ZlZpE276MLqySjUNP_bQmyjGym-WHyvmv6g';

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const provider =
    payload.provider === 'openrouter' || payload.provider === 'gemini' ? payload.provider : 'groq';
  const serverKey =
    provider === 'openrouter'
      ? process.env.OPENROUTER_API_KEY || ''
      : provider === 'gemini'
        ? process.env.GEMINI_API_KEY || GEMINI_DEFAULT_KEY
        : process.env.GROQ_API_KEY || '';

  // Chave do servidor tem prioridade; o cliente pode enviar um override opcional
  // (botão 🔑), mas ela NÃO fica embutida no bundle.
  const apiKey = serverKey || payload.apiKey || '';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'nokey' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { prompt, system = null, temperature = 1, maxTokens = 2048, model = null } = payload;

  const mensagens = [];
  if (system) mensagens.push({ role: 'system', content: system });
  mensagens.push({ role: 'user', content: prompt });

  const resolvedModel =
    model ||
    (provider === 'openrouter'
      ? PMRV_OPENROUTER_MODEL
      : provider === 'gemini'
        ? PMRV_GEMINI_MODEL
        : PMRV_GROQ_MODEL);

  let body;
  if (provider === 'openrouter' || provider === 'gemini') {
    body = {
      model: resolvedModel,
      messages: mensagens,
      temperature,
      max_tokens: maxTokens,
      top_p: 1,
      stream: true,
    };
  } else {
    body = {
      model: resolvedModel,
      messages: mensagens,
      temperature,
      max_completion_tokens: maxTokens,
      top_p: 1,
      stream: true,
      stop: null,
      compound_custom: { tools: { enabled_tools: ['web_search', 'code_interpreter', 'visit_website'] } },
    };
  }

  const endpoint =
    provider === 'openrouter' ? OPENROUTER_ENDPOINT : provider === 'gemini' ? GEMINI_ENDPOINT : GROQ_ENDPOINT;

  const upstream = await fetch(endpoint, {
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
