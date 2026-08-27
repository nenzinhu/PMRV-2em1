import { describe, expect, it } from 'vitest';
import { formatEndereco, gpsLocationLabel } from './gps-label';

describe('formatEndereco', () => {
  it('monta rua, número, bairro e cidade/SC a partir do Nominatim', () => {
    expect(
      formatEndereco({
        address: {
          road: 'Rua Felipe Schmidt',
          house_number: '90',
          suburb: 'Centro',
          city: 'Florianópolis',
          state: 'Santa Catarina',
        },
      })
    ).toBe('Rua Felipe Schmidt, 90, Centro, Florianópolis/SC');
  });

  it('sem rua não inventa logradouro — só cidade/SC', () => {
    expect(
      formatEndereco({
        display_name: 'Centro, Biguaçu, Santa Catarina, Brasil',
        address: { city: 'Biguaçu', state: 'Santa Catarina' },
      })
    ).toBe('Biguaçu/SC');
  });

  it('sem dados da API não inventa endereço', () => {
    expect(formatEndereco(null)).toBe('');
    expect(formatEndereco({})).toBe('');
  });
});

describe('gpsLocationLabel', () => {
  it('na rodovia mostra SC e KM', () => {
    expect(
      gpsLocationLabel({
        rodovia: 'SC-401',
        km: 12.345,
        foraDaRodovia: false,
      })
    ).toBe('SC-401 KM 12,345');
  });

  it('fora da rodovia mostra o endereço da API de mapa', () => {
    expect(
      gpsLocationLabel({
        foraDaRodovia: true,
        endereco: 'Rua das Palmeiras, Centro, Florianópolis/SC',
        dist: 400,
      })
    ).toBe('Rua das Palmeiras, Centro, Florianópolis/SC');
  });

  it('na rodovia ignora endereço de rua', () => {
    expect(
      gpsLocationLabel({
        rodovia: 'SC-401',
        km: 1,
        foraDaRodovia: false,
        endereco: 'Rua X',
      })
    ).toBe('SC-401 KM 1,000');
  });

  it('TIC01 aparece como P. Hercílio Luz', () => {
    expect(
      gpsLocationLabel({
        rodovia: 'TIC01',
        km: 0.5,
        foraDaRodovia: false,
      })
    ).toBe('P. Hercílio Luz KM 0,500');
  });
});
