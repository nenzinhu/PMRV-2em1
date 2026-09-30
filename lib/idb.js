// Persistência do documento único em IndexedDB (assíncrona, sem JSON gigante
// no localStorage). Um store, um registro: 'atual'.
// Não depende de React; nos testes usa fake-indexeddb.

export const OCORRENCIA_DB = 'pmrv-ocorrencias';
export const OCORRENCIA_STORE = 'ocorrencias';
export const OCORRENCIA_ID = 'atual';

function abrirDB(indexedDB) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OCORRENCIA_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OCORRENCIA_STORE)) db.createObjectStore(OCORRENCIA_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function executar(indexedDB, modo, fn) {
  return abrirDB(indexedDB).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(OCORRENCIA_STORE, modo);
        const req = fn(tx.objectStore(OCORRENCIA_STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req ? req.result : undefined);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error || new Error('Transação abortada'));
        };
      })
  );
}

export function lerOcorrenciaIDB(indexedDB, id = OCORRENCIA_ID) {
  if (!indexedDB) return Promise.resolve(null);
  return executar(indexedDB, 'readonly', (store) => store.get(id)).catch(() => null);
}

export function gravarOcorrenciaIDB(indexedDB, doc, id = OCORRENCIA_ID) {
  if (!indexedDB) return Promise.resolve(false);
  return executar(indexedDB, 'readwrite', (store) => store.put(doc, id)).then(() => true);
}
