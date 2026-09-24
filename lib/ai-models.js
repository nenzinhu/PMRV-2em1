// Catálogo de modelos GRATUITOS por provedor de IA.
//
// A lista "ao vivo" vem de /api/ai/models (consulta a API de cada provedor no
// servidor). As listas abaixo são o fallback quando a consulta falha (sem rede,
// sem chave, provedor fora do ar) — por isso contêm apenas IDs estáveis.

// Groq: groq/compound-mini foi descontinuado em 21/09/2026 → gpt-oss-20b.
export const PMRV_GROQ_MODEL = 'openai/gpt-oss-20b';
export const PMRV_OPENROUTER_MODEL = 'z-ai/glm-5.2:free';

export const PMRV_MODELO_PADRAO = {
  groq: PMRV_GROQ_MODEL,
  openrouter: PMRV_OPENROUTER_MODEL,
};

export const PMRV_MODELOS_FALLBACK = {
  groq: [
    { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
    { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
    { id: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B' },
    { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B' },
  ],
  openrouter: [
    { id: 'z-ai/glm-5.2:free', label: 'GLM 5.2 (free)' },
    { id: 'openrouter/free', label: 'Auto — melhor modelo gratuito' },
    { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (free)' },
    { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free)' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
  ],
};

// IDs aceitos vindos do cliente (evita repassar lixo ao provedor).
const MODELO_ID_VALIDO = /^[\w.\/:-]{1,120}$/;

export function modeloValido(id) {
  return typeof id === 'string' && MODELO_ID_VALIDO.test(id);
}

// Groq: todos os modelos de chat entram no plano gratuito (com limites).
// Exclui áudio (whisper/tts) e classificadores de segurança.
const GROQ_EXCLUIR = /whisper|tts|orpheus|playai|distil|guard|safeguard/i;

function ordenar(lista, padrao) {
  return lista.sort((a, b) => {
    if (a.id === padrao) return -1;
    if (b.id === padrao) return 1;
    return a.label.localeCompare(b.label, 'pt-BR');
  });
}

// Converte a resposta bruta de cada API de modelos em [{ id, label }] só com os gratuitos.
export function filtrarModelosGratis(provider, bruto) {
  let lista = [];

  if (provider === 'groq') {
    lista = (bruto?.data || [])
      .filter((m) => m?.id && m.active !== false && !GROQ_EXCLUIR.test(m.id))
      .map((m) => ({ id: m.id, label: m.id }));
  } else if (provider === 'openrouter') {
    lista = (bruto?.data || [])
      .filter((m) => {
        if (!m?.id) return false;
        const saida = m.architecture?.output_modalities;
        if (Array.isArray(saida) && !saida.includes('text')) return false;
        const gratis = m.pricing?.prompt === '0' && m.pricing?.completion === '0';
        return m.id.endsWith(':free') || m.id === 'openrouter/free' || gratis;
      })
      .map((m) => ({ id: m.id, label: m.name || m.id }));
  }

  const unicos = [...new Map(lista.map((m) => [m.id, m])).values()];
  return ordenar(unicos, PMRV_MODELO_PADRAO[provider]);
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
