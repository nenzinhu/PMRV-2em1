// Registro de provedores de IA com plano GRATUITO e API compatível com OpenAI
// (POST /chat/completions com SSE). Adicionar um provedor = adicionar uma entrada.
//
// A lista "ao vivo" de modelos vem de /api/ai/models (consulta `modelos.url` no
// servidor e aplica `modelos.filtro`). `fallback` é usado quando a consulta falha
// (sem rede/chave) ou quando o provedor não tem listagem confiável dos gratuitos.
// Nenhum segredo aqui: só NOMES de variáveis de ambiente, resolvidas no servidor.
// `env` pode ser uma lista de nomes aceitos (o primeiro definido vence).
// A ORDEM da lista é a ordem do fallback automático entre provedores.
// `visao` lista os modelos GRATUITOS que leem imagens (aba Danos) — o primeiro
// é o padrão do provedor; `gratis` diz em que condição são grátis.
// `visaoAoVivo` filtra a listagem do provedor para achar os gratuitos com visão
// (o provedor recusa imagem em modelo só de texto, então dá para confiar nela).

// Exclui modelos que não são de chat de texto (embeddings, áudio, segurança...).
const NAO_CHAT =
  /embed|rerank|whisper|tts|speech|transcri|moderation|guard|safeguard|ocr|clip|reward|retriev|detector|orpheus|playai|distil-whisper|image|audio|flux|stable-diffusion/i;

const idsDe = (lista, campo = 'id') =>
  (lista || []).filter((m) => m?.[campo] && !NAO_CHAT.test(m[campo])).map((m) => ({ id: m[campo], label: m[campo] }));

