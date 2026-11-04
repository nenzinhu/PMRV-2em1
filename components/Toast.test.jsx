import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import Toast, { showToast } from './Toast';

afterEach(() => cleanup());

function emitir(...args) {
  act(() => {
    showToast(...args);
  });
}

describe('Toast — anuncio para leitores de tela', () => {
  it('envolve os avisos em uma regiao viva', () => {
    render(<Toast />);
    emitir('Ocorrencia salva', 'success');

    const regiao = screen.getByRole('status');
    expect(regiao.getAttribute('aria-live')).toBe('polite');
    expect(regiao.textContent).toContain('Ocorrencia salva');
  });

  it('erro entra como alert para ser interrompido', () => {
    render(<Toast />);
    emitir('Placa invalida', 'error');

    const alerta = screen.getByRole('alert');
    expect(alerta.textContent).toContain('Placa invalida');
  });
});
