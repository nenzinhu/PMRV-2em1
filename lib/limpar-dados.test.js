import { describe, expect, it } from 'vitest';
import {
  DADOS_KEEP_KEYS,
  FOTOS_DB_NAME,
  chavesPmrvParaLimpar,
  limparCachesApp,
  limparStoragePmrv,
  limparTodosOsDados,
} from './limpar-dados';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return [...map.keys()][i] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
  };
}

describe('limpar dados do PMRV', () => {
  it('lista só chaves de ocorrência, sem tema/VTR/tokens', () => {
    const storage = memoryStorage({
      PMRV_RELATO_RASCUNHO: '{}',
      PMRV_ENVOLVIDOS: '{}',
      PMRV_RESUMO_DINAMICA: '{}',
      PMRV_RESUMO_CLIPBOARD: 'x',
      PMRV_THEME_CONFIG: '{}',
      PMRV_GROQ_KEY: 'sk',
      PMRV_VTR: '1901',
      PMRV_PLACA_TOKEN: 'tok',
      OUTRO_APP: 'nao',
    });
    const keys = chavesPmrvParaLimpar(storage);
    expect(keys.sort()).toEqual(
      ['PMRV_ENVOLVIDOS', 'PMRV_RELATO_RASCUNHO', 'PMRV_RESUMO_CLIPBOARD', 'PMRV_RESUMO_DINAMICA'].sort()
    );
    expect(keys.some((k) => DADOS_KEEP_KEYS.includes(k))).toBe(false);
  });

  it('remove rascunhos e preserva preferências', () => {
    const storage = memoryStorage({
      PMRV_RELATO_RASCUNHO: '{"form":{}}',
      PMRV_ENVOLVIDOS: '{"lista":[]}',
      PMRV_THEME_CONFIG: '{"mode":"dark"}',
      PMRV_VTR: '1901',
    });
    const removed = limparStoragePmrv(storage);
    expect(removed).toContain('PMRV_RELATO_RASCUNHO');
    expect(removed).toContain('PMRV_ENVOLVIDOS');
    expect(storage.getItem('PMRV_THEME_CONFIG')).toBe('{"mode":"dark"}');
    expect(storage.getItem('PMRV_VTR')).toBe('1901');
    expect(storage.getItem('PMRV_RELATO_RASCUNHO')).toBe(null);
  });

  it('apaga todos os caches nomeados do app', async () => {
    const store = new Map([
      ['pmrv-sc-relatos-v4', true],
      ['pmrv-sc-relatos-v3', true],
    ]);
    const cachesApi = {
      keys: async () => [...store.keys()],
      delete: async (k) => store.delete(k),
    };
    const cleared = await limparCachesApp(cachesApi);
    expect(cleared).toEqual(['pmrv-sc-relatos-v4', 'pmrv-sc-relatos-v3']);
    expect(store.size).toBe(0);
  });

  it('limpa storage + cache + IndexedDB de fotos numa só chamada', async () => {
    const storage = memoryStorage({
      PMRV_ENVOLVIDOS: '{}',
      PMRV_THEME_CONFIG: '{}',
    });
    const deleted = [];
    const cachesStore = new Map([['pmrv-sc-relatos-v4', true]]);
    const result = await limparTodosOsDados({
      storage,
      sessionStorage: memoryStorage({ PMRV_RESUMO_CLIPBOARD: 'x' }),
      caches: {
        keys: async () => [...cachesStore.keys()],
        delete: async (k) => cachesStore.delete(k),
      },
      indexedDB: {
        deleteDatabase(name) {
          deleted.push(name);
          return {
            set onsuccess(fn) {
              fn();
            },
            set onerror(_) {},
            set onblocked(_) {},
          };
        },
      },
    });
    expect(storage.getItem('PMRV_ENVOLVIDOS')).toBe(null);
    expect(storage.getItem('PMRV_THEME_CONFIG')).toBe('{}');
    expect(result.removed).toContain('PMRV_ENVOLVIDOS');
    expect(result.cachesCleared).toEqual(['pmrv-sc-relatos-v4']);
    expect(deleted).toEqual([FOTOS_DB_NAME]);
    expect(cachesStore.size).toBe(0);
  });
});
