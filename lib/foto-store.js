const DB_NAME = 'pmrv-fotos';
const STORE = 'fotos';

export function fotosParaStorage(fotos) {
  if (!Array.isArray(fotos)) return [];
  return fotos.filter((f) => f && f.id).map((f) => ({ id: f.id }));
}

export function envolvidosParaStorage(lista) {
  return (lista || []).map((ev) => ({
    ...ev,
    fotos: fotosParaStorage(ev.fotos),
  }));
}

export function precisaMigrarFotos(lista) {
  return (lista || []).some((ev) =>
    (ev.fotos || []).some((f) => f && typeof f.src === 'string' && f.src.startsWith('data:'))
  );
}

export function novoFotoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

export function dataUrlParaBlob(dataUrl) {
  const parts = String(dataUrl).split(',');
  const head = parts[0] || '';
  const b64 = parts[1] || '';
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function openFotosDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function salvarFotoBlob(id, blob) {
  const db = await openFotosDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function lerFotoBlob(id) {
  const db = await openFotosDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function apagarFoto(id) {
  if (!id) return;
  const db = await openFotosDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Move Data URLs legados para o IndexedDB e devolve a mesma foto com id + blob local. Não inventa arquivo. */
export async function migrarFotosLegadas(lista) {
  const next = [];
  for (const ev of lista || []) {
    const fotos = [];
    for (const f of ev.fotos || []) {
      if (f && typeof f.src === 'string' && f.src.startsWith('data:')) {
        const id = f.id || novoFotoId();
        const blob = dataUrlParaBlob(f.src);
        await salvarFotoBlob(id, blob);
        fotos.push({ id, src: URL.createObjectURL(blob) });
      } else if (f && f.id) {
        fotos.push(f);
      }
    }
    next.push({ ...ev, fotos });
  }
  return next;
}

/** Completa { id } com object URL a partir do IndexedDB. Foto sem blob fica sem src — não inventa imagem. */
export async function hidratarFotos(lista) {
  const next = [];
  for (const ev of lista || []) {
    const fotos = [];
    for (const f of ev.fotos || []) {
      if (!f || !f.id) continue;
      if (f.src) {
        fotos.push(f);
        continue;
      }
      const blob = await lerFotoBlob(f.id);
      if (!blob) {
        fotos.push({ id: f.id });
        continue;
      }
      fotos.push({ id: f.id, src: URL.createObjectURL(blob) });
    }
    next.push({ ...ev, fotos });
  }
  return next;
}
