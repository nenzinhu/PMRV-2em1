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
    if (!raw) return { relatos: [], resumo: '' };
    const obj = JSON.parse(raw);
    return {
      relatos: Array.isArray(obj.relatos) ? obj.relatos : [],
      resumo: typeof obj.resumo === 'string' ? obj.resumo : '',
    };
  } catch {
    return { relatos: [], resumo: '' };
  }
}

export function persistResumoState(state) {
  localStorage.setItem(
    RESUMO_STORAGE_KEY,
    JSON.stringify({
      relatos: Array.isArray(state.relatos) ? state.relatos : [],
      resumo: typeof state.resumo === 'string' ? state.resumo : '',
    })
  );
}

/** Grava o relato individual no resumo. Não mexe no parágrafo unificado da IA. */
export function salvarRelatoNoResumo(ev) {
  const entrada = relatoFromEnvolvido(ev);
  if (!entrada) return { ok: false, reason: 'vazio' };
  const atual = loadResumoState();
  const relatos = upsertRelatoNoResumo(atual.relatos, entrada);
  persistResumoState({ relatos, resumo: atual.resumo });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pmrv-resumo-changed'));
  }
  return { ok: true, total: relatos.length, envolvidoId: entrada.envolvidoId };
}

export function retirarRelatoDoResumo(envolvidoId) {
  const atual = loadResumoState();
  persistResumoState({
    relatos: removerRelatoDoEnvolvido(atual.relatos, envolvidoId),
    resumo: atual.resumo,
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pmrv-resumo-changed'));
  }
}
