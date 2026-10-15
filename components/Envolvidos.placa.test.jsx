import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Envolvidos from './Envolvidos';

const atualizarDoc = vi.hoisted(() => vi.fn());

vi.mock('@/components/OcorrenciaProvider', () => ({
  useOcorrencia: () => ({
    pronto: true,
    atualizar: atualizarDoc,
    doc: {
      id: 'ocorrencia-placa',
      envolvidos: [
        {
          id: 1,
          nome: '',
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
          relato: '',
          fotos: [],
        },
      ],
    },
  }),
}));

beforeEach(() => {
  atualizarDoc.mockClear();
  localStorage.clear();
  localStorage.setItem('PMRV_PLACA_TOKEN', 'token-legado');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ modelo: 'VW CROSSFOX', cor: 'Prata' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Envolvidos — consulta de placa', () => {
  it('preenche e exibe marca/modelo e cor sem pedir token no navegador', async () => {
    render(<Envolvidos />);

    const placa = await screen.findByPlaceholderText('Digite a placa');
    expect(screen.queryByTitle('Configurar token da API de placa')).toBeNull();
    expect(localStorage.getItem('PMRV_PLACA_TOKEN')).toBeNull();

    fireEvent.change(placa, { target: { value: 'INT8C36' } });
    fireEvent.click(screen.getByTitle('Consultar placa e preencher modelo e cor'));

    await waitFor(() => {
      expect(screen.getByLabelText('Marca/Modelo do Veículo').value).toBe('VW CROSSFOX');
      expect(screen.getByLabelText('Cor do Veículo').value).toBe('Prata');
    });
    expect(fetch).toHaveBeenCalledWith('/api/placa?placa=INT8C36');
  });

  it('preserva edições feitas enquanto a consulta está em andamento', async () => {
    let responder;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            responder = resolve;
          })
      )
    );
    render(<Envolvidos />);

    const placa = await screen.findByPlaceholderText('Digite a placa');
    const nome = screen.getByText('Nome Completo').parentElement.querySelector('input');
    fireEvent.change(placa, { target: { value: 'INT8C36' } });
    fireEvent.click(screen.getByTitle('Consultar placa e preencher modelo e cor'));
    fireEvent.change(nome, { target: { value: 'Maria da Silva' } });

    await act(async () => {
      responder(
        new Response(JSON.stringify({ modelo: 'VW CROSSFOX', cor: 'Prata' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    await waitFor(() => expect(screen.getByLabelText('Marca/Modelo do Veículo').value).toBe('VW CROSSFOX'));
    expect(nome.value).toBe('Maria Da Silva');
  });

  it('ignora a resposta se a placa mudar durante a consulta', async () => {
    let responder;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            responder = resolve;
          })
      )
    );
    render(<Envolvidos />);

    const placa = await screen.findByPlaceholderText('Digite a placa');
    fireEvent.change(placa, { target: { value: 'INT8C36' } });
    fireEvent.click(screen.getByTitle('Consultar placa e preencher modelo e cor'));
    fireEvent.change(placa, { target: { value: 'ABC1D23' } });

    await act(async () => {
      responder(
        new Response(JSON.stringify({ modelo: 'VW CROSSFOX', cor: 'Prata' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    expect(screen.getByLabelText('Marca/Modelo do Veículo').value).toBe('');
    expect(screen.getByLabelText('Cor do Veículo').value).toBe('');
  });

  it('limpa o dado antigo quando a nova consulta não o retornar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ modelo: 'FIAT ARGO', cor: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    render(<Envolvidos />);

    const placa = await screen.findByPlaceholderText('Digite a placa');
    fireEvent.change(screen.getByLabelText('Marca/Modelo do Veículo'), { target: { value: 'Modelo antigo' } });
    fireEvent.change(screen.getByLabelText('Cor do Veículo'), { target: { value: 'Azul' } });
    fireEvent.change(placa, { target: { value: 'ABC1D23' } });
    fireEvent.click(screen.getByTitle('Consultar placa e preencher modelo e cor'));

    await waitFor(() => expect(screen.getByLabelText('Marca/Modelo do Veículo').value).toBe('FIAT ARGO'));
    expect(screen.getByLabelText('Cor do Veículo').value).toBe('');
  });
});
