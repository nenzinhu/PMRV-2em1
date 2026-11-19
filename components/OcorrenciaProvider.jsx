'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { migrarLegado, normalizarOcorrencia, novaOcorrencia } from '@/lib/ocorrencia';
import { gravarOcorrenciaIDB, lerOcorrenciaIDB, arquivarOcorrenciaIDB, OCORRENCIA_ID } from '@/lib/idb';
import { parseRelatoDraft } from '@/lib/relato-draft';
import { parseDanos } from '@/lib/danos';

const OcorrenciaContext = createContext(null);

// Cópia localStorage do documento: mantém o debug fácil (DevTools →
// Application) e dá fonte síncrona para partes que ainda leem direto.
export const OCORRENCIA_LS_KEY = 'PMRV_OCORRENCIA';

export function OcorrenciaProvider({ children }) {
  const [doc, setDoc] = useState(null); // null = carregando
  const saveTimer = useRef(null);
  const docAtual = useRef(null);
  const trocando = useRef(false);
  const [erroArquivo, setErroArquivo] = useState('');
  const [erroSalvar, setErroSalvar] = useState('');


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
      if (!cancelled) { docAtual.current = inicial; setDoc(inicial); }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const atualizar = useCallback((updater) => {
    const prev = docAtual.current;
    if (!prev) return;
    const bruto = typeof updater === 'function' ? updater(prev) : updater;
    if (bruto === prev) return;
    const proximo = { ...normalizarOcorrencia({ ...prev, ...bruto }), atualizadoEm: new Date().toISOString() };
    docAtual.current = proximo;
    setDoc(proximo);
  }, []);

  // Autosave: IDB é a fonte da verdade; localStorage é a cópia de inspeção.
  useEffect(() => {
    if (!doc) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      let salvoIDB = false;
      let salvoLS = false;
      try {
        localStorage.setItem(OCORRENCIA_LS_KEY, JSON.stringify(doc));
        salvoLS = true;
      } catch {
        /* cota cheia: IDB segue como fonte */
      }
      try {
        salvoIDB = await gravarOcorrenciaIDB(typeof indexedDB !== 'undefined' ? indexedDB : null, doc, OCORRENCIA_ID);
      } catch { /* a cópia local já foi tentada */ }
      if (docAtual.current !== doc) return;
      setErroSalvar(salvoIDB ? '' : salvoLS ? 'Não foi possível salvar no banco do aparelho. Exporte um backup antes de sair.' : 'Não foi possível salvar a ocorrência. Exporte um backup antes de sair.');
      window.dispatchEvent(new CustomEvent('pmrv-ocorrencia-changed'));
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [doc]);

  // Só troca após confirmar o arquivo; uma edição durante a espera cancela a troca.
  const trocarOcorrencia = useCallback(async (alvo) => {
    if (trocando.current || !docAtual.current) return false;
    trocando.current = true;
    setErroArquivo('');
    const origem = docAtual.current;
    try {
      const salvo = await arquivarOcorrenciaIDB(typeof indexedDB !== 'undefined' ? indexedDB : null, origem);
      if (!salvo) throw new Error('Arquivo indisponível');
      if (docAtual.current !== origem) {
        setErroArquivo('A ocorrência mudou durante o arquivamento. Confira as alterações e tente novamente.');
        return false;
      }
      const proxima = normalizarOcorrencia(alvo);
      docAtual.current = proxima;
      setDoc(proxima);
      return true;
    } catch {
      setErroArquivo('Não foi possível arquivar. A ocorrência atual foi mantida. Exporte um backup e tente novamente.');
      return false;
    } finally {
      trocando.current = false;
    }
  }, []);
  const novaOcorrenciaAtual = useCallback(() => trocarOcorrencia(novaOcorrencia()), [trocarOcorrencia]);
  const restaurarOcorrencia = useCallback((alvo) => alvo ? trocarOcorrencia(alvo) : Promise.resolve(false), [trocarOcorrencia]);

  return <OcorrenciaContext.Provider value={{ doc, pronto: Boolean(doc), atualizar, novaOcorrencia: novaOcorrenciaAtual, restaurarOcorrencia }}>
    {(erroArquivo || erroSalvar) && <p role="alert" className="p-3 text-sm text-brick bg-surface border border-brick">{erroArquivo || erroSalvar}</p>}
    {children}
  </OcorrenciaContext.Provider>;
}

export function useOcorrencia() {
  const ctx = useContext(OcorrenciaContext);
  if (!ctx) throw new Error('useOcorrencia fora do OcorrenciaProvider');
  return ctx;
}
