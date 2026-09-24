import { describe, expect, it } from 'vitest';
import { filtrarModelosGratis, modeloValido, PMRV_GROQ_MODEL, PMRV_OPENROUTER_MODEL } from './ai-models';

describe('filtrarModelosGratis — OpenRouter', () => {
  const bruto = {
    data: [
      { id: 'x/pago', name: 'Pago', pricing: { prompt: '0.001', completion: '0.002' } },
      { id: 'a/modelo:free', name: 'A Free', pricing: { prompt: '0', completion: '0' } },
      { id: PMRV_OPENROUTER_MODEL, name: 'GLM', pricing: { prompt: '0', completion: '0' } },
      { id: 'img/gen:free', name: 'Imagem', architecture: { output_modalities: ['image'] } },
      { id: 'openrouter/free', name: 'Free Router', pricing: { prompt: '0', completion: '0' } },
    ],
  };

  it('mantém só gratuitos de texto, com o padrão primeiro', () => {
    const ids = filtrarModelosGratis('openrouter', bruto).map((m) => m.id);
    expect(ids[0]).toBe(PMRV_OPENROUTER_MODEL);
    expect(ids).toContain('a/modelo:free');
    expect(ids).toContain('openrouter/free');
    expect(ids).not.toContain('x/pago');
    expect(ids).not.toContain('img/gen:free');
  });
});

describe('filtrarModelosGratis — Groq', () => {
  it('exclui áudio, guard e inativos', () => {
    const bruto = {
      data: [
        { id: 'whisper-large-v3' },
        { id: 'openai/gpt-oss-safeguard-20b' },
        { id: 'qwen/qwen3.8-27b' },
        { id: 'velho', active: false },
        { id: PMRV_GROQ_MODEL },
      ],
    };
    expect(filtrarModelosGratis('groq', bruto).map((m) => m.id)).toEqual([PMRV_GROQ_MODEL, 'qwen/qwen3.8-27b']);
  });

  it('resposta inválida vira lista vazia', () => {
    expect(filtrarModelosGratis('groq', null)).toEqual([]);
  });
});

describe('modeloValido', () => {
  it('aceita IDs de modelo e rejeita lixo', () => {
    expect(modeloValido('z-ai/glm-5.2:free')).toBe(true);
    expect(modeloValido('a b')).toBe(false);
    expect(modeloValido(null)).toBe(false);
  });
});
