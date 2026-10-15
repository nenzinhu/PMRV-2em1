import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ResumoDinamica from './ResumoDinamica';

const atualizarDoc = vi.hoisted(() => vi.fn());

vi.mock('@/components/OcorrenciaProvider', () => ({
  useOcorrencia: () => ({ pronto: true, atualizar: atualizarDoc }),
}));

let onSetDinamica;
let onNavigate;

beforeEach(() => {
  atualizarDoc.mockClear();
  localStorage.clear();
  localStorage.setItem(
    'PMRV_RESUMO_DINAMICA',
    JSON.stringify({
      relatos: [{ id: 1, texto: 'O veículo seguia pela rodovia.' }],
      resumo: '',
      resumos: { narrativo: '', tecnico_policial: '' },
      estiloResumo: 'tecnico_policial',
    })
  );
  onSetDinamica = vi.fn();
  onNavigate = vi.fn();
  window.addEventListener('set-dinamica', onSetDinamica);
  window.addEventListener('navigate-to', onNavigate);
});

afterEach(() => {
  window.removeEventListener('set-dinamica', onSetDinamica);
  window.removeEventListener('navigate-to', onNavigate);
  cleanup();
});

describe('ResumoDinamica — transferência de relato individual', () => {
  it('persiste o texto no Relato Policial sem sair da aba de resumo', async () => {
    render(<ResumoDinamica />);

    fireEvent.click(await screen.findByRole('button', { name: /transferir p\/ relato policial/i }));

    expect(atualizarDoc).toHaveBeenCalledOnce();
    const aplicar = atualizarDoc.mock.calls[0][0];
    const anterior = {
      id: 'ocorrencia-1',
      relato: {
        form: { rodovia: 'SC-401', dinamica: 'Texto anterior' },
        step: 4,
        manualEdit: false,
        manualText: '',
      },
    };
    expect(aplicar(anterior)).toEqual({
      ...anterior,
      relato: {
        ...anterior.relato,
        form: {
          ...anterior.relato.form,
          dinamica: 'O veículo seguia pela rodovia.',
        },
      },
    });
    expect(onSetDinamica).toHaveBeenCalledOnce();
    expect(onSetDinamica.mock.calls[0][0].detail).toBe('O veículo seguia pela rodovia.');
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
