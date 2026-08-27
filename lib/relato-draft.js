export const RELATO_DRAFT_KEY = 'PMRV_RELATO_RASCUNHO';

export function serializeRelatoDraft(draft) {
  return JSON.stringify(draft);
}

export function parseRelatoDraft(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    if (!obj.form || typeof obj.form !== 'object' || Array.isArray(obj.form)) return null;
    return obj;
  } catch {
    return null;
  }
}

/**
 * Reconstitui o rascunho sem inventar data/hora do fato.
 * Campos ausentes em rascunhos antigos ficam vazios — nunca "hoje".
 */
export function mergeRelatoDraft(draft, defaults = {}) {
  const incoming = draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : {};
  const formIn =
    incoming.form && typeof incoming.form === 'object' && !Array.isArray(incoming.form)
      ? incoming.form
      : {};
  const form = { ...defaults, ...formIn };
  form.dataFato = typeof formIn.dataFato === 'string' ? formIn.dataFato : '';
  form.horaFato = typeof formIn.horaFato === 'string' ? formIn.horaFato : '';
  return {
    form,
    step: Number.isFinite(incoming.step) ? incoming.step : 1,
    manualEdit: incoming.manualEdit === true,
    manualText: typeof incoming.manualText === 'string' ? incoming.manualText : '',
  };
}

/**
 * Grava o texto na dinâmica do rascunho do Relato.
 * Não inventa data/hora nem demais fatos: só acrescenta ou substitui `dinamica`.
 */
export function aplicarDinamicaNoRascunho(texto, storage) {
  const t = typeof texto === 'string' ? texto.trim() : '';
  if (!t) return false;
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store || typeof store.getItem !== 'function' || typeof store.setItem !== 'function') {
    return false;
  }
  const parsed = parseRelatoDraft(store.getItem(RELATO_DRAFT_KEY));
  const next = parsed
    ? { ...parsed, form: { ...(parsed.form || {}), dinamica: t } }
    : { form: { dinamica: t }, step: 1, manualEdit: false, manualText: '' };
  store.setItem(RELATO_DRAFT_KEY, serializeRelatoDraft(next));
  return true;
}
