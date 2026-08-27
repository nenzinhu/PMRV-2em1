import { describe, expect, it } from 'vitest';
import { rodoviaLabel, RODOVIAS, rodoviasDoSeletor } from './rodovias-list';

describe('rodoviaLabel', () => {
  it('troca TIC01–TIC03 pelos nomes das pontes', () => {
    expect(rodoviaLabel('TIC01')).toBe('P. Hercílio Luz');
    expect(rodoviaLabel('TIC02')).toBe('P. C. Machado Salles');
    expect(rodoviaLabel('TIC03')).toBe('P. Pedro Ivo Campos');
  });

  it('não inventa nome para outras rodovias', () => {
    expect(rodoviaLabel('SC-401')).toBe('SC-401');
    expect(rodoviaLabel('')).toBe('');
  });

  it('lista do seletor usa os nomes das pontes, não TIC', () => {
    expect(RODOVIAS).toContain('P. Hercílio Luz');
    expect(RODOVIAS).toContain('P. C. Machado Salles');
    expect(RODOVIAS).toContain('P. Pedro Ivo Campos');
    expect(RODOVIAS).not.toContain('TIC01');
    expect(RODOVIAS).not.toContain('TIC02');
    expect(RODOVIAS).not.toContain('TIC03');
  });
});

describe('rodoviasDoSeletor', () => {
  it('oferece ilha, pontes, Grande Florianópolis e Tijucas', () => {
    const itens = rodoviasDoSeletor().flatMap((g) => g.itens);
    expect(itens).toEqual(expect.arrayContaining([
      'SC-401',
      'ACESSO AEROPORTO INTERNACIONAL HERCÍLIO LUZ',
      'P. Hercílio Luz',
      'P. C. Machado Salles',
      'P. Pedro Ivo Campos',
      'SC-281',
      'SC-407',
      'SC-410',
    ]));
    expect(itens).not.toContain('BR-280');
    expect(itens).not.toContain('SC-496');
    expect(itens).not.toContain('TIC01');
  });

  it('se o GPS trouxer outra rodovia oficial, ela entra sem inventar nome', () => {
    const grupos = rodoviasDoSeletor('SC-390');
    expect(grupos.some((g) => g.grupo === 'Outra da malha' && g.itens.includes('SC-390'))).toBe(true);
  });
});
