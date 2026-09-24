import { describe, expect, it } from 'vitest';
import { normalizarPlaca, placaConsultavel } from './placa';

describe('placa', () => {
  it('normaliza e valida formatos antigo e Mercosul', () => {
    expect(normalizarPlaca(' abc-1d23 ')).toBe('ABC1D23');
    expect(placaConsultavel('abc1d23')).toBe(true);
    expect(placaConsultavel('ABC-1234')).toBe(true);
    expect(placaConsultavel('AB1234')).toBe(false);
  });
});
