import { PMRV_PROVEDORES_IA, obterProvedor } from './ai-models';

// SÓ SERVIDOR: resolve chave e URLs do provedor a partir de process.env.
// Placeholders {VAR} nas URLs são trocados pela variável de ambiente VAR.

function preencher(url) {
  let faltando = false;
  const pronta = url.replace(/\{(\w+)\}/g, (_, nome) => {
    const valor = process.env[nome];
    if (!valor) faltando = true;
    return encodeURIComponent(valor || '');
  });
  return faltando ? null : pronta;
}

export function resolverProvedor(id) {
  const provedor = obterProvedor(id);
  return {
    provedor,
    chave: process.env[provedor.env] || '',
    chatUrl: preencher(provedor.chatUrl),
    modelosUrl: provedor.modelos ? preencher(provedor.modelos.url) : null,
  };
}

// Quais provedores têm chave (e variáveis extras) configuradas no servidor.
export function provedoresConfigurados() {
  return Object.fromEntries(
    PMRV_PROVEDORES_IA.map((p) => {
      const { chave, chatUrl } = resolverProvedor(p.id);
      return [p.id, Boolean(chave && chatUrl)];
    })
  );
}
