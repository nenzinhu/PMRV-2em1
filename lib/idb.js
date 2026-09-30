// Persistência do documento único em IndexedDB (assíncrona, sem JSON gigante
// no localStorage). Dois stores no mesmo banco:
//   'ocorrencias' → registro único 'atual' (fonte da verdade)
//   'historico'   → ocorrências arquivadas pelo botão "Nova" (keyPath 'id')
// Não depende de React; nos testes usa fake-indexeddb.

export const OCORRENCIA_DB = 'pmrv-ocorrencias';
export const OCORRENCIA_STORE = 'ocorrencias';
export const HISTORICO_STORE = 'historico';
export const OCORRENCIA_ID = 'atual';

const DB_VERSION_COM_HISTORICO = 2;

function abrirDB(indexedDB) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OCORRENCIA_DB, DB_VERSION_COM_HISTORICO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OCORRENCIA_STORE)) db.createObjectStore(OCORRENCIA_STORE);
      if (!db.objectStoreNames.contains(HISTORICO_STORE)) {
        db.createObjectStore(HISTORICO_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transacao(indexedDB, modo, storeName, fn) {
  return abrirDB(indexedDB).then(
    (db) =>
      new Promise((resolve, reject) => {
        let resultado;
        try {
          const tx = db.transaction(storeName, modo);
          const req = fn(tx.objectStore(storeName));
          if (req) req.onsuccess = () => (resultado = req.result);
          tx.oncomplete = () => {
            db.close();
            resolve(req ? resultado : undefined);
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error || new Error('Transação abortada'));
          };
        } catch (err) {
          try {
            db.close();
          } catch {
            /* já fechado */
          }
          reject(err);
        }
      })
  );
}

function executar(indexedDB, modo, storeName, fn) {
  return transacao(indexedDB, modo, storeName, fn);
}

export function lerOcorrenciaIDB(indexedDB, id = OCORRENCIA_ID) {
  if (!indexedDB) return Promise.resolve(null);
  return executar(indexedDB, 'readonly', OCORRENCIA_STORE, (store) => store.get(id)).catch(() => null);
}

export function gravarOcorrenciaIDB(indexedDB, doc, id = OCORRENCIA_ID) {
  if (!indexedDB) return Promise.resolve(false);
  return executar(indexedDB, 'readwrite', OCORRENCIA_STORE, (store) => store.put(doc, id)).then(() => true);
}

// ------------------------------------------------------------- histórico

export function arquivarOcorrenciaIDB(indexedDB, doc) {
  if (!indexedDB || !doc || !doc.id) return Promise.resolve(false);
  return executar(indexedDB, 'readwrite', HISTORICO_STORE, (store) => store.put(doc)).then(() => true);
}

export function listarHistoricoIDB(indexedDB) {
  if (!indexedDB) return Promise.resolve([]);
  return executar(indexedDB, 'readonly', HISTORICO_STORE, (store) => store.getAll()).then(
    (lista) => (Array.isArray(lista) ? lista : []),
    () => []
  );
}

export function lerOcorrenciaHistoricoIDB(indexedDB, id) {
  if (!indexedDB || !id) return Promise.resolve(null);
  return executar(indexedDB, 'readonly', HISTORICO_STORE, (store) => store.get(id)).catch(() => null);
}

export function excluirOcorrenciaHistoricoIDB(indexedDB, id) {
  if (!indexedDB || !id) return Promise.resolve(false);
  return executar(indexedDB, 'readwrite', HISTORICO_STORE, (store) => store.delete(id)).then(() => true);
}
