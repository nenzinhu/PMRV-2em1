// Conversão geográfica e casamento de rodovia por GPS.
// CRS dos dados: SIRGAS 2000 / UTM Zona 22S (aprox. WGS84 para precisão de campo).

const A = 6378137.0;
const E2 = 0.00669438002299318; // (a^2 - b^2)/a^2 , GRS80
const K0 = 0.9996;
const ZONE = 22;
const LON0 = -51.0; // meridiano central (graus)
const FE = 500000.0;
const FN = 10000000.0; // hemisfério sul

export function latLonToUtm22S(lat, lon) {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const lon0R = (LON0 * Math.PI) / 180;
  const n = Math.tan(latR);
  const T = n * n;
  const C = E2 / (1 - E2) * Math.cos(latR) ** 2;
  const A_ = (lonR - lon0R) * Math.cos(latR);
  const M =
    A *
    ((1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256) * latR -
      ((3 * E2) / 8 + (3 * E2 * E2) / 32 + (45 * E2 ** 3) / 1024) * Math.sin(2 * latR) +
      ((15 * E2 * E2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * latR) -
      ((35 * E2 ** 3) / 3072) * Math.sin(6 * latR));
  const v = A / Math.sqrt(1 - E2 * Math.sin(latR) ** 2);
  const A2 = A_ * A_;
  const A3 = A2 * A_;
  const A4 = A3 * A_;
  const A5 = A4 * A_;
  const A6 = A5 * A_;
  // termos
  const easting =
    FE +
    K0 *
      v *
      (A_ +
        ((1 - T + C) * A3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * E2 / (1 - E2)) * A5) / 120);
  const northing =
    FN +
    K0 *
      (M +
        v *
          Math.tan(latR) *
          (A2 / 2 + ((5 - T + 9 * C + 4 * C * C) * A4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * E2 / (1 - E2)) * A6) / 720));
  return { x: easting, y: northing };
}

function dist2seg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const d = Math.hypot(px - cx, py - cy);
  return { d, t };
}

// Recebe o FeatureCollection (geojson) e coordenadas lat/lon.
// Retorna a rodovia mais próxima (<= maxMeters) com KM interpolado.
// Varredura completa: referência de corretude e fallback sem índice.
export function matchRodovia(geojson, lat, lon, maxMeters = 120) {
  const { x, y } = latLonToUtm22S(lat, lon);
  let best = null;
  for (const f of geojson.features) {
    const g = f.geometry;
    if (!g || g.type !== 'LineString') continue;
    const coords = g.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const [ax, ay] = coords[i];
      const [bx, by] = coords[i + 1];
      const { d, t } = dist2seg(x, y, ax, ay, bx, by);
      if (best === null || d < best.d) {
        const kmIni = f.properties.kmInicial;
        const kmFim = f.properties.kmFinal;
        // geometria presumida digitada de kmInicial -> kmFinal
        const km = kmIni + t * (kmFim - kmIni);
        best = {
          d,
          rodovia: f.properties.rodovia,
          km: Math.max(0, km),
          kmInicial: kmIni,
          kmFinal: kmFim,
          nome: f.properties.nome,
          situacao: f.properties.situacao,
          revestimento: f.properties.revestimento,
        };
      }
    }
  }
  if (!best) return null;
  if (best.d > maxMeters) {
    return { ...best, foraDaRodovia: true };
  }
  return best;
}

// --- Índice espacial (grade em metros UTM) ---
// Construído UMA VEZ após carregar o GeoJSON; cada tick do GPS consulta só as
// células próximas em vez de varrer todos os segmentos do estado (pesado no
// celular e na bateria). Resultado idêntico ao matchRodovia quando há
// segmento no raio inicial; se não houver, dobra o raio até um teto e, além
// dele, devolve null (ponto muito longe de qualquer rodovia indexada).

export function construirIndiceMalha(geojson, tamanhoCelula = 1000) {
  const celulas = new Map();
  const features = [];
  let totalSegmentos = 0;
  for (const f of (geojson && geojson.features) || []) {
    const g = f.geometry;
    if (!g || g.type !== 'LineString') continue;
    const coords = g.coordinates;
    const idx = features.length;
    features.push({ coords, propriedades: f.properties || {} });
    for (let i = 0; i < coords.length - 1; i++) {
      totalSegmentos++;
      const [ax, ay] = coords[i];
      const [bx, by] = coords[i + 1];
      // registra o segmento em cada célula que a sua bounding box toca
      const x0 = Math.floor(Math.min(ax, bx) / tamanhoCelula);
      const x1 = Math.floor(Math.max(ax, bx) / tamanhoCelula);
      const y0 = Math.floor(Math.min(ay, by) / tamanhoCelula);
      const y1 = Math.floor(Math.max(ay, by) / tamanhoCelula);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const k = cx + ':' + cy;
          let lista = celulas.get(k);
          if (!lista) celulas.set(k, (lista = []));
          lista.push([idx, i]);
        }
      }
    }
  }
  return { features, celulas, tamanhoCelula, totalSegmentos };
}

const MAX_RAIO_CELULAS = 32;

function melhorNoQuadrado(indice, x, y, raio) {
  const { celulas, features, tamanhoCelula } = indice;
  const cx = Math.floor(x / tamanhoCelula);
  const cy = Math.floor(y / tamanhoCelula);
  let best = null;
  for (let ix = cx - raio; ix <= cx + raio; ix++) {
    for (let iy = cy - raio; iy <= cy + raio; iy++) {
      const lista = celulas.get(ix + ':' + iy);
      if (!lista) continue;
      for (const par of lista) {
        const f = features[par[0]];
        const coords = f.coords;
        const seg = par[1];
        const [ax, ay] = coords[seg];
        const [bx, by] = coords[seg + 1];
        const { d, t } = dist2seg(x, y, ax, ay, bx, by);
        if (best === null || d < best.d) {
          const p = f.propriedades;
          const kmIni = p.kmInicial;
          const kmFim = p.kmFinal;
          const km = kmIni + t * (kmFim - kmIni);
          best = {
            d,
            rodovia: p.rodovia,
            km: Math.max(0, km),
            kmInicial: kmIni,
            kmFinal: kmFim,
            nome: p.nome,
            situacao: p.situacao,
            revestimento: p.revestimento,
          };
        }
      }
    }
  }
  return best;
}

// Mesma resposta de matchRodovia, mas consultando só o quadrado de células
// próximas do índice. maxMeters garante o raio mínimo de busca.
export function matchRodoviaNoIndice(indice, lat, lon, maxMeters = 120) {
  if (!indice || !indice.celulas) return null;
  const { x, y } = latLonToUtm22S(lat, lon);
  let raio = Math.ceil(maxMeters / indice.tamanhoCelula) + 1;
  let best = null;
  while (best === null && raio <= MAX_RAIO_CELULAS) {
    best = melhorNoQuadrado(indice, x, y, raio);
    if (best === null) raio *= 2;
  }
  if (!best) return null;
  if (best.d > maxMeters) {
    return { ...best, foraDaRodovia: true };
  }
  return best;
}

export function formatKmValue(v) {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  return String(n);
}
