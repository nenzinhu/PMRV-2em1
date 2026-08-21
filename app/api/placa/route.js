// API para consulta de placa de veículo via wdapi2
// Formato: https://wdapi2.com.br/consulta/{placa}/{token}
export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const placa = searchParams.get('placa');
  const token = searchParams.get('token') || '622283d1f02d343efd13800a14dd0ab8';

  if (!placa || placa.length < 7) {
    return new Response(JSON.stringify({ error: 'Placa inválida. Informe uma placa com pelo menos 7 caracteres.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = `https://wdapi2.com.br/consulta/${encodeURIComponent(placa.toUpperCase())}/${encodeURIComponent(token)}`;
    console.log('[API PLACA] URL:', url);

    const resp = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const text = await resp.text();
    console.log('[API PLACA] Status:', resp.status);
    console.log('[API PLACA] Body:', text.slice(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || `HTTP ${resp.status}` };
    }

    if (!resp.ok || !data || data.message) {
      return new Response(JSON.stringify({ error: data?.message || `Erro ${resp.status}` }), {
        status: resp.status || 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const marca = [data.MARCA, data.MODELO].filter(Boolean).join(' ');
    const cor = data.cor && data.cor.trim() ? data.cor.trim() : '';

    const normalized = {
      ...data,
      modelo: marca || data.MODELO || '',
      cor: cor || data.cor || '',
    };

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao consultar placa:', error);
    return new Response(JSON.stringify({ error: 'Erro ao consultar a placa. Tente novamente.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
