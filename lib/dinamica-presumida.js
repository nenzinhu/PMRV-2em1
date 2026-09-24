// Relato individual + dinâmica presumida (aba "Dinâmica").
// O policial digita o relato do envolvido 1 (e, se quiser, dos demais); a IA
// presume os relatos que ficaram em branco e a dinâmica do ocorrido.

import { extractJSON } from './pmrv';
import { obterEstiloRelato } from './estilos-relato';

export const DINAMICA_PRESUMIDA_KEY = 'PMRV_DINAMICA_PRESUMIDA';

export function novoEnvolvidoDinamica(id) {
  return { id, identificacao: '', relato: '', presumido: false };
}

export function estadoInicialDinamica() {
  return {
    apenasUm: false,
    estilo: 'policial',
    envolvidos: [novoEnvolvidoDinamica(1), novoEnvolvidoDinamica(2)],
    dinamica: '',
  };
}

// Aceita apenas estruturas válidas vindas do localStorage.
export function normalizarEstadoDinamica(bruto) {
  const base = estadoInicialDinamica();
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return base;
  const envolvidos = Array.isArray(bruto.envolvidos)
    ? bruto.envolvidos
        .filter((e) => e && Number.isFinite(e.id))
        .map((e) => ({
          id: e.id,
          identificacao: typeof e.identificacao === 'string' ? e.identificacao : '',
          relato: typeof e.relato === 'string' ? e.relato : '',
          presumido: e.presumido === true,
        }))
    : [];
  return {
    apenasUm: bruto.apenasUm === true,
    estilo: obterEstiloRelato(bruto.estilo).id,
    envolvidos: envolvidos.length ? envolvidos : base.envolvidos,
    dinamica: typeof bruto.dinamica === 'string' ? bruto.dinamica : '',
  };
}

// Relato em branco ou presumido pela IA (e não editado) → a IA (re)presume.
export function precisaPresumir(env) {
  return !env.relato.trim() || env.presumido;
}

function rotulo(env, i) {
  const ident = env.identificacao.trim();
  return `Envolvido ${i + 1}${ident ? ` (${ident})` : ''}`;
}

// Envolvidos considerados na geração (só o 1º quando "apenas 1").
export function envolvidosAtivos(estado) {
  return estado.apenasUm ? estado.envolvidos.slice(0, 1) : estado.envolvidos;
}

export function buildDinamicaPrompt(estado) {
  const ativos = envolvidosAtivos(estado);
  const estilo = obterEstiloRelato(estado.estilo);
  const aPresumir = estado.apenasUm ? [] : ativos.map((e, i) => (precisaPresumir(e) ? i + 1 : null)).filter(Boolean);

  const blocos = ativos
    .map((e, i) => `${rotulo(e, i)}: ${precisaPresumir(e) ? '[SEM RELATO — PRESUMIR]' : `"${e.relato.trim()}"`}`)
    .join('\n');

  const tarefa = estado.apenasUm
    ? 'Sinistro com UM único envolvido (ex.: saída de pista, colisão com objeto fixo, capotamento). Redija a dinâmica presumida a partir do relato.'
    : `Sinistro com ${ativos.length} envolvidos. ` +
      (aPresumir.length
        ? `Presuma o relato dos envolvidos ${aPresumir.join(', ')} de forma coerente com os relatos informados ` +
          '(a versão mais provável daquele envolvido, na mesma forma e pessoa verbal dos relatos informados), e '
        : '') +
      'redija a dinâmica presumida unificando todos os relatos, sem tomar partido.';

  return (
    'Você é um redator de relatórios da Polícia Militar Rodoviária de Santa Catarina.\n\n' +
    `${tarefa}\n\n` +
    `Estilo: ${estilo.instrucao}\n\n` +
    'Relatos:\n' +
    `${blocos}\n\n` +
    'Regras obrigatórias:\n' +
    '- Não invente placas, nomes, lesões, velocidades ou fatos que não decorram dos relatos.\n' +
    '- A dinâmica deve ter tom presuntivo ("presume-se"), pois a guarnição não presenciou os fatos.\n' +
    '- Português do Brasil, um parágrafo por texto, sem markdown.\n' +
    '- Responda SOMENTE com JSON válido neste formato:\n' +
    '{"relatos":[{"envolvido":<número>,"texto":"<relato presumido>"}],"dinamica":"<dinâmica presumida>"}\n' +
    (aPresumir.length
      ? `- Em "relatos", inclua apenas os envolvidos ${aPresumir.join(', ')}.`
      : '- "relatos" deve ser uma lista vazia.')
  );
}

// Valida a resposta da IA e aplica ao estado: preenche SÓ os relatos em branco
// ou presumidos (marcados como presumidos) e a dinâmica. Relatos digitados
// nunca são alterados.
export function aplicarRespostaDinamica(estado, textoIA) {
  const json = extractJSON(textoIA);
  const dinamica = typeof json.dinamica === 'string' ? json.dinamica.trim() : '';
  if (!dinamica) throw new Error('Resposta da IA sem dinâmica');

  const presumidos = new Map();
  if (Array.isArray(json.relatos)) {
    for (const r of json.relatos) {
      const n = Number(r?.envolvido);
      if (Number.isInteger(n) && typeof r.texto === 'string' && r.texto.trim()) presumidos.set(n, r.texto.trim());
    }
  }

  const ativos = envolvidosAtivos(estado).length;
  const envolvidos = estado.envolvidos.map((e, i) => {
    if (i >= ativos || !precisaPresumir(e)) return e;
    const t = presumidos.get(i + 1);
    return t ? { ...e, relato: t, presumido: true } : e;
  });
  return { ...estado, envolvidos, dinamica };
}
