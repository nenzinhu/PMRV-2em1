import { filtrarModelosGratis } from '@/lib/ai-models';
import { provedoresConfigurados, resolverProvedor } from '@/lib/ai-server';

// GET /api/ai/models                → { providers: { groq: true, ... } } (quais têm chave no servidor)
// GET /api/ai/models?provider=<id>  → modelos GRATUITOS do provedor, consultados ao vivo
// na API dele (cache de 1h). Em falha/sem chave devolve o fallback com `fallback: true`.
export const runtime = 'nodejs';

export async function GET(req) {
  const param = new URL(req.url).searchParams.get('provider');
  if (!param) return Response.json({ providers: provedoresConfigurados() });

  const { provedor, chave, modelosUrl } = resolverProvedor(param);
  const fallback = { provider: provedor.id, models: provedor.fallback, fallback: true };

  const precisaChave = !provedor.modelos?.publico;
  if (!modelosUrl || (precisaChave && !chave)) return Response.json(fallback);

  try {
    const resp = await fetch(modelosUrl, {
      headers: chave ? { Authorization: `Bearer ${chave}` } : {},
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const models = filtrarModelosGratis(provedor.id, await resp.json());
    if (!models.length) return Response.json(fallback);
    return Response.json({ provider: provedor.id, models, fallback: false });
  } catch (err) {
    console.warn(`[api/ai/models] ${provedor.id}: ${err.message}`);
    return Response.json(fallback);
  }
}
