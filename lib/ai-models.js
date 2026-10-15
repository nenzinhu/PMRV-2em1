// Lista única e fechada de provedores/modelos usada por todas as abas.
// Nenhum segredo fica neste arquivo: apenas nomes de variáveis de ambiente.

export const PMRV_PROVEDORES_IA = [
  {
    id: 'groq',
    label: 'Groq',
    hint: 'Muito rápido; plano gratuito com limite diário',
    env: 'GROQ_API_KEY',
    chatUrl: 'https://api.groq.com/openai/v1/chat/completions',
    tokensParam: 'max_completion_tokens',
    padrao: 'qwen/qwen3.8-27b',
    gratis: 'Grátis com limite diário',
    visao: [
      {
        id: 'qwen/qwen3.8-27b',
        label: 'Qwen 3.8 27B',
        maxImagens: 3,
        descricao: 'Muito rápido, lê fotos e textos (placas, etiquetas). Aceita no máximo 3 fotos por análise.',
      },
    ],
    modelos: null,
    fallback: [
      { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B' },
      { id: 'openai/gpt-oss-120b', label: 'OpenAI GPT-OSS 120B' },
      { id: 'openai/gpt-oss-20b', label: 'OpenAI GPT-OSS 20B' },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    hint: 'Seleção fixa de modelos gratuitos',
    env: 'OPENROUTER_API_KEY',
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    padrao: 'poolside/laguna-s-2.1:free',
    gratis: 'Modelos :free (≈200 pedidos/dia)',
    visao: [
      {
        id: 'nvidia/nemotron-3-nano-30b-a3b:free',
        label: 'NVIDIA Nemotron 3 Nano Omni',
        descricao: 'Modelo multimodal gratuito para leitura e descrição objetiva de imagens.',
      },
      {
        id: 'google/gemma-4-26b-a4b-it:free',
        label: 'Google Gemma 4 26B A4B',
        descricao: 'Modelo multimodal gratuito para descrição clara de imagens e danos.',
      },
      {
        id: 'google/gemma-4-31b-it:free',
        label: 'Google Gemma 4 31B',
        descricao: 'Modelo multimodal gratuito para análise detalhada de imagens.',
      },
    ],
    modelos: null,
    fallback: [
      { id: 'poolside/laguna-s-2.1:free', label: 'Poolside Laguna S 2.1 (free)' },
      { id: 'thinking-machines/inkling:free', label: 'Thinking Machines Inkling (free)' },
      { id: 'cohere/north-mini-code:free', label: 'Cohere North Mini Code (free)' },
      { id: 'thinking-machines/inkling-small:free', label: 'Thinking Machines Inkling Small (free)' },
      { id: 'poolside/laguna-xs-2.1:free', label: 'Poolside Laguna XS 2.1 (free)' },
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'NVIDIA Nemotron 3 Super (free)' },
      { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'NVIDIA Nemotron 3 Nano Omni (free)' },
      { id: 'liquid/lfm2.5-2.6b:free', label: 'LiquidAI LFM2.5–2.6B (free)' },
      { id: 'google/gemma-4-26b-a4b-it:free', label: 'Google Gemma 4 26B A4B (free)' },
      { id: 'google/gemma-4-31b-it:free', label: 'Google Gemma 4 31B (free)' },
    ],
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    hint: 'Modelos selecionados da conta Cerebras',
    env: 'CEREBRAS_API_KEY',
    chatUrl: 'https://api.cerebras.ai/v1/chat/completions',
    padrao: 'command-a-03-2025',
    gratis: 'Conforme a cota da conta',
    modelos: null,
    fallback: [
      { id: 'command-a-03-2025', label: 'Command A 03-2025' },
      { id: 'command-a-plus-05-2026', label: 'Command A Plus 05-2026' },
      { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B' },
      { id: 'openai/gpt-oss-120b', label: 'OpenAI GPT-OSS' },
    ],
  },
  {
    id: 'cohere',
    label: 'Cohere',
    hint: 'Chave trial grátis (1.000 req/mês)',
    env: 'COHERE_API_KEY',
    chatUrl: 'https://api.cohere.ai/compatibility/v1/chat/completions',
    padrao: 'c4ai-aya-vision-32b',
    gratis: 'Chave trial da Cohere',
    visao: [
      {
        id: 'c4ai-aya-vision-32b',
        label: 'C4AI Aya Vision 32B',
        descricao: 'Modelo multimodal da Cohere para leitura e descrição de imagens.',
      },
    ],
    modelos: null,
    fallback: [
      { id: 'c4ai-aya-vision-32b', label: 'C4AI Aya Vision 32B' },
    ],
  },
];

export const PMRV_PROVEDOR_PADRAO = 'groq';

const POR_ID = Object.fromEntries(PMRV_PROVEDORES_IA.map((p) => [p.id, p]));

// Nomes de variável aceitos para a chave do provedor.
export function nomesEnv(provedor) {
  return Array.isArray(provedor.env) ? provedor.env : [provedor.env];
}

export function obterProvedor(id) {
  return POR_ID[id] || POR_ID[PMRV_PROVEDOR_PADRAO];
}

export function modeloPermitido(provider, modelo) {
  const provedor = POR_ID[provider];
  return Boolean(
    provedor &&
      typeof modelo === 'string' &&
      provedor.fallback.some((item) => item.id === modelo)
  );
}

export const PMRV_MODELO_PADRAO = Object.fromEntries(PMRV_PROVEDORES_IA.map((p) => [p.id, p.padrao]));
export const PMRV_MODELOS_FALLBACK = Object.fromEntries(PMRV_PROVEDORES_IA.map((p) => [p.id, p.fallback]));
export const PMRV_GROQ_MODEL = PMRV_MODELO_PADRAO.groq;
export const PMRV_OPENROUTER_MODEL = PMRV_MODELO_PADRAO.openrouter;

// Heurística por nome: famílias multimodais conhecidas. Na dúvida, fica de fora
// — um modelo só de texto que ignorasse a foto inventaria danos.
const MODELO_VISAO =
  /vision|pixtral|[-_/.]vl\b|-vl-|llama-4|gemma-[34]|mistral-(small|medium|large)|magistral|glm-[\d.]+v\b|glm-[\d.]+v-|qwen3\.[5-9]|kimi-k2\.5|kimi-k3|gpt-4o|gpt-4\.1|gpt-5/i;

export function modeloTemVisao(id) {
  return typeof id === 'string' && MODELO_VISAO.test(id);
}

export const padraoVisao = (provedor) => provedor?.visao?.[0]?.id || null;

/** Quantas fotos o modelo aceita por pedido (sem limite conhecido → Infinity). */
export function limiteImagens(provedor, modelo) {
  return provedor?.visao?.find((m) => m.id === modelo)?.maxImagens ?? Infinity;
}

// Lista plana para o seletor da aba Danos, na ordem do fallback.
export const PMRV_MODELOS_VISAO = PMRV_PROVEDORES_IA.flatMap((p) =>
  (p.visao || []).map((m) => ({ ...m, provedor: p.id, provedorLabel: p.label, gratis: p.gratis }))
);

/** Resposta bruta da listagem → modelos gratuitos com visão (só provedores com visaoAoVivo). */
export function filtrarModelosVisao(provider, bruto) {
  const p = POR_ID[provider];
  if (!p?.visaoAoVivo) return [];
  const unicos = [...new Map(p.visaoAoVivo(bruto).map((m) => [m.id, m])).values()];
  return unicos
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    .map((m) => ({ ...m, provedor: p.id, provedorLabel: p.label, gratis: p.gratis }));
}

/** O modelo pedido pode receber imagens? Somente entradas declaradas na lista fixa. */
export function aceitaImagem(provedor, modelo) {
  return Boolean(provedor?.visao?.some((item) => item.id === modelo));
}

// IDs aceitos vindos do cliente (evita repassar lixo ao provedor).
const MODELO_ID_VALIDO = /^[\w.\/:@-]{1,160}$/;

export function modeloValido(id) {
  return typeof id === 'string' && MODELO_ID_VALIDO.test(id);
}

// Converte a resposta bruta da API de modelos em [{ id, label }] só com os
// gratuitos, sem duplicatas, com o modelo padrão primeiro.
export function filtrarModelosGratis(provider, bruto) {
  const p = POR_ID[provider];
  if (!p?.modelos) return [];
  const unicos = [...new Map(p.modelos.filtro(bruto).map((m) => [m.id, m])).values()];
  return unicos.sort((a, b) => {
    if (a.id === p.padrao) return -1;
    if (b.id === p.padrao) return 1;
    return a.label.localeCompare(b.label, 'pt-BR');
  });
}

// Modelo escolhido por provedor, persistido em localStorage (PMRV_AI_MODEL_<provedor>).
export function obterModeloIA(provider) {
  const padrao = PMRV_MODELO_PADRAO[provider] || null;
  if (typeof window === 'undefined') return padrao;
  try {
    const salvo = localStorage.getItem(`PMRV_AI_MODEL_${provider}`);
    return modeloPermitido(provider, salvo) ? salvo : padrao;
  } catch {
    return padrao;
  }
}

export function definirModeloIA(provider, modelo) {
  if (typeof window === 'undefined' || !modeloPermitido(provider, modelo)) return;
  try {
    localStorage.setItem(`PMRV_AI_MODEL_${provider}`, modelo);
  } catch {
    /* armazenamento indisponível */
  }
}
