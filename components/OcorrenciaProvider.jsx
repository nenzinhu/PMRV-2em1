'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { migrarLegado, normalizarOcorrencia, novaOcorrencia, OCORRENCIA_VERSION } from '@/lib/ocorrencia';
import { gravarOcorrenciaIDB, lerOcorrenciaIDB, OCORRENCIA_ID } from '@/lib/idb';
import { parseRelatoDraft } from '@/lib/relato-draft';
import { parseDanos } from '@/lib/danos';

const OcorrenciaContext = createContext(null);

// Cópia localStorage do documento: mantém o debug fácil (DevTools →
// Application) e dá fonte síncrona para partes que ainda leem direto.
export const OCORRENCIA_LS_KEY = 'PMRV_OCORRENCIA';

export function OcorrenciaProvider({ children }) {
  const [doc, setDoc] = useState(null); // null = carregando
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let base = await lerOcorrenciaIDB(typeof indexedDB !== 'undefined' ? indexedDB : null);
      if (!base && typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(OCORRENCIA_LS_KEY);
          if (raw) base = JSON.parse(raw);
        } catch {
          /* cópia corrompida: segue para legado */
        }
      }
      if (!base) {
        base = migrarLegado(
          typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null },
          parseRelatoDraft,
          parseDanos
        );
      }
      const inicial = normalizarOcorrencia(base || novaOcorrencia());
      if (!cancelled) setDoc(inicial);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const atualizar = useCallback((updater) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const bruto = typeof updater === 'function' ? updater(prev) : updater;
      const proximo = { ...normalizarOcorrencia({ ...prev, ...bruto }), atualizadoEm: new Date().toISOString() };
      return proximo;
    });
  }, []);

  // Autosave: IDB é a fonte da verdade; localStorage é a cópia de inspeção.
  useEffect(() => {
    if (!doc) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      gravarOcorrenciaIDB(typeof indexedDB !== 'undefined' ? indexedDB : null, doc, OCORRENCIA_ID).catch(() => {});
      try {
        localStorage.setItem(OCORRENCIA_LS_KEY, JSON.stringify(doc));
      } catch {
        /* cota cheia: IDB segue como fonte */
      }
      window.dispatchEvent(new CustomEvent('pmrv-ocorrencia-changed'));
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [doc]);

  const novaOcorrenciaAtual = useCallback(() => {
    const proxima = normalizarOcorrencia(novaOcorrencia());
    proxima.version = OCORRENCIA_VERSION;
    setDoc(proxima);
    return proxima;
  }, []);

  return <OcorrenciaContext.Provider value={{ doc, pronto: Boolean(doc), atualizar, novaOcorrencia: novaOcorrenciaAtual }}>{children}</OcorrenciaContext.Provider>;
}

export function useOcorrencia() {
  const ctx = useContext(OcorrenciaContext);
  if (!ctx) throw new Error('useOcorrencia fora do OcorrenciaProvider');
  return ctx;
}
