export const RESUMO_OPCOES = [
  { id: 'narrativo', label: 'Relato Narrativo Direto' },
  { id: 'tecnico_policial', label: 'Relato Técnico/Policial' },
];

export const RESUMO_ESTILOS = RESUMO_OPCOES.map((opcao) => opcao.id);
export const RESUMO_ESTILO_PADRAO = 'tecnico_policial';

const INSTRUCOES = {
  narrativo:
    'RELATO NARRATIVO DIRETO: linguagem formal e objetiva, preferencialmente em terceira pessoa. ' +
    'Use primeira pessoa somente quando o autor descrever suas próprias ações, sempre de forma neutra. ' +
    'Organize os acontecimentos em sequência clara, direta e cronológica.',
  tecnico_policial:
    'RELATO TÉCNICO/POLICIAL: estilo extremamente impessoal, técnico e descritivo. ' +
    'Descreva objetivamente a dinâmica física do acidente, incluindo trajetórias, movimentos, pontos de impacto ' +
    'e posições finais quando informados. Evite qualquer juízo de valor: não atribua culpa e não indique quem está errado.',
};

const ESTILOS_ANTIGOS = {
  tecnico: 'tecnico_policial',
  policial: 'tecnico_policial',
  leigo: 'narrativo',
};

export function estiloResumoValido(estilo) {
  const migrado = ESTILOS_ANTIGOS[estilo] || estilo;
  return RESUMO_ESTILOS.includes(migrado) ? migrado : RESUMO_ESTILO_PADRAO;
}

export function normalizarResumoEstilos({ resumos, resumo, estiloResumo } = {}) {
  const antigos = resumos && typeof resumos === 'object' ? resumos : {};
  const modo = estiloResumoValido(estiloResumo);
  const texto = (valor) => (typeof valor === 'string' ? valor : '');
  const narrativo = texto(antigos.narrativo) || texto(antigos.leigo);
  const tecnico = texto(antigos.tecnico);
  const policial = texto(antigos.policial);
  const tecnicoPolicial =
    texto(antigos.tecnico_policial) ||
    (estiloResumo === 'tecnico' ? tecnico || policial : policial || tecnico);
  const normalizados = {
    narrativo,
    tecnico_policial: tecnicoPolicial,
  };
  if (typeof resumo === 'string' && resumo) normalizados[modo] = resumo;
  return { resumos: normalizados, estiloResumo: modo };
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
