import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { OcorrenciaProvider, useOcorrencia } from './OcorrenciaProvider';
import { listarHistoricoIDB } from '@/lib/idb';

function apagarBanco() {
  const req = indexedDB.deleteDatabase('pmrv-ocorrencias');
  return new Promise((resolve) => {
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

// Ponte de teste para observar o contexto dentro do provider.
function Prova() {
  const { doc, pronto, atualizar, novaOcorrencia, restaurarOcorrencia } = useOcorrencia();
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

afterEach(() => cleanup());

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
