// Estilos de redação usados em todas as gerações de relato/dinâmica por IA.

export const ESTILOS_RELATO = [
  {
    id: 'policial',
    label: 'Policial',
    instrucao:
      'POLICIAL: linguagem policial-administrativa da PMRV-SC, neutra e impessoal, sem tomar partido. ' +
      'Cite normas do Código de Trânsito Brasileiro (CTB) somente quando o dispositivo se aplicar de forma clara aos fatos.',
  },
  {
    id: 'juridico',
    label: 'Jurídico',
    instrucao:
      'JURÍDICO: linguagem formal jurídico-policial, com vocabulário técnico-jurídico adequado a documentos oficiais, ' +
      'descrevendo conduta e nexo causal. Cite dispositivos do CTB apenas se claramente aplicáveis aos fatos informados.',
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    instrucao:
      'TÉCNICO: terminologia de perícia de trânsito e dinâmica veicular (trajetória, ponto de impacto, perda de aderência, ' +
      'energia cinética, posição final), com descrição objetiva e precisa, adequada a laudo.',
  },
  {
    id: 'leigo',
    label: 'Leigo',
    instrucao:
      'LEIGO: linguagem simples, clara e direta, sem jargões policiais, jurídicos ou de perícia, ' +
      'para que qualquer cidadão compreenda facilmente o que aconteceu.',
  },
  {
    id: 'narrativo',
    label: 'Narrativo-descritivo',
    instrucao:
      'NARRATIVO-DESCRITIVO: narre os acontecimentos em ordem cronológica, descrevendo o cenário (via, sentido, ' +
      'condições) e a movimentação de cada envolvido até o impacto e a posição final, com fluidez e coesão.',
  },
  {
    id: 'formal',
    label: 'Formal',
    instrucao:
      'FORMAL: norma culta do português do Brasil, registro formal de documento oficial, frases completas, ' +
      'sem coloquialismos, gírias ou abreviações.',
  },
  {
    id: 'factual',
    label: 'Factual',
    instrucao:
      'FACTUAL: apenas fatos objetivos e verificáveis, frases curtas e diretas, sem adjetivos valorativos, ' +
      'sem opiniões e sem atribuir culpa.',
  },
];

export const ESTILO_RELATO_PADRAO = 'policial';

const POR_ID = Object.fromEntries(ESTILOS_RELATO.map((e) => [e.id, e]));

// Ids antigos (aba Relato Policial) continuam aceitos.
const ALIASES = { juridica: 'juridico', leiga: 'leigo', tecnica: 'tecnico' };

export function estiloRelatoValido(id) {
  const norm = ALIASES[id] || id;
  return POR_ID[norm] ? norm : ESTILO_RELATO_PADRAO;
}

export function obterEstiloRelato(id) {
  return POR_ID[estiloRelatoValido(id)];
}
