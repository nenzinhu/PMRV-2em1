import { afterEach, describe, expect, it, vi } from 'vitest';
import { garantirMunicipios, municipiosDoUF, MUNICIPIOS_POR_UF } from './municipios';

afterEach(() => {
  vi.resetModules();
});

describe('municípios', () => {
  it('SC está disponível de imediato (síncrono)', () => {
    expect(MUNICIPIOS_POR_UF.SC.length).toBeGreaterThan(250);
    expect(municipiosDoUF('SC')).toBe(MUNICIPIOS_POR_UF.SC);
    expect(municipiosDoUF('SC')).toContain('Florianópolis');
  });

  it('carrega UF sob demanda e cacheia a segunda chamada', async () => {
    const primeira = await garantirMunicipios('GO');
    expect(primeira.length).toBeGreaterThan(200);
    expect(primeira).toContain('Goiânia');
    const segunda = await garantirMunicipios('GO');
    expect(segunda).toBe(primeira); // mesma referência: veio do cache
    expect(municipiosDoUF('GO')).toBe(primeira);
  });

  it('UF sem dados devolve lista vazia (não quebra)', async () => {
    const lista = await garantirMunicipios('XX');
    expect(lista).toEqual([]);
  });
});
