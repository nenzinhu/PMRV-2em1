// Perfil da unidade como configuração (não código): qualquer posto/BPMRv usa o
// app sem fork. O default mantém o comportamento atual do Posto 19.
export const UNIDADE_STORAGE_KEY = 'PMRV_UNIDADE';

export const UNIDADE_PADRAO = {
  bpm: '1º BPMRv',
  cia: '1ª CIA',
  posto: 'Posto 19',
};

function storagePadrao() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

/**
 * Rótulo da unidade para o cabeçalho do relatório, ex.:
 * "1º BPMRv / 1ª CIA / Posto 19". Aceita storage injetado (testes).
 */
export function labelUnidade(storage = storagePadrao()) {
  const u = lerUnidade(storage);
  return [u.bpm, u.cia, u.posto].filter(Boolean).join(' / ');
}

export function lerUnidade(storage = storagePadrao()) {
  try {
    const raw = storage ? storage.getItem(UNIDADE_STORAGE_KEY) : null;
    if (!raw) return { ...UNIDADE_PADRAO };
    const p = JSON.parse(raw);
    const limpo = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '');
    const config = { bpm: limpo(p.bpm), cia: limpo(p.cia), posto: limpo(p.posto) };
    if (!config.bpm && !config.cia && !config.posto) return { ...UNIDADE_PADRAO };
    return config;
  } catch {
    return { ...UNIDADE_PADRAO };
  }
}

export function salvarUnidade(storage, config) {
  if (!storage || !config || typeof config !== 'object') return false;
  const limpo = (v) => (typeof v === 'string' ? v.trim() : '');
  const atual = {
    bpm: limpo(config.bpm) || UNIDADE_PADRAO.bpm,
    cia: limpo(config.cia) || UNIDADE_PADRAO.cia,
    posto: limpo(config.posto) || UNIDADE_PADRAO.posto,
  };
  try {
    storage.setItem(UNIDADE_STORAGE_KEY, JSON.stringify(atual));
    return true;
  } catch {
    return false;
  }
}
