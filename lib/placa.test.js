import { afterEach, describe, expect, it, vi } from 'vitest';
import { consultarPlaca, normalizarPlaca, placaConsultavel } from './placa';
import * as placaUtils from './placa';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('placa', () => {
  it('normaliza e valida formatos antigo e Mercosul', () => {
    expect(normalizarPlaca(' abc-1d23 ')).toBe('ABC1D23');
    expect(placaConsultavel('abc1d23')).toBe(true);
    expect(placaConsultavel('ABC-1234')).toBe(true);
    expect(placaConsultavel('AB1234')).toBe(false);
    expect(placaConsultavel('ABC12345')).toBe(false);
    expect(placaConsultavel('ABC1D23XYZ')).toBe(false);
    expect(placaConsultavel('ABC@1234')).toBe(false);
    expect(placaConsultavel('ABC--1234')).toBe(false);
    expect(placaConsultavel('A-B-C-1234')).toBe(false);
  });

  it('consulta apenas pela placa e recebe marca/modelo e cor normalizados', async () => {
    localStorage.setItem('PMRV_PLACA_TOKEN', 'token-antigo-do-navegador');
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ modelo: 'VW CROSSFOX', cor: 'Prata' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(consultarPlaca('int-8c36')).resolves.toEqual({ modelo: 'VW CROSSFOX', cor: 'Prata' });
    expect(fetchMock).toHaveBeenCalledWith('/api/placa?placa=INT8C36');
  });

  it('aplica a resposta somente à mesma placa e substitui os dois dados', () => {
    expect(placaUtils.aplicarDadosConsultados).toBeTypeOf('function');
    const atual = [{ id: 1, placa: 'ABC1D23', nome: 'Maria', modelo: 'Antigo', cor: 'Azul' }];

    expect(
      placaUtils.aplicarDadosConsultados(atual, 1, 'ABC1D23', { modelo: 'FIAT ARGO', cor: '' })
    ).toEqual([{ id: 1, placa: 'ABC1D23', nome: 'Maria', modelo: 'FIAT ARGO', cor: '' }]);
    expect(
      placaUtils.aplicarDadosConsultados([{ ...atual[0], placa: 'DEF4G56' }], 1, 'ABC1D23', {
        modelo: 'FIAT ARGO',
        cor: 'Branco',
      })
    ).toEqual([{ ...atual[0], placa: 'DEF4G56' }]);
  });
});
