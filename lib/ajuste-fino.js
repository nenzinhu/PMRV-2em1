// "Ajuste fino" da geração de relatos.
//
// Os planos gratuitos dos provedores não permitem treinar (fine-tune) modelos,
// então o ajuste é feito por instruções: criatividade (temperatura), tamanho,
// instruções fixas do redator e um relato-modelo que a IA deve imitar (few-shot).
// Vale para todas as gerações de relato/dinâmica. Persistido em localStorage.

export const AJUSTE_FINO_KEY = 'PMRV_AJUSTE_FINO';

export const TAMANHOS = [
  { id: 'curto', label: 'Curto', instrucao: 'Seja conciso: no máximo 3 frases por texto.' },
  { id: 'medio', label: 'Médio', instrucao: 'Tamanho moderado: um parágrafo de 4 a 7 frases por texto.' },
  { id: 'detalhado', label: 'Detalhado', instrucao: 'Seja detalhado: descreva cada etapa do ocorrido, em um parágrafo completo.' },
];

export const AJUSTE_FINO_PADRAO = {
  temperatura: 0.3,
  tamanho: 'medio',
  instrucoes: '',
  exemplo: '',
};

const LIMITE_TEXTO = 4000;

function texto(v) {
  return typeof v === 'string' ? v.slice(0, LIMITE_TEXTO) : '';
}

// Normaliza qualquer valor (inclusive JSON corrompido) para um ajuste válido.
export function normalizarAjusteFino(bruto) {
  const obj = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : {};
  const t = Number(obj.temperatura);
  return {
    temperatura: Number.isFinite(t) ? Math.min(1, Math.max(0, Math.round(t * 10) / 10)) : AJUSTE_FINO_PADRAO.temperatura,
    tamanho: TAMANHOS.some((x) => x.id === obj.tamanho) ? obj.tamanho : AJUSTE_FINO_PADRAO.tamanho,
    instrucoes: texto(obj.instrucoes),
    exemplo: texto(obj.exemplo),
  };
}

export function carregarAjusteFino(storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return { ...AJUSTE_FINO_PADRAO };
  try {
    return normalizarAjusteFino(JSON.parse(store.getItem(AJUSTE_FINO_KEY) || 'null'));
  } catch {
    return { ...AJUSTE_FINO_PADRAO };
  }
}

export function salvarAjusteFino(ajuste, storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  const normal = normalizarAjusteFino(ajuste);
  try {
    store?.setItem(AJUSTE_FINO_KEY, JSON.stringify(normal));
  } catch {
    /* armazenamento indisponível */
  }
  return normal;
}

// Acrescenta ao prompt as preferências do redator.
export function aplicarAjusteFino(prompt, ajuste) {
  const a = normalizarAjusteFino(ajuste);
  const partes = [TAMANHOS.find((x) => x.id === a.tamanho).instrucao];
  if (a.instrucoes.trim()) partes.push(`Instruções do redator (siga sempre): ${a.instrucoes.trim()}`);
  if (a.exemplo.trim()) {
    partes.push(
      'Relato-modelo do redator — imite o estilo, o vocabulário e a estrutura, mas NUNCA copie os fatos dele:\n' +
        `"""${a.exemplo.trim()}"""`
    );
  }
  return `${prompt}\n\nPreferências de redação:\n- ${partes.join('\n- ')}`;
}
