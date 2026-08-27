const ABAS = ['envolvidos', 'relato', 'resumo'];

/** Só aceita abas reais. Qualquer outro valor (incl. arrays de query) cai em envolvidos — não inventa rota. */
export function abaFromSearchParam(value) {
  if (typeof value !== 'string') return 'envolvidos';
  return ABAS.includes(value) ? value : 'envolvidos';
}
