export const ABAS = ['envolvidos', 'danos', 'dinamica', 'resumo', 'relato', 'salvar'];
export const ABAS_OCORRENCIA = ['danos', 'dinamica', 'resumo'];

const AREA_POR_ABA = {
  envolvidos: 'pessoas',
  danos: 'ocorrencia',
  dinamica: 'ocorrencia',
  resumo: 'ocorrencia',
  relato: 'relato',
  salvar: 'finalizar',
};

const ABA_INICIAL_POR_AREA = {
  pessoas: 'envolvidos',
  ocorrencia: 'dinamica',
  relato: 'relato',
  finalizar: 'salvar',
};

/** Só aceita abas reais. Qualquer outro valor (incl. arrays de query) cai em envolvidos — não inventa rota. */
export function abaFromSearchParam(value) {
  if (typeof value !== 'string') return 'envolvidos';
  return ABAS.includes(value) ? value : 'envolvidos';
}

export function areaFromAba(aba) {
  return AREA_POR_ABA[abaFromSearchParam(aba)];
}

export function abaInicialDaArea(area) {
  return ABA_INICIAL_POR_AREA[area] || 'envolvidos';
}
