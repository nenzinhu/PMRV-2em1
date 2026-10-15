import { normalizarDadosPlaca, normalizarPlaca, placaConsultavel } from '@/lib/placa';

// API para consulta de placa de veículo via wdapi2
// Formato: https://wdapi2.com.br/consulta/{placa}/{token}
// O token fica SOMENTE no servidor (PLACA_API_TOKEN em .env.local) e nunca
// vai ao navegador nem aos logs. Sem a variável, a rota devolve 500 'nokey'.
export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const placa = normalizarPlaca(searchParams.get('placa'));
  const token = (process.env.PLACA_API_TOKEN || '').trim();

  if (!token) {
    return new Response(JSON.stringify({ error: 'nokey' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!placaConsultavel(placa)) {
    return new Response(JSON.stringify({ error: 'Placa inválida. Use o formato AAA0X00 ou AAA9999.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = `https://wdapi2.com.br/consulta/${encodeURIComponent(placa)}/${encodeURIComponent(token)}`;

    const resp = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    const text = await resp.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || `HTTP ${resp.status}` };
    }

    if (!resp.ok) {
      const status = resp.status === 404 || resp.status === 429 ? resp.status : 502;
      const error = resp.status === 404
        ? 'Placa não encontrada.'
        : resp.status === 429
          ? 'Limite de consultas de placa atingido. Tente novamente mais tarde.'
          : 'O serviço de consulta de placa recusou a solicitação.';
      return new Response(JSON.stringify({ error }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data || data.message || data.error) {
      return new Response(JSON.stringify({ error: 'A consulta de placa não foi concluída.' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalized = normalizarDadosPlaca(data);
    if (!normalized.modelo && !normalized.cor) {
      return new Response(JSON.stringify({ error: 'A consulta não retornou marca/modelo ou cor para esta placa.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Não registre o objeto de erro: algumas implementações incluem a URL com o token.
    console.error('[api/placa] falha de rede no serviço externo');
    return new Response(JSON.stringify({ error: 'Serviço de consulta de placa indisponível.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
