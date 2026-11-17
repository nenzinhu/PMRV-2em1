// Catálogo único para relatos individuais, resumo e dinâmica.
export const ESTILOS_RELATO = [
  {
    id: 'formal',
    label: 'Formal simples',
    descricao: 'Objetivo, claro e adequado ao registro.',
    instrucao:
      'FORMAL SIMPLES: linguagem formal, neutra e objetiva, com frases curtas e palavras comuns. Organize os fatos em ordem cronológica, sem burocratês. Na síntese, use terceira pessoa; primeira pessoa apenas para as próprias ações de quem declara.',
  },
  {
    id: 'leigo',
    label: 'Linguagem fácil',
    descricao: 'Palavras do dia a dia, sem jargões.',
    instrucao:
      'LINGUAGEM FÁCIL: escreva de modo que uma criança de 10 anos entenda, sem infantilizar. Use frases curtas, palavras do dia a dia e explique termos indispensáveis. Preserve todos os fatos e incertezas.',
  },
  {
    id: 'tecnico',
    label: 'Técnico realista',
    descricao: 'Preciso, com termos técnicos pertinentes.',
    instrucao:
      'TÉCNICO REALISTA: linguagem impessoal, técnica e descritiva da dinâmica física do sinistro. Use termos como trajetória, sentido de circulação, ponto de impacto e posição final somente quando sustentados pelos dados. Não invente medições, velocidades, conclusões periciais ou enquadramentos legais. Não atribua culpa.',
  },
];
export const ESTILO_RELATO_PADRAO = 'formal';
const POR_ID = Object.fromEntries(ESTILOS_RELATO.map((e) => [e.id, e]));
const ALIASES = {
  policial: 'formal',
  juridico: 'formal',
  juridica: 'formal',
  narrativo: 'formal',
  factual: 'formal',
  leiga: 'leigo',
  tecnica: 'tecnico',
  tecnico_policial: 'tecnico',
};
export function estiloRelatoValido(id) {
  const norm = ALIASES[id] || id;
  return POR_ID[norm] ? norm : ESTILO_RELATO_PADRAO;
}
export function obterEstiloRelato(id) {
  return POR_ID[estiloRelatoValido(id)];
}
