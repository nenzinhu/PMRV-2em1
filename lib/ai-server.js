import { PMRV_PROVEDORES_IA, modeloTemVisao, modeloValido, nomesEnv, obterProvedor } from './ai-models';

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
// Com `visao` (há imagens), só entram modelos que leem imagem: o escolhido se
// modeloTemVisao reconhecer, senão o `visao` de cada provedor.
export function montarTentativas({ provider, model, apiKeyCliente = '', fallback = true, visao = false }) {
  const escolhido = obterProvedor(provider);
  const tentativas = [];

  const adicionar = (provedor, modelo, chaveExtra = '') => {
    if (!modelo) return;
    const { chave, chatUrl } = resolverProvedor(provedor.id);
    const apiKey = chave || chaveExtra;
    if (!apiKey || !chatUrl) return;
    if (tentativas.some((t) => t.provedor.id === provedor.id && t.modelo === modelo)) return;
    tentativas.push({ provedor, modelo, apiKey, chatUrl });
  };
  const padraoDe = (p) => (visao ? p.visao : p.padrao);

  const pedido = modeloValido(model) ? model : escolhido.padrao;
  adicionar(escolhido, visao && !modeloTemVisao(pedido) ? escolhido.visao : pedido, apiKeyCliente);
  if (fallback) {
    adicionar(escolhido, padraoDe(escolhido), apiKeyCliente);
    PMRV_PROVEDORES_IA.filter((p) => p.id !== escolhido.id).forEach((p) => adicionar(p, padraoDe(p)));
  }
  return tentativas.slice(0, MAX_TENTATIVAS);
}

// Imagens aceitas do cliente: só data URLs JPEG/PNG/WebP, poucas e já comprimidas.
export const MAX_IMAGENS = 6;
const MAX_CHARS_IMAGEM = 1_500_000; // ~1,1 MB de arquivo em base64
const DATA_URL_IMAGEM = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

/** null = sem imagens; false = inválidas; array = imagens prontas para enviar. */
export function validarImagens(imagens) {
  if (imagens == null) return null;
  if (!Array.isArray(imagens) || imagens.length === 0 || imagens.length > MAX_IMAGENS) return false;
  const ok = imagens.every(
    (img) => typeof img === 'string' && img.length <= MAX_CHARS_IMAGEM && DATA_URL_IMAGEM.test(img)
  );
  return ok ? imagens : false;
}

// Mensagem do usuário no formato OpenAI: texto puro ou texto + image_url.
export function conteudoUsuario(prompt, imagens) {
  if (!imagens) return prompt;
  return [
    { type: 'text', text: prompt },
    ...imagens.map((url) => ({ type: 'image_url', image_url: { url } })),
  ];
}
