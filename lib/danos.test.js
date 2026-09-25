import { describe, expect, it } from 'vitest';
import {
  DANOS_MAX_FOTOS,
  SEM_IMAGEM,
  buildDanosPrompt,
  descreverVeiculo,
  dimensoesAlvo,
  parseDanos,
  respostaSemImagem,
  serializeDanos,
} from './danos';

describe('estado da aba Danos', () => {
  it('serializa só ids das fotos e volta igual', () => {
    const raw = serializeDanos({
      fotos: [{ id: 'a', src: 'blob:x' }, { src: 'sem-id' }],
      envolvidoId: '2',
      observacao: 'obs',
      descricao: 'desc',
    });
    expect(parseDanos(raw)).toEqual({ fotos: [{ id: 'a' }], envolvidoId: '2', observacao: 'obs', descricao: 'desc' });
  });

  it('JSON inválido ou excesso de fotos não quebra', () => {
    expect(parseDanos('{x').fotos).toEqual([]);
    const muitas = JSON.stringify({ fotos: Array.from({ length: 10 }, (_, i) => ({ id: `f${i}` })) });
    expect(parseDanos(muitas).fotos).toHaveLength(DANOS_MAX_FOTOS);
  });
});

describe('descreverVeiculo', () => {
  it('usa só o que foi preenchido', () => {
    expect(descreverVeiculo({ placa: 'ABC1D23', modelo: 'Gol', cor: 'Branco', nome: 'João' })).toBe(
      'Placa ABC1D23 · Gol · Branco (João)'
    );
    expect(descreverVeiculo({ nome: 'Maria' })).toBe('Maria');
    expect(descreverVeiculo({})).toBe('');
    expect(descreverVeiculo(null)).toBe('');
  });
});

describe('buildDanosPrompt', () => {
  it('inclui quantidade, veículo, observação e o marcador de segurança', () => {
    const p = buildDanosPrompt({ quantidade: 3, veiculo: 'Placa ABC1D23', observacao: 'dianteira' });
    expect(p).toContain('as 3 fotos anexadas');
    expect(p).toContain('Placa ABC1D23');
    expect(p).toContain('dianteira');
    expect(p).toContain('Não invente danos');
    expect(p).toContain(SEM_IMAGEM);
  });

  it('sem contexto não cria linhas vazias de veículo/observação', () => {
    const p = buildDanosPrompt({ quantidade: 1 });
    expect(p).toContain('a foto anexada');
    expect(p).not.toContain('Veículo informado');
    expect(p).not.toContain('Observação do policial');
  });
});

describe('respostaSemImagem', () => {
  it('detecta o marcador', () => {
    expect(respostaSemImagem(' sem_imagem ')).toBe(true);
    expect(respostaSemImagem('Veículo apresenta amassamento no para-choque.')).toBe(false);
  });
});

describe('dimensoesAlvo', () => {
  it('reduz mantendo proporção e nunca amplia', () => {
    expect(dimensoesAlvo(4000, 3000, 1280)).toEqual({ largura: 1280, altura: 960 });
    expect(dimensoesAlvo(3000, 4000, 1280)).toEqual({ largura: 960, altura: 1280 });
    expect(dimensoesAlvo(800, 600, 1280)).toEqual({ largura: 800, altura: 600 });
    expect(dimensoesAlvo(0, 600)).toEqual({ largura: 0, altura: 0 });
  });
});
