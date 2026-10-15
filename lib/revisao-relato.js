export const ACOES_RELATO = Object.freeze({
  ortografia: Object.freeze({
    carregando: 'Corrigindo…',
    instrucao:
      'Corrija somente ortografia, acentuação, concordância e pontuação do relato individual abaixo. Preserve as palavras, a ordem das informações e todos os fatos; não reescreva, não resuma e não acrescente nada. Responda APENAS com o texto corrigido, sem comentários.',
  }),
  melhorar: Object.freeze({
    carregando: 'Melhorando…',
    instrucao:
      'Reescreva o relato individual abaixo para deixá-lo claro, direto e objetivo, com linguagem simples e fácil de entender. Preserve todos os fatos e a sequência dos acontecimentos. Não invente, não presuma, não omita informações e não faça juízo de valor. Responda APENAS com o relato melhorado, sem comentários.',
  }),
});

export function promptRevisaoRelato(acao, relato) {
  const configuracao = ACOES_RELATO[acao];
  if (!configuracao) return '';
  return `${configuracao.instrucao}\n\n${relato}`;
}
