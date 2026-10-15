import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Envolvidos from './Envolvidos';

const atualizarDoc = vi.hoisted(() => vi.fn());
const callGroq = vi.hoisted(() => vi.fn());

vi.mock('@/components/OcorrenciaProvider', () => ({
  useOcorrencia: () => ({
    pronto: true,
    atualizar: atualizarDoc,
    doc: {
      id: 'ocorrencia-relato',
      envolvidos: [
        {
          id: 1,
          nome: 'João da Silva',
          cpf: '',
          uf: '',
          cidade: '',
          endereco: '',
          numero: '',
          complemento: '',
          bairro: '',
          telefone: '',
          placa: '',
          placa_estrangeira: false,
          modelo: '',
          cor: '',
          relato: 'eu freio e bateu',
          fotos: [],
        },
      ],
    },
  }),
}));

vi.mock('@/lib/pmrv', async (importOriginal) => ({
  ...(await importOriginal()),
  callGroq,
  obterChaveIA: () => '',
}));

beforeEach(() => {
  atualizarDoc.mockClear();
  callGroq.mockReset();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('Envolvidos — tratamento do relato individual', () => {
  it('mostra duas ações com uma descrição curta e direta', async () => {
    render(<Envolvidos />);

    expect(await screen.findByRole('button', { name: 'Corrigir ortografia' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Melhorar relato' })).toBeTruthy();
    expect(
      screen.getByText('Ortografia corrige a escrita. Melhorar deixa o texto claro e objetivo sem alterar os fatos.')
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Corrigir com IA' })).toBeNull();
  });

  it('corrige somente a escrita quando a opção de ortografia é escolhida', async () => {
    callGroq.mockResolvedValue({ text: 'Eu freiei e ocorreu a colisão.' });
    render(<Envolvidos />);

    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir ortografia' }));

    await waitFor(() => expect(callGroq).toHaveBeenCalledTimes(1));
    const prompt = callGroq.mock.calls[0][0].prompt;
    expect(prompt).toContain('Corrija somente ortografia');
    expect(prompt).toContain('não reescreva');
    expect(prompt).toContain('eu freio e bateu');
  });

  it('melhora clareza e objetividade sem inventar fatos', async () => {
    callGroq.mockResolvedValue({ text: 'O envolvido informou que freou e ocorreu a colisão.' });
    render(<Envolvidos />);

    fireEvent.click(await screen.findByRole('button', { name: 'Melhorar relato' }));

    await waitFor(() => expect(callGroq).toHaveBeenCalledTimes(1));
    const prompt = callGroq.mock.calls[0][0].prompt;
    expect(prompt).toContain('claro, direto e objetivo');
    expect(prompt).toContain('Não invente');
    expect(prompt).toContain('eu freio e bateu');
  });

  it('não sobrescreve uma edição feita enquanto a IA responde', async () => {
    let responder;
    callGroq.mockImplementation(
      () =>
        new Promise((resolve) => {
          responder = resolve;
        })
    );
    render(<Envolvidos />);

    fireEvent.click(await screen.findByRole('button', { name: 'Melhorar relato' }));
    expect(screen.getByRole('status').textContent).toBe('Melhorando…');
    const campo = screen.getByPlaceholderText(/Descreva o que aconteceu/i);
    fireEvent.change(campo, { target: { value: 'Texto atualizado durante a espera.' } });
    responder({ text: 'Resposta baseada no texto antigo.' });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Melhorar relato' }).disabled).toBe(false));
    expect(campo.value).toBe('Texto atualizado durante a espera.');
  });
});
