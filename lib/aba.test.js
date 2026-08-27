import { describe, expect, it } from 'vitest';
import { abaFromSearchParam } from './aba';

describe('abaFromSearchParam', () => {
  it('aceita só as abas reais do app', () => {
    expect(abaFromSearchParam('envolvidos')).toBe('envolvidos');
    expect(abaFromSearchParam('relato')).toBe('relato');
    expect(abaFromSearchParam('resumo')).toBe('resumo');
  });

  it('não inventa aba: valor ausente ou desconhecido cai em envolvidos', () => {
    expect(abaFromSearchParam(undefined)).toBe('envolvidos');
    expect(abaFromSearchParam(null)).toBe('envolvidos');
    expect(abaFromSearchParam('')).toBe('envolvidos');
    expect(abaFromSearchParam('admin')).toBe('envolvidos');
    expect(abaFromSearchParam(['relato', 'resumo'])).toBe('envolvidos');
  });
});
