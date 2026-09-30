import { describe, expect, it } from 'vitest';
import { labelUnidade, lerUnidade, salvarUnidade, UNIDADE_PADRAO, UNIDADE_STORAGE_KEY } from './unidade';

function storageFake() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}

describe('unidade configurável', () => {
  it('default preserva o comportamento atual (Posto 19)', () => {
    expect(labelUnidade(storageFake())).toBe('1º BPMRv / 1ª CIA / Posto 19');
    expect(UNIDADE_PADRAO.posto).toBe('Posto 19');
  });

  it('salva e relê uma unidade customizada', () => {
    const s = storageFake();
    salvarUnidade(s, { bpm: '3º BPMRv', cia: '2ª CIA', posto: 'Posto 7' });
    expect(s.getItem(UNIDADE_STORAGE_KEY)).toContain('3º BPMRv');
    expect(labelUnidade(s)).toBe('3º BPMRv / 2ª CIA / Posto 7');
  });

  it('config parcial cai no default apenas nos campos vazios', () => {
    const s = storageFake();
    salvarUnidade(s, { bpm: '4º BPMRv' });
    expect(lerUnidade(s)).toEqual({ bpm: '4º BPMRv', cia: '1ª CIA', posto: 'Posto 19' });
  });

  it('storage vazio/corrompido devolve o padrão em vez de quebrar', () => {
    const s = storageFake();
    s.setItem(UNIDADE_STORAGE_KEY, '{quebrado');
    expect(lerUnidade(s)).toEqual(UNIDADE_PADRAO);
  });
});
