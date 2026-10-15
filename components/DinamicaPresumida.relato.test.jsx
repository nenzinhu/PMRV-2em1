import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DinamicaPresumida from './DinamicaPresumida';
import { DINAMICA_PRESUMIDA_KEY, estadoInicialDinamica } from '@/lib/dinamica-presumida';

const callGroq = vi.hoisted(() => vi.fn());

vi.mock('@/lib/pmrv', async (importOriginal) => ({
  ...(await importOriginal()),
  callGroq,
  obterChaveIA: () => '',
}));

beforeEach(() => {
  callGroq.mockReset();
  localStorage.clear();
  const estado = estadoInicialDinamica();
  estado.envolvidos[0].relato = 'eu freio e bateu';
  localStorage.setItem(DINAMICA_PRESUMIDA_KEY, JSON.stringify(estado));
});

afterEach(() => {
  cleanup();
});

describe('Ocorrência — revisão dos relatos individuais', () => {
  it('oferece as duas ações com descrição direta em cada relato', async () => {
    render(<DinamicaPresumida />);

    expect((await screen.findAllByRole('button', { name: 'Corrigir ortografia' })).length).toBe(2);
    expect(screen.getAllByRole('button', { name: 'Melhorar relato' }).length).toBe(2);
    expect(
      screen.getAllByText('Ortografia corrige a escrita. Melhorar deixa o texto claro e objetivo sem alterar os fatos.').length
    ).toBe(2);
  });

  it('envia instruções diferentes para ortografia e melhoria', async () => {
    callGroq.mockResolvedValue({ text: 'Texto revisado.' });
    render(<DinamicaPresumida />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Corrigir ortografia' }))[0]);
    await waitFor(() => expect(callGroq).toHaveBeenCalledTimes(1));
    expect(callGroq.mock.calls[0][0].prompt).toContain('Corrija somente ortografia');
    expect(callGroq.mock.calls[0][0].prompt).toContain('não reescreva');

    fireEvent.change(document.getElementById('dp-relato-1'), { target: { value: 'novo relato para melhorar' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Melhorar relato' })[0]);
    await waitFor(() => expect(callGroq).toHaveBeenCalledTimes(2));
    expect(callGroq.mock.calls[1][0].prompt).toContain('claro, direto e objetivo');
    expect(callGroq.mock.calls[1][0].prompt).toContain('Não invente');
  });

  it('preserva edição feita enquanto a IA responde', async () => {
    let responder;
    callGroq.mockImplementation(
      () =>
        new Promise((resolve) => {
          responder = resolve;
        })
    );
    render(<DinamicaPresumida />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Melhorar relato' }))[0]);
    expect(screen.getAllByRole('status')[0].textContent).toBe('Melhorando…');
    const campo = document.getElementById('dp-relato-1');
    fireEvent.change(campo, { target: { value: 'Texto atualizado durante a espera.' } });
    responder({ text: 'Resposta baseada no texto antigo.' });

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Melhorar relato' })[0].disabled).toBe(false));
    expect(campo.value).toBe('Texto atualizado durante a espera.');
  });
});
