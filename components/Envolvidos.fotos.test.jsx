import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Envolvidos from './Envolvidos';
const salvar = vi.hoisted(() => vi.fn());
const atualizar = vi.hoisted(() => vi.fn());
vi.mock('@/lib/foto-store', async original => ({ ...(await original()), salvarFotoBlob: salvar }));
vi.mock('./OcorrenciaProvider', () => ({ useOcorrencia: () => ({ pronto: true, atualizar,
  doc: { id: 'foto', envolvidos: [{ id: 1, nome: '', relato: '', fotos: [] }] },
}) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('preserva a edição do nome enquanto salva fotos da galeria', async () => {
  let terminar;
  salvar.mockImplementation(() => new Promise(resolve => { terminar = resolve; }));
  URL.createObjectURL = vi.fn(() => 'blob:foto');
  render(<Envolvidos />);
  await screen.findByPlaceholderText('Digite a placa');
  const nome = screen.getByText('Nome Completo').parentElement.querySelector('input');
  fireEvent.change(document.getElementById('gal_1'), { target: { files: [new File(['foto'], 'foto.png', { type: 'image/png' })] } });
  fireEvent.change(nome, { target: { value: 'Maria' } });
  await act(async () => terminar());
  await waitFor(() => expect(screen.getByAltText('Foto 1')).toBeTruthy());
  expect(nome.value).toBe('Maria');
});
