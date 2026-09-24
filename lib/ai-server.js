import { PMRV_PROVEDORES_IA, modeloValido, nomesEnv, obterProvedor } from './ai-models';

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
  const chave = nomesEnv(provedor)
    .map((nome) => process.env[nome])
    .find((v) => typeof v === 'string' && v.trim());
  return {
    provedor,
    chave: chave ? chave.trim() : '',
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

export const MAX_TENTATIVAS = 6;

// Ordem do fallback: modelo escolhido → padrão do mesmo provedor → padrão dos
// demais provedores configurados (ordem do registro). A chave enviada pelo
// cliente (botão 🔑) só vale para o provedor escolhido.
export function montarTentativas({ provider, model, apiKeyCliente = '', fallback = true }) {
  const escolhido = obterProvedor(provider);
  const tentativas = [];

  const adicionar = (provedor, modelo, chaveExtra = '') => {
    const { chave, chatUrl } = resolverProvedor(provedor.id);
    const apiKey = chave || chaveExtra;
    if (!apiKey || !chatUrl) return;
    if (tentativas.some((t) => t.provedor.id === provedor.id && t.modelo === modelo)) return;
    tentativas.push({ provedor, modelo, apiKey, chatUrl });
  };

  adicionar(escolhido, modeloValido(model) ? model : escolhido.padrao, apiKeyCliente);
  if (fallback) {
    adicionar(escolhido, escolhido.padrao, apiKeyCliente);
    PMRV_PROVEDORES_IA.filter((p) => p.id !== escolhido.id).forEach((p) => adicionar(p, p.padrao));
  }
  return tentativas.slice(0, MAX_TENTATIVAS);
}
