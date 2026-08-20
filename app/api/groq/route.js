import { PMRV_GROQ_MODEL } from '@/lib/pmrv';

// Roda no servidor (Node) — a chave da API fica em process.env.GROQ_API_KEY
// e NUNCA é enviada ao navegador. Faz proxy streaming da Groq de volta ao cliente.
export const runtime = 'nodejs';

export async function POST(req) {
  const envKey = process.env.GROQ_API_KEY || '';

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Chave do servidor tem prioridade; o cliente pode enviar uma chave de override
  // (botão 🔑), mas ela NÃO fica embutida no bundle.
  const apiKey = envKey || payload.apiKey || '';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'nokey' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { prompt, system = null, temperature = 1, maxTokens = 2048 } = payload;

  const mensagens = [];
  if (system) mensagens.push({ role: 'system', content: system });
  mensagens.push({ role: 'user', content: prompt });

  const body = {
    model: PMRV_GROQ_MODEL,
    messages: mensagens,
    temperature,
    max_completion_tokens: maxTokens,
    top_p: 1,
    stream: true,
    stop: null,
    compound_custom: { tools: { enabled_tools: ['web_search', 'code_interpreter', 'visit_website'] } },
  };

  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // Repassa o stream (SSE) da Groq diretamente para o cliente.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
