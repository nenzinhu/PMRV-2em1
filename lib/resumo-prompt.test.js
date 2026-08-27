import { describe, expect, it } from 'vitest';
import { buildResumoPrompt, relatosParaBase } from './resumo-prompt';

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
    const p = buildResumoPrompt(RELATOS, 'policial');
    expect(p).toContain('Seguia na SC-401');
    expect(p).toContain('Freou e o outro veículo colidiu');
    expect(p).toMatch(/não invente/i);
  });

  it('leigo pede linguagem simples para o cidadão', () => {
    const p = buildResumoPrompt(RELATOS, 'leigo');
    expect(p).toMatch(/leigo|cidadão|simples/i);
    expect(p).not.toMatch(/Código de Trânsito Brasileiro \(CTB\)/);
  });

  it('técnico pede linguagem de perícia e casos judiciais', () => {
    const p = buildResumoPrompt(RELATOS, 'tecnico');
    expect(p).toMatch(/perít|judicial|trajetória|ponto de impacto/i);
  });

  it('policial pede resumo neutro com normas e CTB só se couber nos fatos', () => {
    const p = buildResumoPrompt(RELATOS, 'policial');
    expect(p).toMatch(/neutro/i);
    expect(p).toMatch(/Código de Trânsito Brasileiro|CTB/);
    expect(p).toMatch(/presume-se/i);
  });

  it('estilo desconhecido cai no policial, sem inventar modo', () => {
    expect(buildResumoPrompt(RELATOS, 'admin')).toBe(buildResumoPrompt(RELATOS, 'policial'));
    expect(buildResumoPrompt(RELATOS, undefined)).toBe(buildResumoPrompt(RELATOS, 'policial'));
  });
});
