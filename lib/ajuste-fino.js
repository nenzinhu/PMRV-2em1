// "Ajuste fino" da geração de relatos.
//
// Os planos gratuitos dos provedores não permitem treinar (fine-tune) modelos,
// então o ajuste é feito por instruções: criatividade (temperatura), tamanho,
// instruções fixas do redator e um relato-modelo que a IA deve imitar (few-shot).
// Vale para todas as gerações de relato/dinâmica. Persistido em localStorage.
// Além do ajuste geral, cada tipo de ocorrência (código do PMRV_SUBTIPOS, ex.
// "3.2", "9.3") pode ter instruções e relato-modelo próprios, que se somam ao geral.

export const AJUSTE_FINO_KEY = 'PMRV_AJUSTE_FINO';
// Disparado quando o ajuste é salvo fora do painel (ex.: botão ⭐ do Relato Policial).
export const AJUSTE_FINO_EVENTO = 'pmrv-ajuste-fino';

export const TAMANHOS = [
  { id: 'curto', label: 'Curto', instrucao: 'Seja conciso: no máximo 3 frases por texto.' },
  { id: 'medio', label: 'Médio', instrucao: 'Tamanho moderado: um parágrafo de 4 a 7 frases por texto.' },
  { id: 'detalhado', label: 'Detalhado', instrucao: 'Seja detalhado: descreva cada etapa do ocorrido, em um parágrafo completo.' },
];

export const AJUSTE_FINO_PADRAO = {
  temperatura: 0.3,
  tamanho: 'medio',
  instrucoes: '',
  exemplo: '',
  porOcorrencia: {},
};

const CODIGO_OCORRENCIA = /^\d{1,2}\.\d{1,2}$/;

const LIMITE_TEXTO = 4000;

function texto(v) {
  return typeof v === 'string' ? v.slice(0, LIMITE_TEXTO) : '';
}

// Normaliza qualquer valor (inclusive JSON corrompido) para um ajuste válido.
export function normalizarAjusteFino(bruto) {
  const obj = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : {};
  const t = Number(obj.temperatura);
  return {
    temperatura: Number.isFinite(t) ? Math.min(1, Math.max(0, Math.round(t * 10) / 10)) : AJUSTE_FINO_PADRAO.temperatura,
    tamanho: TAMANHOS.some((x) => x.id === obj.tamanho) ? obj.tamanho : AJUSTE_FINO_PADRAO.tamanho,
    instrucoes: texto(obj.instrucoes),
    exemplo: texto(obj.exemplo),
    porOcorrencia: normalizarPorOcorrencia(obj.porOcorrencia),
  };
}

// Mantém só códigos válidos com algum conteúdo (tipos vazios não ocupam espaço).
function normalizarPorOcorrencia(bruto) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {};
  const saida = {};
  for (const [codigo, v] of Object.entries(bruto)) {
    if (!CODIGO_OCORRENCIA.test(codigo) || !v || typeof v !== 'object') continue;
    const item = { instrucoes: texto(v.instrucoes), exemplo: texto(v.exemplo) };
    if (item.instrucoes.trim() || item.exemplo.trim()) saida[codigo] = item;
  }
  return saida;
}

// Ajuste específico de um tipo de ocorrência (vazio se não houver).
export function ajusteDaOcorrencia(ajuste, codigo) {
  return normalizarAjusteFino(ajuste).porOcorrencia[codigo] || { instrucoes: '', exemplo: '' };
}

export function carregarAjusteFino(storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return { ...AJUSTE_FINO_PADRAO };
  try {
    return normalizarAjusteFino(JSON.parse(store.getItem(AJUSTE_FINO_KEY) || 'null'));
  } catch {
    return { ...AJUSTE_FINO_PADRAO };
  }
}

// Salva o texto como relato-modelo de um tipo de ocorrência e avisa os painéis abertos.
export function salvarModeloDaOcorrencia(codigo, exemplo, storage) {
  const atual = carregarAjusteFino(storage);
  const tipo = ajusteDaOcorrencia(atual, codigo);
  const salvo = salvarAjusteFino({ ...atual, porOcorrencia: { ...atual.porOcorrencia, [codigo]: { ...tipo, exemplo } } }, storage);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AJUSTE_FINO_EVENTO));
  return salvo;
}

export function salvarAjusteFino(ajuste, storage) {
  const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  const normal = normalizarAjusteFino(ajuste);
  try {
    store?.setItem(AJUSTE_FINO_KEY, JSON.stringify(normal));
  } catch {
    /* armazenamento indisponível */
  }
  return normal;
}

// Acrescenta ao prompt as preferências do redator. Com `codigoOcorrencia`,
// inclui também as do tipo; o relato-modelo do tipo tem prioridade sobre o geral.
export function aplicarAjusteFino(prompt, ajuste, codigoOcorrencia = null) {
  const a = normalizarAjusteFino(ajuste);
  const tipo = (codigoOcorrencia && a.porOcorrencia[codigoOcorrencia]) || { instrucoes: '', exemplo: '' };
  const partes = [TAMANHOS.find((x) => x.id === a.tamanho).instrucao];
  if (a.instrucoes.trim()) partes.push(`Instruções do redator (siga sempre): ${a.instrucoes.trim()}`);
  if (tipo.instrucoes.trim()) partes.push(`Instruções para este tipo de ocorrência (siga sempre): ${tipo.instrucoes.trim()}`);
  const exemplo = tipo.exemplo.trim() || a.exemplo.trim();
  if (exemplo) {
    partes.push(
      'Relato-modelo do redator — imite o estilo, o vocabulário e a estrutura, mas NUNCA copie os fatos dele:\n' +
        `"""${exemplo}"""`
    );
  }
  return `${prompt}\n\nPreferências de redação:\n- ${partes.join('\n- ')}`;
}
