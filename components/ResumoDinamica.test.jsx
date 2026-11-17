import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ResumoDinamica from './ResumoDinamica';
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
        atualizar: useCallback((f) => setDoc(f), []),
      };
    },
  };
});
beforeEach(() => {
  shared.call.mockReset();
  shared.initial = {
    ...novaOcorrencia('teste'),
    envolvidos: [{ id: 1, nome: 'Ana', relato: 'Parei na faixa.' }],
  };
});
afterEach(cleanup);
it('usa a versão atual do cadastro uma única vez, sem editor duplicado', () => {
  shared.initial.resumo.relatos = [
    { id: 22, envolvidoId: 1, texto: 'Relato antigo' },
  ];
  render(<ResumoDinamica />);
  expect(screen.getAllByText('Parei na faixa.')).toHaveLength(1);
  expect(screen.queryByText('Relato antigo')).toBeNull();
  expect(screen.getAllByRole('radio')).toHaveLength(3);
});
it('gera sem publicar e transfere apenas após revisão', async () => {
  shared.call.mockResolvedValue({ text: 'Segundo Ana, o veículo parou.' });
  render(<ResumoDinamica />);
  fireEvent.click(screen.getByRole('button', { name: 'Gerar resumo' }));
  await screen.findByLabelText('Resumo editável');
  expect(shared.current.relato.form.dinamica).toBeUndefined();
  fireEvent.change(screen.getByLabelText('Resumo editável'), { target: { value: '' } });
  expect(screen.getByLabelText('Resumo editável')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Transferir para o Relato Policial' }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Resumo editável'), {
    target: { value: 'Texto revisado.' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Transferir para o Relato Policial' }),
  );
  expect(shared.current.relato.form.dinamica).toBe('Texto revisado.');
});
it('remove nota com opção de desfazer sem alterar a declaração', () => {
  shared.initial.resumo.relatos = [{ id: 'nota', texto: 'Nota complementar' }];
  render(<ResumoDinamica />);
  fireEvent.click(screen.getByRole('button', { name: 'Remover nota' }));
  expect(shared.current.resumo.relatos).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
  expect(shared.current.resumo.relatos[0].texto).toBe('Nota complementar');
  expect(shared.current.envolvidos[0].relato).toBe('Parei na faixa.');
});
