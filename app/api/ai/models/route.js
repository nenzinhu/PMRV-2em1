import { filtrarModelosGratis, filtrarModelosVisao } from '@/lib/ai-models';
import { provedoresConfigurados, resolverProvedor } from '@/lib/ai-server';

// GET /api/ai/models                → { providers: { groq: true, ... } } (quais têm chave no servidor)
// GET /api/ai/models?provider=<id>  → modelos GRATUITOS do provedor, consultados ao vivo
// na API dele (cache de 1h). Em falha/sem chave devolve o fallback com `fallback: true`.
// GET /api/ai/models?provider=<id>&visao=1 → só os gratuitos que leem imagem (aba Danos).
export const runtime = 'nodejs';

export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const param = params.get('provider');
  const visao = params.get('visao') === '1';
  if (!param) return Response.json({ providers: provedoresConfigurados() });

  const { provedor, chave, modelosUrl } = resolverProvedor(param);
  const fallback = { provider: provedor.id, models: visao ? [] : provedor.fallback, fallback: true };
  if (visao && !provedor.visaoAoVivo) return Response.json(fallback);

  const precisaChave = !provedor.modelos?.publico;
  if (!modelosUrl || (precisaChave && !chave)) return Response.json(fallback);

  try {
    const resp = await fetch(modelosUrl, {
      headers: chave ? { Authorization: `Bearer ${chave}` } : {},
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const bruto = await resp.json();
    const models = visao ? filtrarModelosVisao(provedor.id, bruto) : filtrarModelosGratis(provedor.id, bruto);
    if (!models.length) return Response.json(fallback);
    return Response.json({ provider: provedor.id, models, fallback: false });
  } catch (err) {
    console.warn(`[api/ai/models] ${provedor.id}: ${err.message}`);
    return Response.json(fallback);
  }
}
