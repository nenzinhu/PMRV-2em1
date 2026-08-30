const UF_NOME = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};

function limparCidade(cidade) {
  if (!cidade) return '';
  return String(cidade).replace(/\/[A-Z]{2}$/i, '').trim();
}

export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const uf = (searchParams.get('uf') || '').trim().toUpperCase();
  const cidade = limparCidade(searchParams.get('cidade'));

  if (q.length < 3) {
    return Response.json({ results: [] });
  }

  const params = new URLSearchParams();
  params.set('format', 'jsonv2');
  params.set('addressdetails', '1');
  params.set('limit', '6');
  params.set('countrycodes', 'br');
  params.set('accept-language', 'pt-BR');
  params.set('street', q);
  if (cidade) params.set('city', cidade);
  if (UF_NOME[uf]) params.set('state', UF_NOME[uf]);

  const url = 'https://nominatim.openstreetmap.org/search?' + params.toString();

  try {
    const resp = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PMRV-RelatoPolicial/1.0 (https://relatos-policiais-next.vercel.app)',
      },
    });
    if (!resp.ok) return Response.json({ results: [] });
    const data = await resp.json();
    const list = Array.isArray(data) ? data : [];
    const results = list.map((r) => {
      const a = r.address || {};
      const rua = a.road || a.pedestrian || a.footway || a.path || '';
      const numero = a.house_number || '';
      const bairro = a.suburb || a.neighbourhood || a.quarter || '';
      const cid = a.city || a.town || a.village || a.municipality || '';
      const endereco = rua ? (numero ? `${rua}, ${numero}` : rua) : '';
      return {
        label: r.display_name || endereco || q,
        endereco,
        bairro,
        cidade: cid,
      };
    });
    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
