import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { OcorrenciaProvider, useOcorrencia } from './OcorrenciaProvider';
import RelatosIndividuais from './RelatosIndividuais';
import { novaOcorrencia } from '@/lib/ocorrencia';
import { gravarOcorrenciaIDB } from '@/lib/idb';

const revisar = vi.hoisted(() => vi.fn());
vi.mock('@/lib/pmrv', async original => ({ ...(await original()), callGroq: revisar }));

function Documento() {
  const { doc } = useOcorrencia();
  return <output data-testid="doc">{JSON.stringify(doc)}</output>;
}
async function abrir(envolvidos = []) {
  await gravarOcorrenciaIDB(indexedDB, { ...novaOcorrencia('teste'), envolvidos });
  render(<OcorrenciaProvider><RelatosIndividuais /><Documento /></OcorrenciaProvider>);
  await screen.findByRole('button', { name: 'Adicionar envolvido' });
}
function documento() { return JSON.parse(screen.getByTestId('doc').textContent); }
beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('limita a dez sem descartar cadastros e preserva o relato individual no documento', async () => {
  await abrir();
  const add = screen.getByRole('button', { name: 'Adicionar envolvido' });
  for (let i = 0; i < 11; i++) fireEvent.click(add);
  expect(screen.getAllByLabelText('Nome')).toHaveLength(10);
  expect(add.disabled).toBe(true);
  fireEvent.change(screen.getAllByLabelText('Nome')[0], { target: { value: 'Maria' } });
  fireEvent.change(screen.getAllByLabelText('Relato individual')[0], { target: { value: 'Eu parei.' } });
  expect(documento().envolvidos[0]).toMatchObject({ nome: 'Maria', relato: 'Eu parei.' });
  expect(documento().envolvidos[1].relato).toBe('');
});
it('permite preencher modelo e cor manualmente sem consulta', async () => {
  await abrir([{ id: 1, nome: 'Ana', cpf: '123', fotos: [], relato: '' }]);
  fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: 'Fiat Argo' } });
  fireEvent.change(screen.getByLabelText('Cor'), { target: { value: 'Azul' } });
  expect(documento().envolvidos[0]).toMatchObject({ modelo: 'Fiat Argo', cor: 'Azul', cpf: '123' });
});
it('ignora consulta tardia quando a placa muda', async () => {
  let responder;
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { responder = resolve; })));
  await abrir([{ id: 1, nome: 'Ana', placa: 'ABC1D23', fotos: [], relato: '' }]);
  fireEvent.click(screen.getByRole('button', { name: 'Buscar placa' }));
  fireEvent.change(screen.getByLabelText('Placa'), { target: { value: 'XYZ9A99' } });
  await act(async () => responder(new Response(JSON.stringify({ modelo: 'Errado', cor: 'Preto' }))));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Buscar placa' }).disabled).toBe(false));
  expect(documento().envolvidos[0].modelo).not.toBe('Errado');
});

it('mantém a edição enquanto a revisão IA está em andamento', async () => {
  let responder;
  revisar.mockImplementation(() => new Promise(resolve => { responder = resolve; }));
  await abrir([{ id: 1, nome: 'Maria', relato: 'Texto original.', fotos: [] }]);
  fireEvent.click(screen.getByRole('button', { name: 'Melhorar relato' }));
  fireEvent.change(screen.getByLabelText('Relato individual'), { target: { value: 'Texto editado.' } });
  await act(async () => responder({ text: 'Texto antigo revisado.' }));
  expect(documento().envolvidos[0].relato).toBe('Texto editado.');
});
it('mostra falha de consulta e mantém o preenchimento manual', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Consulta indisponível.' }), { status: 502 })));
  await abrir([{ id: 1, nome: 'Maria', placa: 'ABC1D23', modelo: 'Argo', cor: 'Prata', fotos: [] }]);
  fireEvent.click(screen.getByRole('button', { name: 'Buscar placa' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Consulta indisponível');
  expect(screen.getByLabelText('Modelo').value).toBe('Argo');
});
it('preserva edição manual do veículo durante consulta', async () => {
  let responder;
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { responder = resolve; })));
  await abrir([{ id: 1, nome: 'Maria', placa: 'ABC1D23', modelo: '', cor: '', fotos: [] }]);
  fireEvent.click(screen.getByRole('button', { name: 'Buscar placa' }));
  fireEvent.change(screen.getByLabelText('Cor'), { target: { value: 'Azul' } });
  await act(async () => responder(new Response(JSON.stringify({ modelo: 'Argo', cor: 'Preto' }))));
  expect(documento().envolvidos[0]).toMatchObject({ modelo: 'Argo', cor: 'Azul' });
});
it('mantém hipótese legada identificada até confirmação explícita da declaração', async () => {
  revisar.mockResolvedValue({ text: 'Hipótese revisada.' });
  await abrir([{ id: 1, nome: 'Maria', relato: 'Hipótese antiga.', presumido: true, fotos: [] }]);
  expect(screen.getByRole('button', { name: 'Copiar individual' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Salvar relato' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Melhorar relato' }));
  await waitFor(() => expect(screen.getByLabelText('Relato individual').value).toBe('Hipótese revisada.'));
  expect(documento().envolvidos[0].presumido).toBe(true);
  fireEvent.change(screen.getByLabelText('Relato individual'), { target: { value: 'Declaração conferida.' } });
  expect(documento().envolvidos[0].presumido).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar declaração registrada' }));
  expect(documento().envolvidos[0].presumido).toBe(false);
  expect(screen.getByRole('button', { name: 'Copiar individual' }).disabled).toBe(false);
});
it('preserva a cor manual quando a consulta retorna apenas modelo', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ modelo: 'Argo', cor: '' }))));
  await abrir([{ id: 1, nome: 'Maria', placa: 'ABC1D23', modelo: '', cor: 'Azul', fotos: [] }]);
  fireEvent.click(screen.getByRole('button', { name: 'Buscar placa' }));
  await waitFor(() => expect(screen.getByLabelText('Modelo').value).toBe('Argo'));
  expect(screen.getByLabelText('Cor').value).toBe('Azul');
});
