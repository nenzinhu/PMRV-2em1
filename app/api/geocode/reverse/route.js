import { formatEndereco, extrairCidadeUf } from '@/lib/gps-label';

export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lon = Number(searchParams.get('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: 'Coordenadas inválidas.' }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return Response.json({ error: 'Coordenadas inválidas.' }, { status: 400 });
  }

  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    `?lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lon))}` +
    '&format=jsonv2&addressdetails=1&zoom=18&accept-language=pt-BR';

  try {
    const resp = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PMRV-RelatoPolicial/1.0 (https://relatos-policiais-next.vercel.app)',
      },
    });
    if (!resp.ok) {
      return Response.json({ endereco: '' }, { status: 200 });
    }
    const data = await resp.json();
    const { cidade, uf } = extrairCidadeUf(data);
    return Response.json({ endereco: formatEndereco(data), cidade, uf });
  } catch {
    return Response.json({ endereco: '' }, { status: 200 });
  }
}
