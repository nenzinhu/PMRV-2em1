import { provedoresConfigurados, resolverProvedor } from '@/lib/ai-server';

// GET /api/ai/models                → { providers: { groq: true, ... } } (quais têm chave no servidor)
// GET /api/ai/models?provider=<id>  → lista fixa de modelos permitidos do provedor.
// GET /api/ai/models?provider=<id>&visao=1 → subconjunto fixo que lê imagens.
export const runtime = 'nodejs';

export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const param = params.get('provider');
  const visao = params.get('visao') === '1';
  if (!param) return Response.json({ providers: provedoresConfigurados() });

  const { provedor } = resolverProvedor(param);
  const models = visao
    ? (provedor.visao || []).map(({ id, label }) => ({ id, label }))
    : provedor.fallback;
  return Response.json({ provider: provedor.id, models, fixed: true });
}
