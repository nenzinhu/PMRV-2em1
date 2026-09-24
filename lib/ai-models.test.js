import { describe, expect, it } from 'vitest';
import {
  PMRV_PROVEDORES_IA,
  PMRV_GROQ_MODEL,
  PMRV_OPENROUTER_MODEL,
  filtrarModelosGratis,
  nomesEnv,
  modeloValido,
  obterProvedor,
} from './ai-models';

describe('registro de provedores', () => {
  it('cada provedor tem id único, chat HTTPS, env e padrão presente no fallback', () => {
    const ids = PMRV_PROVEDORES_IA.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PMRV_PROVEDORES_IA) {
      expect(p.chatUrl).toMatch(/^https:\/\/.+\/chat\/completions$/);
      nomesEnv(p).forEach((n) => expect(n).toMatch(/^[A-Za-z_][A-Za-z0-9_-]*$/));
      expect(p.fallback.map((m) => m.id)).toContain(p.padrao);
      p.fallback.forEach((m) => expect(modeloValido(m.id)).toBe(true));
    }
  });

  it('não inclui Gemini', () => {
    expect(PMRV_PROVEDORES_IA.some((p) => /gemini|google/i.test(p.id + p.chatUrl))).toBe(false);
  });

  it('provedor desconhecido cai no Groq', () => {
    expect(obterProvedor('xyz').id).toBe('groq');
  });
});

describe('filtrarModelosGratis', () => {
  it('OpenRouter: só gratuitos de texto, padrão primeiro', () => {
    const bruto = {
      data: [
        { id: 'x/pago', name: 'Pago', pricing: { prompt: '0.001', completion: '0.002' } },
        { id: 'a/modelo:free', name: 'A Free', pricing: { prompt: '0', completion: '0' } },
        { id: PMRV_OPENROUTER_MODEL, name: 'GLM', pricing: { prompt: '0', completion: '0' } },
        { id: 'img/gen:free', name: 'Imagem', architecture: { output_modalities: ['image'] } },
      ],
    };
    const ids = filtrarModelosGratis('openrouter', bruto).map((m) => m.id);
    expect(ids).toEqual([PMRV_OPENROUTER_MODEL, 'a/modelo:free']);
  });

  it('Groq: exclui áudio, guard e inativos', () => {
    const bruto = {
      data: [
        { id: 'whisper-large-v3' },
        { id: 'openai/gpt-oss-safeguard-20b' },
        { id: 'qwen/qwen3.8-27b' },
        { id: 'velho', active: false },
        { id: 'groq/compound-mini' },
        { id: PMRV_GROQ_MODEL },
      ],
    };
    expect(filtrarModelosGratis('groq', bruto).map((m) => m.id)).toEqual([PMRV_GROQ_MODEL, 'qwen/qwen3.8-27b']);
  });

  it('Mistral: só modelos de chat', () => {
    const bruto = {
      data: [
        { id: 'mistral-small-latest', capabilities: { completion_chat: true } },
        { id: 'mistral-embed', capabilities: { completion_chat: false } },
        { id: 'mistral-ocr-latest', capabilities: { completion_chat: true } },
      ],
    };
    expect(filtrarModelosGratis('mistral', bruto).map((m) => m.id)).toEqual(['mistral-small-latest']);
  });

  it('Cloudflare e Cohere: lêem result[].name e models[].name', () => {
    expect(filtrarModelosGratis('cloudflare', { result: [{ name: '@cf/meta/llama-3.1-8b-instruct' }] })).toHaveLength(1);
    expect(filtrarModelosGratis('cohere', { models: [{ name: 'command-r-08-2024' }, { name: 'embed-v4.0' }] })).toHaveLength(1);
  });

  it('resposta inválida ou provedor sem listagem vira lista vazia', () => {
    expect(filtrarModelosGratis('groq', null)).toEqual([]);
    expect(filtrarModelosGratis('zai', { data: [{ id: 'x' }] })).toEqual([]);
  });
});

describe('modeloValido', () => {
  it('aceita IDs de modelo (inclusive @cf/...) e rejeita lixo', () => {
    expect(modeloValido('z-ai/glm-5.2:free')).toBe(true);
    expect(modeloValido('@cf/meta/llama-3.3-70b-instruct-fp8-fast')).toBe(true);
    expect(modeloValido('a b')).toBe(false);
    expect(modeloValido(null)).toBe(false);
  });
});
