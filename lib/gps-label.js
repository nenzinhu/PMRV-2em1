/** Formata o JSON do Nominatim. Não inventa rua nem cidade. */
export function formatEndereco(data) {
  if (!data || typeof data !== 'object') return '';
  const a = data.address;
  if (!a || typeof a !== 'object') return '';

  const rua = a.road || a.pedestrian || a.footway || a.path || '';
  const numero = a.house_number || '';
  const bairro = a.suburb || a.neighbourhood || a.quarter || '';
  const cidade = a.city || a.town || a.village || a.municipality || '';
  const uf = ufFromState(a.state);

  const parts = [];
  if (rua) parts.push(numero ? `${rua}, ${numero}` : rua);
  if (bairro && bairro !== cidade) parts.push(bairro);
  if (cidade) parts.push(uf ? `${cidade}/${uf}` : cidade);
  else if (uf) parts.push(uf);

  return parts.join(', ');
}

function ufFromState(state) {
  if (!state || typeof state !== 'string') return '';
  const s = state.trim();
  if (/^[A-Z]{2}$/.test(s)) return s;
  if (/santa catarina/i.test(s)) return 'SC';
  return '';
}

/** Texto do chip: rodovia+KM na malha; endereço fora dela. */
export function gpsLocationLabel(info) {
  if (!info) return '';
  if (info.erro) return '';
  if (!info.foraDaRodovia && info.rodovia) {
    const km =
      typeof info.km === 'number'
        ? info.km.toFixed(3).replace('.', ',')
        : String(info.km || '');
    return `${info.rodovia} KM ${km}`.trim();
  }
  if (info.endereco) return info.endereco;
  return '';
}

export function mapsUrl(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return '';
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
}
