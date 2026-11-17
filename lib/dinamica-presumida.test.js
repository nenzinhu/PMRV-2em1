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
  it('não cria depoimentos ausentes e pede perguntas neutras', () => {
    const p = buildDinamicaPrompt(estado(['Relata que freou.', '', 'Relata que parou.']));
    expect(p).toContain('Nunca preencha relatos em branco');
    expect(p).toContain('perguntas abertas e neutras');
    expect(p).toContain('Envolvido 2: [NÃO OUVIDO — RELATO NÃO INFORMADO]');
    expect(p).toContain('Envolvido 3: "Relata que parou."');
    expect(p).toContain('sem lhe dar prioridade');
  });

  it('com "apenas 1" ignora os demais e não presume relatos', () => {
    const p = buildDinamicaPrompt(estado(['Perdeu o controle na curva.', ''], { apenasUm: true }));
    expect(p).toContain('Perdeu o controle na curva.');
    expect(p).not.toContain('Envolvido 2');
    expect(p).toContain('não há versões suficientes');
  });

  it('aplica o estilo escolhido e o padrão para estilo inválido', () => {
    expect(buildDinamicaPrompt(estado(['x'], { estilo: 'narrativo' }))).toContain('FORMAL SIMPLES');
    expect(buildDinamicaPrompt(estado(['x'], { estilo: '???' }))).toContain('FORMAL SIMPLES:');
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

  it('ignora depoimentos gerados e preserva todos os relatos originais', () => {
    const r = aplicarRespostaDinamica(estado(['Relata que freou tarde.', '']), `Aqui está:\n${resposta}`);
    expect(r.envolvidos[0]).toMatchObject({ relato: 'Relata que freou tarde.', presumido: false });
    expect(r.envolvidos[1]).toMatchObject({ relato: '', presumido: false });
    expect(r.dinamica).toBe('Presume-se que V1 colidiu na traseira de V2.');
  });

  it('preserva hipótese antiga sem tratá-la como declaração', () => {
    const s = estado(['A', 'versão antiga']);
    s.envolvidos[1].presumido = true;
    expect(aplicarRespostaDinamica(s, resposta).envolvidos[1].relato).toBe('versão antiga');
    expect(buildDinamicaPrompt(s)).not.toContain('versão antiga');
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
    expect(normalizarEstadoDinamica(s)).toEqual({ ...s, estilo: 'formal' });
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
    expect(p).toContain('Local informado: SC-401, km 12,5');
    expect(p).toContain('atribuindo cada informação à sua fonte');
  });

  it('migra o campo antigo "identificacao" para o nome', () => {
    const r = normalizarEstadoDinamica({ envolvidos: [{ id: 1, identificacao: 'Maria', relato: 'x' }] });
    expect(r.envolvidos[0]).toMatchObject({ nome: 'Maria', placa: '', relato: 'x' });
  });
});
