import { describe, expect, it } from 'vitest';
import {
  RESUMO_ESTILOS,
  buildResumoPrompt,
  estiloResumoValido,
  normalizarResumoEstilos,
  relatosParaBase,
} from './resumo-prompt';

const RELATOS = [
  { envolvidoNome: 'João Silva', texto: 'Seguia na SC-401 e foi atingido na traseira.' },
  { envolvidoNome: 'Maria Souza', texto: 'Freou e o outro veículo colidiu.' },
];

describe('relatosParaBase', () => {
  it('junta os relatos informados e não inventa texto', () => {
    expect(relatosParaBase(RELATOS)).toContain('João Silva: Seguia na SC-401 e foi atingido na traseira.');
    expect(relatosParaBase(RELATOS)).toContain('Maria Souza: Freou e o outro veículo colidiu.');
    expect(relatosParaBase([])).toBe('');
  });
});

describe('buildResumoPrompt', () => {
  it('sempre manda os dois relatos e proíbe inventar fatos', () => {
    const p = buildResumoPrompt(RELATOS, 'tecnico_policial');
    expect(p).toContain('Seguia na SC-401');
    expect(p).toContain('Freou e o outro veículo colidiu');
    expect(p).toMatch(/não invente/i);
  });

  it('oferece somente os dois estilos definidos para o resumo', () => {
    expect(RESUMO_ESTILOS).toEqual(['narrativo', 'tecnico_policial']);
  });

  it('narrativo é formal, objetivo e admite primeira pessoa apenas para ações próprias', () => {
    const p = buildResumoPrompt(RELATOS, 'narrativo');
    expect(p).toMatch(/formal/i);
    expect(p).toMatch(/objetiv/i);
    expect(p).toMatch(/terceira pessoa/i);
    expect(p).toMatch(/primeira pessoa/i);
    expect(p).toMatch(/próprias ações/i);
    expect(p).toMatch(/neutr/i);
  });

  it('técnico/policial é impessoal, técnico, descritivo e não atribui culpa', () => {
    const p = buildResumoPrompt(RELATOS, 'tecnico_policial');
    expect(p).toMatch(/extremamente impessoal/i);
    expect(p).toMatch(/técnic/i);
    expect(p).toMatch(/descritiv/i);
    expect(p).toMatch(/dinâmica física/i);
    expect(p).toMatch(/não atribua culpa|não.*errad/i);
  });

  it('migra estilos antigos e usa técnico/policial como padrão', () => {
    expect(estiloResumoValido('policial')).toBe('tecnico_policial');
    expect(estiloResumoValido('tecnico')).toBe('tecnico_policial');
    expect(estiloResumoValido('leigo')).toBe('narrativo');
    expect(estiloResumoValido('admin')).toBe('tecnico_policial');
    expect(estiloResumoValido(undefined)).toBe('tecnico_policial');
  });

  it('preserva o técnico antigo quando o policial antigo está vazio', () => {
    const resultado = normalizarResumoEstilos({
      estiloResumo: 'leigo',
      resumo: 'Resumo leigo atual.',
      resumos: {
        tecnico: 'Resumo técnico salvo.',
        policial: '',
        leigo: 'Resumo leigo atual.',
      },
    });

    expect(resultado.resumos.tecnico_policial).toBe('Resumo técnico salvo.');
    expect(resultado.resumos.narrativo).toBe('Resumo leigo atual.');
  });
});
