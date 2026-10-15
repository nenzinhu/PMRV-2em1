import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import AIProviderPicker from './AIProviderPicker';
import ModeloFotoPicker from './ModeloFotoPicker';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const body = String(url).includes('?provider=')
        ? { models: [{ id: 'modelo/intruso', label: 'Modelo intruso' }] }
        : { providers: { groq: true, openrouter: true, cerebras: true, cohere: true } };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('seletores de modelos permitidos', () => {
  it('seletor geral mostra somente as 18 opções fixas dos quatro provedores', async () => {
    localStorage.setItem('PMRV_AI_MODEL_groq', 'modelo/antigo');
    render(<AIProviderPicker />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const seletor = screen.getByLabelText('Provedor e modelo de IA gratuito');
    const opcoes = Array.from(seletor.options);
    expect(opcoes).toHaveLength(18);
    expect(opcoes.map((opcao) => opcao.textContent)).not.toContain('Modelo intruso');
    expect(seletor.value).toBe('groq|qwen/qwen3.8-27b');
  });

  it('seletor de fotos descarta modelo antigo e não adiciona opções ao vivo', async () => {
    localStorage.setItem('PMRV_DANOS_MODELO', 'openrouter|modelo/antigo');
    render(<ModeloFotoPicker onChange={vi.fn()} />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const seletor = document.getElementById('danos-modelo');
    const valores = Array.from(seletor.options).map((opcao) => opcao.value);
    expect(valores).toHaveLength(6);
    expect(valores).not.toContain('openrouter|modelo/antigo');
    expect(valores).not.toContain('openrouter|modelo/intruso');
    expect(seletor.value).toBe('');
  });
});
