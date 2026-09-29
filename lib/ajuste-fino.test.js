import { describe, expect, it } from 'vitest';
import { AJUSTE_FINO_PADRAO, aplicarAjusteFino, carregarAjusteFino, normalizarAjusteFino, salvarAjusteFino, salvarModeloDaOcorrencia } from './ajuste-fino';

function memoria() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

describe('ajuste fino', () => {
  it('normaliza valores inválidos', () => {
    expect(normalizarAjusteFino({ temperatura: 5, tamanho: 'enorme', instrucoes: 3 })).toEqual({
      ...AJUSTE_FINO_PADRAO,
      temperatura: 1,
    });
    expect(normalizarAjusteFino('lixo')).toEqual(AJUSTE_FINO_PADRAO);
  });

  it('salva e carrega do storage', () => {
    const s = memoria();
    salvarAjusteFino({ temperatura: 0.7, tamanho: 'curto', instrucoes: 'Use V1', exemplo: '' }, s);
    expect(carregarAjusteFino(s)).toMatchObject({ temperatura: 0.7, tamanho: 'curto', instrucoes: 'Use V1' });
  });

  it('acrescenta tamanho, instruções e relato-modelo ao prompt', () => {
    const p = aplicarAjusteFino('PROMPT', { tamanho: 'detalhado', instrucoes: 'Use V1', exemplo: 'Modelo X' });
    expect(p.startsWith('PROMPT')).toBe(true);
    expect(p).toContain('Seja detalhado');
    expect(p).toContain('Instruções do redator (siga sempre): Use V1');
    expect(p).toContain('"""Modelo X"""');
  });

  it('sem instruções nem exemplo, só o tamanho', () => {
    const p = aplicarAjusteFino('P', {});
    expect(p).not.toContain('Instruções do redator');
    expect(p).not.toContain('Relato-modelo');
  });
});

describe('ajuste fino por tipo de ocorrência', () => {
  const ajuste = {
    exemplo: 'Modelo geral',
    porOcorrencia: { '9.3': { instrucoes: 'Citar o IGP', exemplo: 'Modelo suicídio' }, lixo: { instrucoes: 'x' }, '3.2': { instrucoes: '', exemplo: '' } },
  };

  it('descarta códigos inválidos e tipos vazios', () => {
    expect(Object.keys(normalizarAjusteFino(ajuste).porOcorrencia)).toEqual(['9.3']);
  });

  it('usa instruções e modelo do tipo, com prioridade sobre o modelo geral', () => {
    const p = aplicarAjusteFino('P', ajuste, '9.3');
    expect(p).toContain('Instruções para este tipo de ocorrência (siga sempre): Citar o IGP');
    expect(p).toContain('"""Modelo suicídio"""');
    expect(p).not.toContain('Modelo geral');
  });

  it('sem ajuste do tipo, mantém o modelo geral', () => {
    const p = aplicarAjusteFino('P', ajuste, '2.1');
    expect(p).toContain('"""Modelo geral"""');
    expect(p).not.toContain('este tipo de ocorrência');
  });

  it('salva o texto atual como modelo do tipo', () => {
    const s = memoria();
    salvarModeloDaOcorrencia('9.1', 'Texto modelo', s);
    expect(carregarAjusteFino(s).porOcorrencia['9.1']).toEqual({ instrucoes: '', exemplo: 'Texto modelo' });
  });
});
