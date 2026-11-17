import {
  ESTILOS_RELATO,
  ESTILO_RELATO_PADRAO,
  estiloRelatoValido,
  obterEstiloRelato,
} from './estilos-relato';

export const RESUMO_OPCOES = ESTILOS_RELATO;
export const RESUMO_ESTILOS = ESTILOS_RELATO.map((e) => e.id);
export const RESUMO_ESTILO_PADRAO = ESTILO_RELATO_PADRAO;
export const estiloResumoValido = estiloRelatoValido;

export function normalizarResumoEstilos({
  resumos,
  resumo,
  estiloResumo,
} = {}) {
  const antigos = resumos && typeof resumos === 'object' ? resumos : {};
  const modo = estiloResumoValido(estiloResumo);
  const texto = (v) => (typeof v === 'string' ? v : '');
  // Mantém as chaves antigas no backup para não perder versões diferentes.
  const normalizados = {
    ...antigos,
    formal:
      texto(antigos.formal) ||
      texto(antigos.narrativo) ||
      texto(antigos.policial),
    leigo: texto(antigos.leigo),
    tecnico: texto(antigos.tecnico) || texto(antigos.tecnico_policial),
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
      const nome =
        typeof r.envolvidoNome === 'string' ? r.envolvidoNome.trim() : '';
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
    `Estilo: ${obterEstiloRelato(modo).instrucao}\n\n` +
    'Regras:\n' +
    '- Responda APENAS com o texto do resumo.\n' +
    '- Um único parágrafo, em português do Brasil.\n' +
    '- Mantenha tom presuntivo ("presume-se"), pois a guarnição pode não ter presenciado os fatos.\n' +
    '- Não invente fatos além dos relatos fornecidos.\n' +
    '- Atribua cada versão à sua fonte e explicite divergências sem escolher quem tem razão. Não transforme ausência de relato em concordância.\n' +
    '- Elimine repetições de redação, preservando informações distintas e quem declarou cada fato.\n' +
    '- Preserve detalhes importantes de posicionamento, trajetória, veículos e pontos de impacto que estejam nos relatos.\n' +
    '- Use todos os relatos individuais abaixo como fonte; não omita condutor citado.\n\n' +
    base
  );
}
