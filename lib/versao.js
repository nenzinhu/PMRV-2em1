// Versão do app exibida no dossiê exportado (rastreabilidade entre aparelhos).
export const APP_VERSAO = '1.1.0';

/** Rodapé do dossiê: versão do app + versão do modelo do documento. */
export function rodapeVersao(versaoModelo) {
  const modelo = Number.isFinite(versaoModelo) ? `v${versaoModelo}` : '?';
  return `Gerado pelo PMRV-SC Relato Policial ${APP_VERSAO} · modelo de ocorrência ${modelo}`;
}
