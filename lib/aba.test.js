import { describe, expect, it } from 'vitest';
import { abaFromSearchParam, areaFromAba, abaInicialDaArea, ABAS_OCORRENCIA } from './aba';

describe('abaFromSearchParam', () => {
  it('aceita só as abas reais do app', () => {
    expect(abaFromSearchParam('envolvidos')).toBe('envolvidos');
    expect(abaFromSearchParam('relato')).toBe('relato');
    expect(abaFromSearchParam('danos')).toBe('danos');
    expect(abaFromSearchParam('resumo')).toBe('resumo');
    expect(abaFromSearchParam('salvar')).toBe('salvar');
  });

  it('não inventa aba: valor ausente ou desconhecido cai em envolvidos', () => {
    expect(abaFromSearchParam(undefined)).toBe('envolvidos');
    expect(abaFromSearchParam(null)).toBe('envolvidos');
    expect(abaFromSearchParam('')).toBe('envolvidos');
    expect(abaFromSearchParam('admin')).toBe('envolvidos');
    expect(abaFromSearchParam(['relato', 'resumo'])).toBe('envolvidos');
  });

  it('agrupa as seis rotas existentes em quatro areas operacionais', () => {
    expect(areaFromAba('envolvidos')).toBe('pessoas');
    expect(areaFromAba('danos')).toBe('ocorrencia');
    expect(areaFromAba('dinamica')).toBe('ocorrencia');
    expect(areaFromAba('resumo')).toBe('ocorrencia');
    expect(areaFromAba('relato')).toBe('relato');
    expect(areaFromAba('salvar')).toBe('finalizar');
  });

  it('define uma entrada previsivel para cada area principal', () => {
    expect(abaInicialDaArea('pessoas')).toBe('envolvidos');
    expect(abaInicialDaArea('ocorrencia')).toBe('dinamica');
    expect(abaInicialDaArea('relato')).toBe('relato');
    expect(abaInicialDaArea('finalizar')).toBe('salvar');
    expect(ABAS_OCORRENCIA).toEqual(['danos', 'dinamica', 'resumo']);
  });
});
