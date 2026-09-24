import { PMRV_MODELOS_FALLBACK, filtrarModelosGratis } from '@/lib/ai-models';

// Lista os modelos GRATUITOS do provedor consultando a API dele no servidor
// (as chaves ficam em process.env). Resultado em cache por 1h; em caso de falha
// ou sem chave, devolve a lista fixa de fallback com `fallback: true`.
export const runtime = 'nodejs';

function requisicao(provider) {
  if (provider === 'openrouter') {
    // Endpoint público — não exige chave.
    return { url: 'https://openrouter.ai/api/v1/models', headers: {} };
  }
  const chave = process.env.GROQ_API_KEY;
  if (!chave) return null;
  return {
    url: 'https://api.groq.com/openai/v1/models',
    headers: { Authorization: `Bearer ${chave}` },
  };
}

export async function GET(req) {
  const param = new URL(req.url).searchParams.get('provider');
  const provider = param === 'openrouter' ? 'openrouter' : 'groq';
  const fallback = { provider, models: PMRV_MODELOS_FALLBACK[provider], fallback: true };

  const alvo = requisicao(provider);
  if (!alvo) return Response.json(fallback);

  try {
    const resp = await fetch(alvo.url, {
      headers: alvo.headers,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const models = filtrarModelosGratis(provider, await resp.json());
    if (!models.length) return Response.json(fallback);
    return Response.json({ provider, models, fallback: false });
  } catch (err) {
    console.warn(`[api/ai/models] ${provider}: ${err.message}`);
    return Response.json(fallback);
  }
}
