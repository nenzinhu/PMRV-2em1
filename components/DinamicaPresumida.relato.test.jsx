import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import DinamicaPresumida from './DinamicaPresumida';
import { novaOcorrencia } from '@/lib/ocorrencia';
const shared = vi.hoisted(() => ({
  initial: null,
  current: null,
  call: vi.fn(),
}));
vi.mock('@/lib/pmrv', async (original) => ({
  ...(await original()),
  callGroq: shared.call,
  obterChaveIA: () => '',
}));
vi.mock('@/components/OcorrenciaProvider', async () => {
  const { useState, useCallback } = await import('react');
  return {
    useOcorrencia: () => {
      const [doc, setDoc] = useState(shared.initial);
      shared.current = doc;
      return {
        doc,
        pronto: true,
        atualizar: useCallback((f) => setDoc((d) => f(d)), []),
      };
    },
  };
});
beforeEach(() => {
  localStorage.clear();
  shared.call.mockReset();
  shared.initial = {
    ...novaOcorrencia('teste'),
    envolvidos: [
      { id: 1, nome: 'Ana', relato: 'Eu parei na faixa.' },
      { id: 2, nome: 'Bruno', relato: '' },
    ],
  };
});
afterEach(cleanup);
const resposta = {
  text: JSON.stringify({
    dinamica: 'Segundo Ana, o veículo parou na faixa.',
    relatos: [{ envolvido: 2, texto: 'Texto inventado' }],
    analise: {
      lacunas: ['Bruno ainda não foi ouvido.'],
      perguntas: [
        { envolvido: 2, perguntas: ['O que você percebeu antes do impacto?'] },
      ],
    },
  }),
};
describe('Dinâmica com fontes únicas', () => {
  it('edita o mesmo cadastro e oferece somente os três estilos', () => {
    render(<DinamicaPresumida />);
    expect(
      within(
        screen.getByRole('group', { name: 'Como você quer o texto?' }),
      ).getAllByRole('radio'),
    ).toHaveLength(3);
    fireEvent.change(
      screen.getByLabelText('O que esta pessoa relatou?', {
        selector: '#dp-relato-2',
      }),
      { target: { value: 'Vi a frenagem.' } },
    );
    expect(shared.current.envolvidos[1].relato).toBe('Vi a frenagem.');
    expect(screen.getByText('Consultar o primeiro relato')).toBeTruthy();
  });
  it('gera análise e perguntas sem preencher relato ausente nem transferir automaticamente', async () => {
    shared.call.mockResolvedValue(resposta);
    render(<DinamicaPresumida />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Analisar relatos e gerar dinâmica' }),
    );
    await screen.findByText('Bruno ainda não foi ouvido.');
    expect(
      screen.getByText('O que você percebeu antes do impacto?'),
    ).toBeTruthy();
    expect(shared.current.envolvidos[1].relato).toBe('');
    expect(shared.current.relato.form.dinamica).toBeUndefined();
    fireEvent.click(
      screen.getByRole('button', { name: 'Transferir para o Relato Policial' }),
    );
    expect(shared.current.relato.form.dinamica).toContain('Segundo Ana');
  });
  it('descarta resposta antiga quando um relato é editado durante a espera', async () => {
    let resolver;
    shared.call.mockImplementation(
      () =>
        new Promise((r) => {
          resolver = r;
        }),
    );
    render(<DinamicaPresumida />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Analisar relatos e gerar dinâmica' }),
    );
    fireEvent.change(document.getElementById('dp-relato-1'), {
      target: { value: 'Relato atualizado.' },
    });
    resolver(resposta);
    await screen.findByRole('alert');
    expect(shared.current.dinamica.dinamica).toBe('');
    expect(shared.current.envolvidos[0].relato).toBe('Relato atualizado.');
  });
  it('impede transferência de análise desatualizada e preserva dados em falha da IA', async () => {
    shared.call.mockResolvedValueOnce(resposta);
    render(<DinamicaPresumida />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Analisar relatos e gerar dinâmica' }),
    );
    await screen.findByText('Bruno ainda não foi ouvido.');
    fireEvent.change(document.getElementById('dp-relato-2'), {
      target: { value: 'Não vi a faixa.' },
    });
    expect(
      screen.getByRole('button', { name: 'Transferir para o Relato Policial' })
        .disabled,
    ).toBe(true);
    shared.call.mockResolvedValueOnce({ error: 'quota' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Analisar relatos e gerar dinâmica' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Cota'),
    );
    expect(shared.current.envolvidos[1].relato).toBe('Não vi a faixa.');
  });
});
