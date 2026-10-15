import { beforeEach, describe, expect, it } from 'vitest';
import {
  PMRV_MODELOS_FALLBACK,
  PMRV_MODELOS_VISAO,
  PMRV_PROVEDORES_IA,
  aceitaImagem,
  definirModeloIA,
  modeloValido,
  nomesEnv,
  obterModeloIA,
  obterProvedor,
} from './ai-models';

const MODELOS_ESPERADOS = {
  groq: [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
  ],
  openrouter: [
    'poolside/laguna-s-2.1:free',
    'thinking-machines/inkling:free',
    'cohere/north-mini-code:free',
    'thinking-machines/inkling-small:free',
    'poolside/laguna-xs-2.1:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'liquid/lfm2.5-2.6b:free',
    'google/gemma-4-26b-a4b-it:free',
    'google/gemma-4-31b-it:free',
  ],
  cerebras: [
    'command-a-03-2025',
    'command-a-plus-05-2026',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
  ],
  cohere: ['c4ai-aya-vision-32b'],
};

beforeEach(() => localStorage.clear());

describe('registro permitido de IA', () => {
  it('expõe somente Groq, OpenRouter, Cerebras e Cohere, na ordem definida', () => {
    expect(PMRV_PROVEDORES_IA.map((p) => p.id)).toEqual([
      'groq',
      'openrouter',
      'cerebras',
      'cohere',
    ]);
  });

  it('expõe exatamente a lista fixa solicitada para cada provedor', () => {
    expect(
      Object.fromEntries(
        Object.entries(PMRV_MODELOS_FALLBACK).map(([provedor, modelos]) => [
          provedor,
          modelos.map((modelo) => modelo.id),
        ])
      )
    ).toEqual(MODELOS_ESPERADOS);
  });

  it('mantém registro consistente e sem credenciais embutidas', () => {
    for (const provedor of PMRV_PROVEDORES_IA) {
      expect(provedor.chatUrl).toMatch(/^https:\/\/.+\/chat\/completions$/);
      nomesEnv(provedor).forEach((nome) => expect(nome).toMatch(/^[A-Z][A-Z0-9_]*$/));
      expect(provedor.fallback.map((modelo) => modelo.id)).toContain(provedor.padrao);
      expect(provedor.modelos).toBeNull();
    }
  });

  it('provedor desconhecido cai no Groq', () => {
    expect(obterProvedor('xyz').id).toBe('groq');
  });
});

describe('seleção restrita de modelos', () => {
  it('ignora modelo antigo salvo e volta ao padrão permitido', () => {
    localStorage.setItem('PMRV_AI_MODEL_groq', 'modelo/antigo');
    expect(obterModeloIA('groq')).toBe('qwen/qwen3.8-27b');
  });

  it('não persiste modelo fora da lista do provedor', () => {
    definirModeloIA('groq', 'modelo/nao-permitido');
    expect(localStorage.getItem('PMRV_AI_MODEL_groq')).toBeNull();

    definirModeloIA('groq', 'openai/gpt-oss-120b');
    expect(localStorage.getItem('PMRV_AI_MODEL_groq')).toBe('openai/gpt-oss-120b');
  });

  it('todos os modelos de visão pertencem às listas fixas permitidas', () => {
    PMRV_MODELOS_VISAO.forEach((modelo) => {
      expect(MODELOS_ESPERADOS[modelo.provedor]).toContain(modelo.id);
      expect(modelo.descricao.length).toBeGreaterThan(10);
      expect(aceitaImagem(obterProvedor(modelo.provedor), modelo.id)).toBe(true);
    });
    expect(aceitaImagem(obterProvedor('cerebras'), 'qwen/qwen3.8-27b')).toBe(false);
  });

  it('continua validando a sintaxe segura dos identificadores', () => {
    expect(modeloValido('poolside/laguna-s-2.1:free')).toBe(true);
    expect(modeloValido('a b')).toBe(false);
    expect(modeloValido(null)).toBe(false);
  });
});
