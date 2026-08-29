export const DADOS_KEEP_KEYS = [
  'PMRV_THEME_CONFIG',
  'PMRV_GROQ_KEY',
  'PMRV_VTR',
  'PMRV_PLACA_TOKEN',
];

export const FOTOS_DB_NAME = 'pmrv-fotos';

function listarChavesPmrv(storage) {
  if (!storage || typeof storage.key !== 'function') return [];
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith('PMRV_')) keys.push(k);
  }
  return keys;
}

/** Rascunhos e dados de ocorrência. Mantém tema, VTR e chaves de API. */
export function chavesPmrvParaLimpar(storage) {
  const keep = new Set(DADOS_KEEP_KEYS);
  return listarChavesPmrv(storage).filter((k) => !keep.has(k));
}

export function limparStoragePmrv(storage) {
  if (!storage || typeof storage.removeItem !== 'function') return [];
  const keys = chavesPmrvParaLimpar(storage);
  keys.forEach((k) => storage.removeItem(k));
  return keys;
}

export async function limparCachesApp(cachesApi) {
  if (!cachesApi || typeof cachesApi.keys !== 'function') return [];
  const keys = await cachesApi.keys();
  await Promise.all(keys.map((k) => cachesApi.delete(k)));
  return Array.isArray(keys) ? keys : [];
}

function apagarIndexedDb(indexedDBApi, name) {
  return new Promise((resolve, reject) => {
    if (!indexedDBApi || typeof indexedDBApi.deleteDatabase !== 'function') {
      resolve();
      return;
    }
    const req = indexedDBApi.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Falha ao apagar IndexedDB'));
    req.onblocked = () => resolve();
  });
}

/**
 * Apaga rascunhos, fotos e cache do PWA para não acumular no aparelho.
 * Preserva tema, VTR e tokens.
 */
export async function limparTodosOsDados(deps = {}) {
  const storage =
    deps.storage !== undefined
      ? deps.storage
      : typeof localStorage !== 'undefined'
        ? localStorage
        : null;
  const session =
    deps.sessionStorage !== undefined
      ? deps.sessionStorage
      : typeof sessionStorage !== 'undefined'
        ? sessionStorage
        : null;
  const cachesApi =
    deps.caches !== undefined ? deps.caches : typeof caches !== 'undefined' ? caches : null;
  const indexedDBApi =
    deps.indexedDB !== undefined
      ? deps.indexedDB
      : typeof indexedDB !== 'undefined'
        ? indexedDB
        : null;

  const removed = limparStoragePmrv(storage);
  if (session) limparStoragePmrv(session);
  const cachesCleared = await limparCachesApp(cachesApi);
  await apagarIndexedDb(indexedDBApi, FOTOS_DB_NAME);

  return { removed, cachesCleared };
}
