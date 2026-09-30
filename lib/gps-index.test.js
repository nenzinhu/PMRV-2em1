import { describe, expect, it } from 'vitest';
import { construirIndiceMalha, latLonToUtm22S, matchRodovia, matchRodoviaNoIndice } from './gps';

// O GeoJSON oficial (rodovias-sc.geojson) usa coordenadas UTM 22S em METROS.
// Gera trechos sintéticos no mesmo formato: reta leste-oeste a partir do
// lat/lon dado, com ~1 km de extensão.
function trecho(rodovia, kmInicial, kmFinal, lat, lon) {
  const a = latLonToUtm22S(lat, lon);
  const b = latLonToUtm22S(lat, lon + 0.01);
  return {
    properties: { rodovia, kmInicial, kmFinal, nome: `Rodovia ${rodovia}`, situacao: 'PAV', revestimento: 'CA' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [a.x, a.y],
        [b.x, b.y],
      ],
    },
  };
}

const GEOJSON = {
  features: [
    trecho('SC-401', 10, 11, -27.5, -48.5),
    trecho('SC-407', 3, 4, -27.49, -48.5),
  ],
};

const INDICE = construirIndiceMalha(GEOJSON);

describe('construirIndiceMalha', () => {
  it('indexa todos os segmentos das geometrias LineString', () => {
    expect(INDICE.features).toHaveLength(2);
    expect(INDICE.totalSegmentos).toBe(2);
    expect(INDICE.celulas.size).toBeGreaterThan(0);
  });

  it('ignora geometrias que não são LineString', () => {
    const idx = construirIndiceMalha({
      features: [
        { properties: {}, geometry: { type: 'Point', coordinates: [700000, 6955000] } },
        ...GEOJSON.features,
      ],
    });
    expect(idx.features).toHaveLength(2);
    expect(idx.totalSegmentos).toBe(2);
  });

  it('lida com malha vazia ou nula', () => {
    expect(construirIndiceMalha(null).totalSegmentos).toBe(0);
    expect(matchRodoviaNoIndice(construirIndiceMalha({ features: [] }), -27.5, -48.5, 150)).toBeNull();
  });
});

describe('matchRodoviaNoIndice', () => {
  it('devolve o mesmo resultado da varredura completa (dentro do raio)', () => {
    for (const [lat, lon] of [
      [-27.5, -48.495],
      [-27.49, -48.495],
      [-27.4995, -48.495],
    ]) {
      expect(matchRodoviaNoIndice(INDICE, lat, lon, 150)).toEqual(matchRodovia(GEOJSON, lat, lon, 150));
    }
  });

  it('marca foraDaRodovia quando o ponto está longe (mesma semântica da varredura)', () => {
    const lat = -27.47;
    const lon = -48.495;
    const idx = matchRodoviaNoIndice(INDICE, lat, lon, 150);
    expect(idx.foraDaRodovia).toBe(true);
    expect(idx).toEqual(matchRodovia(GEOJSON, lat, lon, 150));
  });

  it('devolve null para ponto muito longe de qualquer rodovia', () => {
    expect(matchRodoviaNoIndice(INDICE, -28.5, -49.5, 150)).toBeNull();
  });

  it('consulta uma fração dos segmentos da malha (menos CPU por tick do GPS)', () => {
    // ponto perto da SC-401: o quadrado de raio 1 não pode ver os 2 segmentos
    // aqui são só 2, então compara contra uma malha maior de 200 trechos.
    const grade = { features: [] };
    for (let i = 0; i < 200; i++) {
      grade.features.push(trecho('SC-9' + (i % 10), i, i + 1, -26.0 + i * 0.01, -48.5));
    }
    const idx = construirIndiceMalha(grade);
    const vistos = segmentosNoQuadrado(idx, -26.0, -48.495, 1);
    expect(vistos).toBeLessThan(idx.totalSegmentos);
  });
});

// conta quantos segmentos o quadrado de raio dado alcança, sem depender de internals
function segmentosNoQuadrado(indice, lat, lon, raio) {
  const { x, y } = latLonToUtm22S(lat, lon);
  const { celulas, tamanhoCelula } = indice;
  const cx = Math.floor(x / tamanhoCelula);
  const cy = Math.floor(y / tamanhoCelula);
  const vistos = new Set();
  for (let ix = cx - raio; ix <= cx + raio; ix++) {
    for (let iy = cy - raio; iy <= cy + raio; iy++) {
      for (const par of celulas.get(ix + ':' + iy) || []) vistos.add(par.join(':'));
    }
  }
  return vistos.size;
}
