import { describe, expect, it } from 'vitest';
import { AJUSTE_FINO_PADRAO, aplicarAjusteFino, carregarAjusteFino, normalizarAjusteFino, salvarAjusteFino } from './ajuste-fino';

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
