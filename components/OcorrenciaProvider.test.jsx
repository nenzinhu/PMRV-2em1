import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { OcorrenciaProvider, useOcorrencia } from './OcorrenciaProvider';
import { listarHistoricoIDB } from '@/lib/idb';

function apagarBanco() {
  const req = indexedDB.deleteDatabase('pmrv-ocorrencias');
  return new Promise((resolve) => {
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

// Ponte de teste para observar o contexto dentro do provider.
let contexto;
function Prova() {
  contexto = useOcorrencia();
  const { doc, pronto, atualizar, novaOcorrencia, restaurarOcorrencia } = contexto;
  return (
    <div>
      <span data-testid="pronto">{String(pronto)}</span>
      <span data-testid="sade">{doc?.relato?.form?.sade ?? ''}</span>
      <button type="button" onClick={() => atualizar({ relato: { ...doc.relato, form: { ...doc.relato.form, sade: '987' } } })}>
        editar
      </button>
      <button type="button" onClick={() => novaOcorrencia()}>nova</button>
      <button type="button" onClick={() => restaurarOcorrencia({ id: 'oc-alvo', relato: { form: { sade: 'ALVO' } } })}>
        restaurar
      </button>
    </div>
  );
}

beforeEach(async () => {
  localStorage.clear();
  await apagarBanco();
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('OcorrenciaProvider', () => {
  it('cria ocorrência nova quando não há nada salvo', async () => {
    render(
      <OcorrenciaProvider>
        <Prova />
      </OcorrenciaProvider>
    );
    await waitFor(() => expect(screen.getByTestId('pronto').textContent).toBe('true'));
    expect(screen.getByTestId('sade').textContent).toBe('');
  });

  it('migra legados (LS) quando IDB e cópia LS não existem', async () => {
    localStorage.setItem('PMRV_RELATO_RASCUNHO', JSON.stringify({ form: { sade: 'LEGADO' } }));
    render(
      <OcorrenciaProvider>
        <Prova />
      </OcorrenciaProvider>
    );
    await waitFor(() => expect(screen.getByTestId('sade').textContent).toBe('LEGADO'));
  });

  it('autosave grava no LS e arquiva a atual no botão Nova', async () => {
    render(
      <OcorrenciaProvider>
        <Prova />
      </OcorrenciaProvider>
    );
    await waitFor(() => expect(screen.getByTestId('pronto').textContent).toBe('true'));

    screen.getByText('editar').click();
    await waitFor(() => expect(screen.getByTestId('sade').textContent).toBe('987'));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('PMRV_OCORRENCIA')).relato.form.sade).toBe('987'));

    screen.getByText('nova').click();
    await waitFor(() => expect(screen.getByTestId('sade').textContent).toBe(''));
    const historico = await listarHistoricoIDB(indexedDB);
    expect(historico).toHaveLength(1);
    expect(historico[0].relato.form.sade).toBe('987');
  });

  it('restaurar troca o documento e arquiva o atual antes', async () => {
    render(
      <OcorrenciaProvider>
        <Prova />
      </OcorrenciaProvider>
    );
    await waitFor(() => expect(screen.getByTestId('pronto').textContent).toBe('true'));

    screen.getByText('restaurar').click();
    await waitFor(() => expect(screen.getByTestId('sade').textContent).toBe('ALVO'));

    // A ocorrência anterior (vazia) foi arquivada; a restaurada está no registro atual.
    const historico = await listarHistoricoIDB(indexedDB);
    expect(historico.length).toBe(1);
    expect(historico[0].id).not.toBe('oc-alvo');
    // A cópia LS acompanha após o autosave (debounce de 250 ms).
    await waitFor(() => {
      const atual = JSON.parse(localStorage.getItem('PMRV_OCORRENCIA'));
      expect(atual?.relato?.form?.sade).toBe('ALVO');
    });
  });
});

it('mantém a ocorrência e informa erro se o arquivamento falhar', async () => {
  const idb = await import('@/lib/idb');
  const spy = vi.spyOn(idb, 'arquivarOcorrenciaIDB').mockRejectedValue(new Error('Sem espaço'));
  render(<OcorrenciaProvider><Prova /></OcorrenciaProvider>);
  await waitFor(() => expect(screen.getByTestId('pronto').textContent).toBe('true'));
  screen.getByText('editar').click();
  await waitFor(() => expect(screen.getByTestId('sade').textContent).toBe('987'));
  screen.getByText('nova').click();
  await screen.findByRole('alert');
  expect(screen.getByTestId('sade').textContent).toBe('987');
  spy.mockRestore();
});

it('não perde edição enfileirada junto da conclusão do arquivo', async () => {
  const idb = await import('@/lib/idb');
  let resolver;
  const spy = vi.spyOn(idb, 'arquivarOcorrenciaIDB').mockImplementation(() => new Promise(resolve => { resolver = resolve; }));
  render(<OcorrenciaProvider><Prova /></OcorrenciaProvider>);
  await waitFor(() => expect(screen.getByTestId('pronto').textContent).toBe('true'));
  screen.getByText('nova').click();
  await act(async () => {
    contexto.atualizar(prev => ({ ...prev, relato: { ...prev.relato, form: { ...prev.relato.form, sade: '987' } } }));
    resolver(true);
  });
  expect(screen.getByTestId('sade').textContent).toBe('987');
  expect(screen.getByRole('alert').textContent).toContain('mudou');
  spy.mockRestore();
});
it('grava cópia local mesmo enquanto o IndexedDB não responde', async () => {
  const idb = await import('@/lib/idb');
  const spy = vi.spyOn(idb, 'gravarOcorrenciaIDB').mockImplementation(() => new Promise(() => {}));
  render(<OcorrenciaProvider><Prova /></OcorrenciaProvider>);
  await waitFor(() => expect(screen.getByTestId('pronto').textContent).toBe('true'));
  screen.getByText('editar').click();
  await waitFor(() => expect(JSON.parse(localStorage.getItem('PMRV_OCORRENCIA')).relato.form.sade).toBe('987'));
  spy.mockRestore();
});
