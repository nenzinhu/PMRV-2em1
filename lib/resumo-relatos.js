export const RESUMO_STORAGE_KEY = 'PMRV_RESUMO_DINAMICA';

/** Só o que o policial escreveu. Relato vazio não vira card no resumo. */
export function relatoFromEnvolvido(ev) {
  if (!ev || typeof ev !== 'object') return null;
  const texto = typeof ev.relato === 'string' ? ev.relato.trim() : '';
  if (!texto) return null;
  const nome = typeof ev.nome === 'string' ? ev.nome.trim() : '';
  return {
    envolvidoId: ev.id,
    envolvidoNome: nome || `Envolvido #${ev.id}`,
    texto,
  };
}

export function upsertRelatoNoResumo(relatos, entrada, novoId = () => Date.now()) {
  const lista = Array.isArray(relatos) ? relatos.map((r) => ({ ...r })) : [];
  if (!entrada) return lista;
  const idx = lista.findIndex((r) => Number(r.envolvidoId) === Number(entrada.envolvidoId));
  if (idx >= 0) {
    lista[idx] = {
      ...lista[idx],
      texto: entrada.texto,
      envolvidoNome: entrada.envolvidoNome,
    };
    return lista;
  }
  return [...lista, { id: novoId(), ...entrada }];
}

export function removerRelatoDoEnvolvido(relatos, envolvidoId) {
  return (Array.isArray(relatos) ? relatos : []).filter(
    (r) => Number(r.envolvidoId) !== Number(envolvidoId)
  );
}

export function loadResumoState() {
  try {
    const raw = localStorage.getItem(RESUMO_STORAGE_KEY);
    if (!raw) return emptyState();
    const obj = JSON.parse(raw);
    const resumo = typeof obj.resumo === 'string' ? obj.resumo : '';
    const resumos = {
      tecnico: typeof obj.resumos?.tecnico === 'string' ? obj.resumos.tecnico : '',
      policial: typeof obj.resumos?.policial === 'string' ? obj.resumos.policial : '',
      leigo: typeof obj.resumos?.leigo === 'string' ? obj.resumos.leigo : '',
    };
    const estiloResumo = ['tecnico', 'policial', 'leigo'].includes(obj.estiloResumo)
      ? obj.estiloResumo
      : 'policial';
    if (resumo && !resumos[estiloResumo]) resumos[estiloResumo] = resumo;
    return {
      relatos: Array.isArray(obj.relatos) ? obj.relatos : [],
      resumo,
      resumos,
      estiloResumo,
    };
  } catch {
    return emptyState();
  }
}

function emptyState() {
  return {
    relatos: [],
    resumo: '',
    resumos: { tecnico: '', policial: '', leigo: '' },
    estiloResumo: 'policial',
  };
}

export function persistResumoState(state) {
  const resumo = typeof state.resumo === 'string' ? state.resumo : '';
  const estiloResumo = ['tecnico', 'policial', 'leigo'].includes(state.estiloResumo)
    ? state.estiloResumo
    : 'policial';
  const resumos = {
    tecnico: typeof state.resumos?.tecnico === 'string' ? state.resumos.tecnico : '',
    policial: typeof state.resumos?.policial === 'string' ? state.resumos.policial : '',
    leigo: typeof state.resumos?.leigo === 'string' ? state.resumos.leigo : '',
  };
  localStorage.setItem(
    RESUMO_STORAGE_KEY,
    JSON.stringify({
      relatos: Array.isArray(state.relatos) ? state.relatos : [],
      resumo,
      resumos,
      estiloResumo,
    })
  );
}

/** Grava o relato individual no resumo. Não mexe no parágrafo unificado da IA. */
export function salvarRelatoNoResumo(ev) {
  const entrada = relatoFromEnvolvido(ev);
  if (!entrada) return { ok: false, reason: 'vazio' };
  const atual = loadResumoState();
  const relatos = upsertRelatoNoResumo(atual.relatos, entrada);
  persistResumoState({ ...atual, relatos });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pmrv-resumo-changed'));
  }
  return { ok: true, total: relatos.length, envolvidoId: entrada.envolvidoId };
}

export function retirarRelatoDoResumo(envolvidoId) {
  const atual = loadResumoState();
  persistResumoState({
    ...atual,
    relatos: removerRelatoDoEnvolvido(atual.relatos, envolvidoId),
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pmrv-resumo-changed'));
  }
}