export const PMRV_PROVEDORES_IA = [
  {
    id: 'groq',
    label: 'Groq',
    hint: 'Muito rápido; plano gratuito com limite diário',
    env: ['GROQ_API_KEY', 'GRoapi'],
    chatUrl: 'https://api.groq.com/openai/v1/chat/completions',
    tokensParam: 'max_completion_tokens',
    padrao: 'openai/gpt-oss-20b',
    gratis: 'Grátis com limite diário',
    // Llama 4 Scout/Maverick e Qwen 3.6 foram descontinuados no plano grátis (2026).
    visao: [
      {
        id: 'qwen/qwen3.8-27b',
        label: 'Qwen 3.8 27B',
        maxImagens: 3,
        descricao: 'Muito rápido, lê fotos e textos (placas, etiquetas). Aceita no máximo 3 fotos por análise.',
      },
    ],
    modelos: {
      url: 'https://api.groq.com/openai/v1/models',
      // Sistemas groq/compound* (ex.: compound-mini) ficam de fora.
      filtro: (b) => idsDe((b?.data || []).filter((m) => m.active !== false && !/compound/i.test(m.id))),
    },
    fallback: [
      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
      { id: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B' },
      { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B' },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    hint: 'Dezenas de modelos :free',
    env: 'OPENROUTER_API_KEY',
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    padrao: 'z-ai/glm-5.2:free',
    gratis: 'Modelos :free (≈200 pedidos/dia)',
    visao: [
      {
        id: 'openrouter/free',
        label: 'Roteador grátis',
        descricao: 'O OpenRouter escolhe sozinho um modelo gratuito que aceita imagem. Prático como reserva; o modelo varia a cada uso.',
      },
    ],
    visaoAoVivo: (b) =>
      (b?.data || [])
        .filter((m) => {
          const arq = m?.architecture || {};
          const gratis = m?.id?.endsWith(':free') || (m?.pricing?.prompt === '0' && m?.pricing?.completion === '0');
          return (
            gratis &&
            m.id !== 'openrouter/free' &&
            modeloValido(m.id) &&
            Array.isArray(arq.input_modalities) &&
            arq.input_modalities.includes('image') &&
            (!Array.isArray(arq.output_modalities) || arq.output_modalities.includes('text'))
          );
        })
        .map((m) => ({
          id: m.id,
          label: (m.name || m.id).replace(/\s*\(free\)$/i, ''),
          descricao: 'Gratuito no OpenRouter (lista ao vivo). Disponibilidade e limite variam; bom como reserva.',
        })),
    modelos: {
      url: 'https://openrouter.ai/api/v1/models',
      publico: true,
      filtro: (b) =>
        (b?.data || [])
          .filter((m) => {
            if (!m?.id) return false;
            const saida = m.architecture?.output_modalities;
            if (Array.isArray(saida) && !saida.includes('text')) return false;
            const gratis = m.pricing?.prompt === '0' && m.pricing?.completion === '0';
            return m.id.endsWith(':free') || m.id === 'openrouter/free' || gratis;
          })
          .map((m) => ({ id: m.id, label: m.name || m.id })),
    },
    fallback: [
      { id: 'z-ai/glm-5.2:free', label: 'GLM 5.2 (free)' },
      { id: 'openrouter/free', label: 'Auto — melhor modelo gratuito' },
      { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (free)' },
      { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free)' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral',
    hint: 'Plano Experiment: todos os modelos grátis',
    env: 'MISTRAL_API_KEY',
    chatUrl: 'https://api.mistral.ai/v1/chat/completions',
    padrao: 'mistral-small-latest',
    gratis: 'Grátis no plano Experiment',
    visao: [
      {
        id: 'mistral-small-latest',
        label: 'Mistral Small 4',
        maxImagens: 8,
        descricao: 'Recomendado. Rápido e preciso para identificar peças e tipos de dano. Até 8 fotos por análise.',
      },
      {
        id: 'mistral-medium-latest',
        label: 'Mistral Medium 3.5',
        maxImagens: 8,
        descricao: 'Mais atento a danos sutis (trincas, desalinhamento) e fotos com pouca luz. Um pouco mais lento. Até 8 fotos.',
      },
      {
        id: 'mistral-large-latest',
        label: 'Mistral Large 3',
        maxImagens: 8,
        descricao: 'O mais completo: texto mais técnico e detalhado. É o mais lento e gasta mais da cota grátis. Até 8 fotos.',
      },
    ],
    modelos: {
      url: 'https://api.mistral.ai/v1/models',
      filtro: (b) => idsDe((b?.data || []).filter((m) => m.capabilities?.completion_chat !== false)),
    },
    fallback: [
      { id: 'mistral-small-latest', label: 'Mistral Small' },
      { id: 'mistral-medium-latest', label: 'Mistral Medium' },
      { id: 'mistral-large-latest', label: 'Mistral Large' },
      { id: 'magistral-small-latest', label: 'Magistral Small (raciocínio)' },
      { id: 'ministral-8b-latest', label: 'Ministral 8B' },
      { id: 'open-mistral-nemo', label: 'Mistral Nemo' },
    ],
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    hint: 'Workers AI: 10 mil neurons/dia grátis',
    env: 'CLOUDFLARE_API_TOKEN',
    envExtra: 'CLOUDFLARE_ACCOUNT_ID',
    chatUrl: 'https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions',
    padrao: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    gratis: '10 mil neurons/dia grátis',
    visao: [
      {
        id: '@cf/meta/llama-4-scout-17b-16e-instruct',
        label: 'Llama 4 Scout',
        descricao: 'Lê fotos pela cota diária grátis da Cloudflare. Boa leitura geral; pode omitir detalhes pequenos.',
      },
      {
        id: '@cf/google/gemma-4-26b-a4b-it',
        label: 'Gemma 4 26B',
        descricao: 'Modelo do Google com visão, na cota grátis da Cloudflare. Descrições claras e objetivas.',
      },
    ],
    modelos: {
      url: 'https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/models/search?task=Text%20Generation&per_page=200',
      filtro: (b) => idsDe(b?.result, 'name'),
    },
    fallback: [
      { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B' },
      { id: '@cf/meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' },
      { id: '@cf/openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
      { id: '@cf/openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
      { id: '@cf/mistralai/mistral-small-3.1-24b-instruct', label: 'Mistral Small 3.1' },
      { id: '@cf/qwen/qwq-32b', label: 'QwQ 32B' },
    ],
  },
  {
    id: 'cohere',
    label: 'Cohere',
    hint: 'Chave trial grátis (1.000 req/mês)',
    env: 'COHERE_API_KEY',
    chatUrl: 'https://api.cohere.ai/compatibility/v1/chat/completions',
    padrao: 'command-a-03-2025',
    modelos: {
      url: 'https://api.cohere.com/v1/models?endpoint=chat&page_size=1000',
      filtro: (b) => idsDe(b?.models, 'name'),
    },
    fallback: [
      { id: 'command-a-03-2025', label: 'Command A' },
      { id: 'command-r-plus-08-2024', label: 'Command R+' },
      { id: 'command-r-08-2024', label: 'Command R' },
      { id: 'command-r7b-12-2024', label: 'Command R7B' },
    ],
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    hint: 'Router com créditos mensais grátis',
    env: ['HF_TOKEN', 'HUGGINGFACE_API_KEY'],
    chatUrl: 'https://router.huggingface.co/v1/chat/completions',
    padrao: 'openai/gpt-oss-120b',
    modelos: {
      url: 'https://router.huggingface.co/v1/models',
      publico: true,
      filtro: (b) => idsDe(b?.data),
    },
    fallback: [
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B' },
      { id: 'deepseek-ai/DeepSeek-V3.1', label: 'DeepSeek V3.1' },
    ],
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    hint: 'build.nvidia.com: grátis para prototipar',
    env: 'NVIDIA_API_KEY',
    chatUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    padrao: 'meta/llama-3.3-70b-instruct',
    modelos: {
      url: 'https://integrate.api.nvidia.com/v1/models',
      filtro: (b) => idsDe(b?.data),
    },
    fallback: [
      { id: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
      { id: 'deepseek-ai/deepseek-v3.1', label: 'DeepSeek V3.1' },
      { id: 'deepseek-ai/deepseek-r1', label: 'DeepSeek R1' },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
    ],
  },
  {
    id: 'zai',
    label: 'Z.ai (GLM)',
    hint: 'GLM Flash gratuito',
    env: 'ZAI_API_KEY',
    chatUrl: 'https://api.z.ai/api/paas/v4/chat/completions',
    padrao: 'glm-4.7-flash',
    gratis: 'Modelos Flash gratuitos',
    visao: [
      {
        id: 'glm-4.6v-flash',
        label: 'GLM 4.6V Flash',
        descricao: 'Gratuito (modelo leve de 9B). Rápido, mas menos detalhista; bom como reserva quando os outros estão sem cota.',
      },
    ],
    // Sem listagem pública dos gratuitos: só os Flash são free.
    modelos: null,
    fallback: [
      { id: 'glm-4.7-flash', label: 'GLM 4.7 Flash' },
      { id: 'glm-4.5-flash', label: 'GLM 4.5 Flash' },
      { id: 'glm-4.6v-flash', label: 'GLM 4.6V Flash (lê imagens)' },
    ],
  },
  {
    id: 'sambanova',
    label: 'SambaNova',
    hint: 'Plano gratuito limitado (poucas req/dia)',
    env: 'SAMBANOVA_API_KEY',
    chatUrl: 'https://api.sambanova.ai/v1/chat/completions',
    padrao: 'Meta-Llama-3.3-70B-Instruct',
    // A listagem inclui modelos pagos; o plano free cobre só estes.
    modelos: null,
    fallback: [
      { id: 'Meta-Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B' },
      { id: 'DeepSeek-V3.1', label: 'DeepSeek V3.1' },
      { id: 'gpt-oss-120b', label: 'GPT-OSS 120B' },
    ],
  },
  {
    id: 'aihubmix',
    label: 'AIHubMix',
    hint: 'Dezenas de modelos *-free',
    env: 'AIHUBMIX_API_KEY',
    chatUrl: 'https://aihubmix.com/v1/chat/completions',
    padrao: 'minimax-m3-free',
    modelos: {
      url: 'https://aihubmix.com/v1/models',
      filtro: (b) => idsDe((b?.data || []).filter((m) => /-free$/i.test(m?.id || ''))),
    },
    fallback: [
      { id: 'minimax-m3-free', label: 'MiniMax M3 (free)' },
      { id: 'coding-glm-5.1-free', label: 'GLM 5.1 (free)' },
      { id: 'coding-kimi-k3-free', label: 'Kimi K3 (free)' },
      { id: 'xiaomi-mimo-v2-pro-free', label: 'MiMo V2 Pro (free)' },
    ],
  },
  {
    id: 'anyapi',
    label: 'AnyAPI',
    hint: 'Modelos :free (200 req/dia)',
    env: ['ANYAPI_API_KEY', 'ANYAPI-KEY'],
    chatUrl: 'https://api.anyapi.ai/v1/chat/completions',
    padrao: 'meta-llama/llama-3.3-70b-instruct:free',
    modelos: {
      url: 'https://api.anyapi.ai/v1/models',
      filtro: (b) => idsDe((b?.data || []).filter((m) => (m?.id || '').endsWith(':free'))),
    },
    fallback: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
      { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra (free)' },
      { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano (free)' },
      { id: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder (free)' },
    ],
  },
  {
    id: 'orcarouter',
    label: 'OrcaRouter',
    hint: 'orcarouter/free escolhe o modelo grátis',
    env: 'ORCAROUTER_API_KEY',
    chatUrl: 'https://api.orcarouter.ai/v1/chat/completions',
    padrao: 'orcarouter/free',
    // A lista gratuita é rotativa; o alias orcarouter/free sempre aponta para ela.
    modelos: null,
    fallback: [{ id: 'orcarouter/free', label: 'Auto — modelo gratuito' }],
  },
  {
    id: 'modelscope',
    label: 'ModelScope',
    hint: '2.000 req/dia grátis (Qwen, DeepSeek…)',
    env: ['MODELSCOPE_API_KEY', 'MODEL_SCOPE_API'],
    chatUrl: 'https://api-inference.modelscope.cn/v1/chat/completions',
    padrao: 'Qwen/Qwen3-32B',
    modelos: {
      url: 'https://api-inference.modelscope.cn/v1/models',
      filtro: (b) => idsDe(b?.data),
    },
    fallback: [
      { id: 'Qwen/Qwen3-32B', label: 'Qwen3 32B' },
      { id: 'Qwen/Qwen3-235B-A22B', label: 'Qwen3 235B' },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3' },
    ],
  },
  {
    id: 'nous',
    label: 'Nous',
    hint: 'Catálogo gratuito rotativo (Hermes)',
    env: 'NOUS_API_KEY',
    chatUrl: 'https://inference-api.nousresearch.com/v1/chat/completions',
    padrao: 'Hermes-4-70B',
    modelos: {
      url: 'https://inference-api.nousresearch.com/v1/models',
      filtro: (b) => idsDe(b?.data),
    },
    fallback: [
      { id: 'Hermes-4-70B', label: 'Hermes 4 70B' },
      { id: 'Hermes-4-405B', label: 'Hermes 4 405B' },
    ],
  },
  {
    id: 'together',
    label: 'Together',
    hint: 'Usa créditos da conta (sem plano free)',
    env: 'TOGETHER_API_KEY',
    chatUrl: 'https://api.together.xyz/v1/chat/completions',
    padrao: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    modelos: {
      url: 'https://api.together.xyz/v1/models',
      // Resposta é uma lista; só modelos de chat.
      filtro: (b) => idsDe((Array.isArray(b) ? b : b?.data || []).filter((m) => !m?.type || m.type === 'chat')),
    },
    fallback: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo' },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3' },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B Turbo' },
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

/** O modelo pedido pode receber imagens? (heurística ou provedor que valida sozinho) */
export function aceitaImagem(provedor, modelo) {
  return modeloTemVisao(modelo) || Boolean(provedor?.visaoAoVivo && modeloValido(modelo));
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
    return modeloValido(salvo) ? salvo : padrao;
  } catch {
    return padrao;
  }
}

export function definirModeloIA(provider, modelo) {
  if (typeof window === 'undefined' || !modeloValido(modelo)) return;
  try {
    localStorage.setItem(`PMRV_AI_MODEL_${provider}`, modelo);
  } catch {
    /* armazenamento indisponível */
  }
}
