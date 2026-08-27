export const RESUMO_ESTILOS = ['tecnico', 'policial', 'leigo'];

const INSTRUCOES = {
  tecnico:
    'TÉCNICO (perícia / casos judiciais mais graves): linguagem de perícia de trânsito e dinâmica veicular ' +
    '(trajetória, ponto de impacto, perda de aderência, energia cinética, nexo causal). Texto objetivo, preciso, ' +
    'adequado a laudo e a processo judicial. Cite o Código de Trânsito Brasileiro (CTB) somente se o dispositivo ' +
    'couber de forma clara nos fatos relatados.',
  policial:
    'POLICIAL (resumo neutro): unifique os relatos individuais em um único parágrafo administrativo, sem tomar partido. ' +
    'Linguagem policial-administrativa da PMRV-SC, com as normas de trânsito e o Código de Trânsito Brasileiro (CTB) ' +
    'somente quando o dispositivo se aplicar de forma clara aos fatos. Tom presuntivo ("presume-se").',
  leigo:
    'LEIGO: linguagem simples, clara e direta, para qualquer cidadão compreender o que aconteceu. Sem jargão policial, ' +
    'sem termos de perícia e sem citar artigos do CTB.',
};

export function estiloResumoValido(estilo) {
  return RESUMO_ESTILOS.includes(estilo) ? estilo : 'policial';
}

export function relatosParaBase(relatos) {
  if (!Array.isArray(relatos)) return '';
  return relatos
    .map((r) => {
      if (!r || typeof r.texto !== 'string') return '';
      const texto = r.texto.trim();
      if (!texto) return '';
      const nome = typeof r.envolvidoNome === 'string' ? r.envolvidoNome.trim() : '';
      return nome ? `${nome}: ${texto}` : texto;
    })
    .filter(Boolean)
    .join('\n\n');
}

export function buildResumoPrompt(relatos, estilo) {
  const modo = estiloResumoValido(estilo);
  const base = relatosParaBase(relatos);
  return (
    'Você é um redator de relatórios da Polícia Militar Rodoviária de Santa Catarina.\n\n' +
    'Abaixo há relatos individuais de um sinistro de trânsito. Monte um resumo unificado da dinâmica do ocorrido.\n\n' +
    `Estilo: ${INSTRUCOES[modo]}\n\n` +
    'Regras:\n' +
    '- Responda APENAS com o texto do resumo.\n' +
    '- Um único parágrafo, em português do Brasil.\n' +
    '- Mantenha tom presuntivo ("presume-se"), pois a guarnição pode não ter presenciado os fatos.\n' +
    '- Não invente fatos além dos relatos fornecidos.\n' +
    '- Preserve detalhes importantes de posicionamento, trajetória, veículos e pontos de impacto que estejam nos relatos.\n' +
    '- Use todos os relatos individuais abaixo como fonte; não omita condutor citado.\n\n' +
    base
  );
}
