import { obterEstiloRelato } from './estilos-relato';

export const ACOES_RELATO = Object.freeze({
  ortografia: Object.freeze({
    carregando: 'Corrigindo…',
    instrucao:
      'Corrija somente ortografia, acentuação, concordância e pontuação do relato individual abaixo. Preserve as palavras, a ordem das informações e todos os fatos; não reescreva, não resuma e não acrescente nada. Responda APENAS com o texto corrigido, sem comentários.',
  }),
  melhorar: Object.freeze({
    carregando: 'Melhorando…',
    instrucao:
      'Reescreva o relato individual abaixo para deixá-lo claro, direto e objetivo, no estilo solicitado. Preserve todos os fatos e a sequência dos acontecimentos. Não invente, não presuma, não omita informações e não faça juízo de valor. Responda APENAS com o relato melhorado, sem comentários.',
  }),
});

export function promptRevisaoRelato(acao, relato, estilo) {
  const configuracao = ACOES_RELATO[acao];
  if (!configuracao) return '';
  return `${configuracao.instrucao}${acao === 'melhorar' ? `\nEstilo: ${obterEstiloRelato(estilo).instrucao} Preserve a pessoa verbal de quem declara.` : ''}\n\n${relato}`;
}
