import { describe, expect, it } from 'vitest';
import {
  apresentacaoEnvolvido,
  aplicarRespostaDinamica,
  buildDinamicaPrompt,
  estadoInicialDinamica,
  normalizarEstadoDinamica,
  novoEnvolvidoDinamica,
} from './dinamica-presumida';

function estado(relatos, extra = {}) {
  const base = estadoInicialDinamica();
  return {
    ...base,
    ...extra,
    envolvidos: relatos.map((r, i) => ({ ...novoEnvolvidoDinamica(i + 1), relato: r })),
  };
}

describe('buildDinamicaPrompt', () => {
  it('pede para presumir apenas os relatos em branco', () => {
    const p = buildDinamicaPrompt(estado(['Relata que freou.', '', 'Relata que parou.']));
    expect(p).toContain('Presuma o relato dos envolvidos 2');
    expect(p).toContain('Envolvido 2: [SEM RELATO — PRESUMIR]');
    expect(p).toContain('Envolvido 3: "Relata que parou."');
    expect(p).toContain('inclua apenas os envolvidos 2.');
  });

  it('com "apenas 1" ignora os demais e não presume relatos', () => {
    const p = buildDinamicaPrompt(estado(['Perdeu o controle na curva.', ''], { apenasUm: true }));
    expect(p).toContain('UM único envolvido');
    expect(p).not.toContain('Envolvido 2');
    expect(p).toContain('"relatos" deve ser uma lista vazia');
  });

  it('aplica o estilo escolhido e o padrão para estilo inválido', () => {
    expect(buildDinamicaPrompt(estado(['x'], { estilo: 'narrativo' }))).toContain('NARRATIVO-DESCRITIVO');
    expect(buildDinamicaPrompt(estado(['x'], { estilo: '???' }))).toContain('POLICIAL:');
  });
});

describe('aplicarRespostaDinamica', () => {
  const resposta = JSON.stringify({
    relatos: [
      { envolvido: 2, texto: 'Relata que foi atingido na traseira.' },
      { envolvido: 1, texto: 'NÃO DEVE SOBRESCREVER' },
    ],
    dinamica: 'Presume-se que V1 colidiu na traseira de V2.',
  });

  it('preenche só relatos em branco, marca como presumidos e grava a dinâmica', () => {
    const r = aplicarRespostaDinamica(estado(['Relata que freou tarde.', '']), `Aqui está:\n${resposta}`);
    expect(r.envolvidos[0]).toMatchObject({ relato: 'Relata que freou tarde.', presumido: false });
    expect(r.envolvidos[1]).toMatchObject({ relato: 'Relata que foi atingido na traseira.', presumido: true });
    expect(r.dinamica).toBe('Presume-se que V1 colidiu na traseira de V2.');
  });

  it('refaz relato presumido (não editado) ao gerar de novo', () => {
    const s = estado(['A', 'versão antiga']);
    s.envolvidos[1].presumido = true;
    expect(aplicarRespostaDinamica(s, resposta).envolvidos[1].relato).toBe('Relata que foi atingido na traseira.');
  });

  it('rejeita resposta sem dinâmica ou sem JSON', () => {
    expect(() => aplicarRespostaDinamica(estado(['A']), '{"relatos":[]}')).toThrow();
    expect(() => aplicarRespostaDinamica(estado(['A']), 'texto solto')).toThrow();
  });
});

describe('normalizarEstadoDinamica', () => {
  it('descarta lixo e volta ao estado inicial', () => {
    expect(normalizarEstadoDinamica(null)).toEqual(estadoInicialDinamica());
    expect(normalizarEstadoDinamica({ envolvidos: [{ id: 'x' }] }).envolvidos).toHaveLength(2);
  });

  it('preserva um estado válido', () => {
    const s = { ...estado(['a', 'b', 'c']), apenasUm: false, estilo: 'factual', dinamica: 'd' };
    expect(normalizarEstadoDinamica(s)).toEqual(s);
  });
});

describe('apresentação do envolvido e local', () => {
  const env = { ...novoEnvolvidoDinamica(1), nome: 'João', modelo: 'VW Gol', cor: 'PRATA', placa: 'abc1d23' };

  it('monta a frase completa com rodovia e km', () => {
    expect(apresentacaoEnvolvido(env, { rodovia: 'SC-401', km: '12,5' })).toBe(
      'o condutor João deslocava com seu veículo VW Gol de cor prata, placa ABC1D23, pela SC-401, km 12,5'
    );
  });

  it('omite o que não foi informado', () => {
    expect(apresentacaoEnvolvido({ ...env, cor: '', placa: '' })).toBe('o condutor João deslocava com seu veículo VW Gol');
    expect(apresentacaoEnvolvido(novoEnvolvidoDinamica(1))).toBe('');
  });

  it('prompt inclui dados do envolvido, local e o modelo de apresentação', () => {
    const s = { ...estadoInicialDinamica(), envolvidos: [{ ...env, relato: 'Freou tarde.' }, novoEnvolvidoDinamica(2)] };
    const p = buildDinamicaPrompt(s, { rodovia: 'SC-401', km: '12,5' });
    expect(p).toContain('Envolvido 1 (condutor João, veículo VW Gol, cor prata, placa ABC1D23)');
    expect(p).toContain('Local da ocorrência: SC-401, km 12,5.');
    expect(p).toContain('deslocava com seu veículo <marca/modelo> de cor <cor>, placa <placa>');
  });

  it('migra o campo antigo "identificacao" para o nome', () => {
    const r = normalizarEstadoDinamica({ envolvidos: [{ id: 1, identificacao: 'Maria', relato: 'x' }] });
    expect(r.envolvidos[0]).toMatchObject({ nome: 'Maria', placa: '', relato: 'x' });
  });
});
