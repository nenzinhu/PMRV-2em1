import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppShell from './AppShell';

// Isola a hidratação de fotos (IndexedDB de blobs não faz parte do escopo
// deste teste de componente — a lib tem testes próprios).
vi.mock('@/lib/foto-store', () => {
  const fotos = (f) => (Array.isArray(f) ? f.map((x) => ({ ...x, src: 'blob:test' })) : []);
  const hidratar = (lista) => Promise.resolve((lista || []).map((ev) => ({ ...ev, fotos: fotos(ev.fotos) })));
  return {
    fotosParaStorage: (f) => (Array.isArray(f) ? f.filter((x) => x && x.id) : []),
    envolvidosParaStorage: (l) => (l || []).map((ev) => ({ ...ev, fotos: fotos(ev.fotos) })),
    novoFotoId: () => 'f-test',
    precisaMigrarFotos: () => false,
    migrarFotosLegadas: hidratar,
    hidratarFotos: hidratar,
    salvarFotoBlob: () => Promise.resolve(),
    lerFotoBlob: () => Promise.resolve(null),
    apagarFoto: () => Promise.resolve(),
  };
});

// Rede: nada de fetch real nos testes de componente.
vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline de teste'))));

beforeEach(async () => {
  localStorage.clear();
  const req = indexedDB.deleteDatabase('pmrv-ocorrencias');
  await new Promise((resolve) => {
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
  window.confirm = vi.fn(() => true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function rascunhoLegado() {
  localStorage.setItem(
    'PMRV_RELATO_RASCUNHO',
    JSON.stringify({ form: { sade: '123456', dataFato: '2026-09-20', km: '12,5' }, step: 2 })
  );
  localStorage.setItem('PMRV_ENVOLVIDOS', JSON.stringify({ lista: [{ id: 1, nome: 'João da Silva', placa: 'ABC1D23' }], seq: 1 }));
}

describe('AppShell — migração legada, botão Nova e toasts', () => {
  it('migra rascunhos legados para o documento único no boot', async () => {
    rascunhoLegado();
    render(<AppShell initialAba="salvar" />);

    // A aba Salvar mostra o dossiê construído a partir do legado migrado.
    await waitFor(() => {
      expect(screen.getByLabelText('Dossiê completo da ocorrência').value).toContain('123456');
    });
    // Envolvido migrado aparece no dossiê (bloco de envolvidos do montarDossie).
    await waitFor(() => {
      expect(screen.getByLabelText('Dossiê completo da ocorrência').value).toContain('João da Silva');
    });
    // Rodapé de versão presente (rastreabilidade).
    expect(screen.getByLabelText('Dossiê completo da ocorrência').value).toContain('modelo de ocorrência v2');
  });

  it('botão Nova dispara toast de sucesso (bug B1) e arquiva a ocorrência atual', async () => {
    rascunhoLegado();
    render(<AppShell initialAba="salvar" />);
    await screen.findByLabelText('Dossiê completo da ocorrência');

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar nova ocorrência' }));

    await waitFor(() => {
      expect(screen.getByText('Nova ocorrência iniciada')).toBeTruthy();
    });

    // A ocorrência arquivada contém os dados migrados (nada se perde).
    await waitFor(async () => {
      const { listarHistoricoIDB } = await import('@/lib/idb');
      const lista = await listarHistoricoIDB(indexedDB);
      expect(lista).toHaveLength(1);
      expect(lista[0].relato.form.sade).toBe('123456');
    });

    // Dossiê da ocorrência nova não contém mais os dados da anterior.
    await waitFor(() => {
      const texto = screen.getByLabelText('Dossiê completo da ocorrência').value;
      expect(texto).not.toContain('123456');
      expect(texto).not.toContain('João da Silva');
    });
  });
});
