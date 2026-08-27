// Lógica central do Relato Policial (PMRv Posto 19) — funções puras e helpers.
// Nada aqui toca o DOM diretamente; os componentes React leem/escrevem estado.

export const PMRV_DINAMICAS = {
  '1.1': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando atropelou um pedestre/ciclista.',
  '1.2': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando atropelou um animal.',
  '2.1': 'Quanto à dinâmica dos fatos, presume-se que os condutores @@ transitavam com seus veículos @@ no mesmo sentido, quando ocorreu abalroamento longitudinal.',
  '2.2': 'Quanto à dinâmica dos fatos, presume-se que os condutores @@ transitavam com seus veículos @@ em sentidos opostos, quando ocorreu abalroamento longitudinal.',
  '2.3': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando abalroou transversalmente o veículo @@.',
  '3.1': 'Quanto à dinâmica dos fatos, presume-se que os condutores @@ transitavam com seus veículos @@, quando colidiram frontalmente.',
  '3.2': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando colidiu na traseira do veículo @@.',
  '3.3': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando colidiu com outros veículos, ocasionando engavetamento.',
  '4.1': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando chocou-se contra um poste.',
  '4.6': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando chocou-se contra uma defensa.',
  '4.9': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando chocou-se contra [OBJETO].',
  '5.1': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando perdeu o controle direcional e saiu da pista.',
  '5.3': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando perdeu o controle direcional, saiu da pista e capotou.',
  '5.4': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando perdeu o controle direcional, saiu da pista e tombou.',
  '6.1': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando saiu da pista e chocou-se contra um poste.',
  '6.2': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando saiu da pista e chocou-se contra um muro.',
  '6.3': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando saiu da pista e chocou-se contra uma defensa.',
  '6.4': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, quando saiu da pista e chocou-se contra [OBJETO].',
  '7.1': 'Quanto à dinâmica dos fatos, presume-se que o condutor @@ transitava com seu veículo @@, registrada como [OUTROS].',
};

export const PMRV_SUBTIPOS = [
  { code: '1.1', label: 'Atropelamento de Pedestre/Ciclista', group: 'Atropelamento' },
  { code: '1.2', label: 'Atropelamento de Animal', group: 'Atropelamento' },
  { code: '2.1', label: 'Abalroamento Longitudinal (Mesmo Sentido)', group: 'Abalroamento' },
  { code: '2.2', label: 'Abalroamento Longitudinal (Sentidos Opostos)', group: 'Abalroamento' },
  { code: '2.3', label: 'Abalroamento Transversal', group: 'Abalroamento' },
  { code: '3.1', label: 'Colisão Frontal', group: 'Colisão' },
  { code: '3.2', label: 'Colisão Traseira', group: 'Colisão' },
  { code: '3.3', label: 'Colisão (Engavetamento)', group: 'Colisão' },
  { code: '4.1', label: 'Choque (Poste)', group: 'Choque' },
  { code: '4.6', label: 'Choque (Defensa)', group: 'Choque' },
  { code: '4.9', label: 'Choque (Objeto...)', group: 'Choque', objeto: true },
  { code: '5.1', label: 'Saída de Pista', group: 'Perda de Controle' },
  { code: '5.3', label: 'Capotamento', group: 'Perda de Controle' },
  { code: '5.4', label: 'Tombamento', group: 'Perda de Controle' },
  { code: '6.1', label: 'Saída de Pista + Choque (Poste)', group: 'Perda de Controle' },
  { code: '6.2', label: 'Saída de Pista + Choque (Muro)', group: 'Perda de Controle' },
  { code: '6.3', label: 'Saída de Pista + Choque (Defensa)', group: 'Perda de Controle' },
  { code: '6.4', label: 'Saída de Pista + Choque (Objeto...)', group: 'Perda de Controle', objeto: true },
  { code: '7.1', label: 'Outros (Especificar)', group: 'Diversos', outros: true },
];

// Rodovias oficiais de SC (Shapefile Rodovias_SC) — gerado em lib/rodovias-list.js
import { rodoviaLabel } from './rodovias-list';
export { RODOVIAS, RODOVIAS_GEOJSON_URL, rodoviaLabel, rodoviasDoSeletor } from './rodovias-list';

export const FLORIPA_RODOVIAS = [
  'SC-400', 'SC-401', 'SC-402', 'SC-403', 'SC-404', 'SC-405', 'SC-406',
  'ACESSO AEROPORTO INTERNACIONAL HERCÍLIO LUZ',
  'ACESSO FLORIANÓPOLIS (TAPERA)',
  'Pte. Gov. Colombo Salles', 'Pte. Gov. Pedro Ivo Campos', 'Pte. Hercílio Luz',
  'TIC01', 'TIC02', 'TIC03',
  'P. Hercílio Luz', 'P. C. Machado Salles', 'P. Pedro Ivo Campos',
];

export const PMRV_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const PMRV_FOTO_SLOTS = [
  { key: 'veic_frente', label: 'Veículo — Frontal', angulo: 'Frontal', veiculo: true },
  { key: 'veic_tras', label: 'Veículo — Traseira', angulo: 'Traseira', veiculo: true },
  { key: 'veic_esq', label: 'Veículo — Vista Esquerda', angulo: 'Vista Esquerda', veiculo: true },
  { key: 'veic_dir', label: 'Veículo — Vista Direita', angulo: 'Vista Direita', veiculo: true },
  { key: 'local_1', label: 'Local — Foto 1' },
  { key: 'local_2', label: 'Local — Foto 2' },
];

export const PMRV_ANGULOS = ['Frontal', 'Traseira', 'Vista Direita', 'Vista Esquerda'];

export const PMRV_GROQ_MODEL = 'groq/compound-mini';

export const PMRV_AGENTE_PADRAO =
  'Analise o relato que será apresentado a seguir. Identifique, de forma clara e objetiva, a sequência cronológica dos acontecimentos, as causas principais do acidente e as consequências materiais ou pessoais descritas. Apresente o resultado em texto corrido, mantendo linguagem formal e sem incluir termos técnicos de programação ou referências a inteligência artificial.\n\n(Este prompt deve ser usado antes de cada novo relato que o modelo precisar analisar.)';

export const PMRV_ESTILOS_IA = {
  juridica:
    'JURÍDICO: linguagem formal jurídico-policial, com vocabulário técnico-jurídico adequado a documentos oficiais, descrevendo conduta e nexo causal. Cite dispositivos do Código de Trânsito Brasileiro (CTB) apenas se claramente aplicáveis aos fatos informados.',
  leiga:
    'LEIGO: linguagem simples, clara e direta, sem jargões policiais ou jurídicos, de forma que qualquer cidadão compreenda facilmente o que aconteceu.',
  tecnica:
    'TÉCNICO: terminologia de perícia de trânsito e dinâmica veicular (trajetória, ponto de impacto, perda de aderência, energia cinética), com descrição objetiva e precisa.',
};

// --- Formatadores (string -> string) ---

export function formatKM(value) {
  let v = (value || '').replace(/\D/g, '').substring(0, 5);
  if (v.length > 2) v = v.substring(0, 2) + ',' + v.substring(2);
  return v;
}

export function formatSade(value) {
  return (value || '').replace(/\D/g, '').substring(0, 9);
}

export function formatVtr(value) {
  return (value || '').replace(/\D/g, '').substring(0, 4);
}

export function formatCPF(value) {
  let v = (value || '').replace(/\D/g, '').substring(0, 11);
  if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/^(\d{3})(\d{3})$/, '$1.$2');
  return v;
}

export function formatTelefone(value) {
  let v = (value || '').replace(/\D/g, '').substring(0, 11);
  if (v.length > 2) v = '(' + v.substring(0, 2) + ')' + v.substring(2);
  return v;
}

export function formatNome(value) {
  let v = (value || '').toLowerCase();
  v = v.replace(/\b\w/g, (c) => c.toUpperCase());
  return v;
}

// Substantivos próprios conhecidos (cidades, bairros e lugares de SC) — mantidos
// com a grafia correta independente de onde aparecem na frase.
const PMRV_PROPER_NOUNS = [
  'Florianópolis', 'Biguaçu', 'Antônio Carlos', 'São José', 'São Pedro de Alcântara',
  'Palhoça', 'Tijucas', 'Governador Celso Ramos', 'Santo Amaro da Imperatriz',
  'Brusque', 'Blumenau', 'Joinville', 'Balneário Camboriú', 'Itajaí', 'Chapecó',
  'Criciúma', 'Lages', 'Tubarão', 'Jaraguá do Sul', 'Canoinhas', 'São João',
  'Santa Catarina', 'Brasil', 'SC', 'BR',
  'Canasvieiras', 'Ingleses', 'Ratones', 'Jurerê', 'Jurerê Internacional',
  'Lagoa da Conceição', 'Barra da Lagoa', 'Rio Tavares', 'Campeche', 'Carianos',
  'Pântano do Sul', 'Costeira do Pirajubaé', 'Itacorubi', 'Trindade', 'Coqueiros',
  'Estreito', 'Santa Mônica', 'Saco dos Limões', 'Cacupé', 'Sambaqui',
  'Ribeirão da Ilha', 'Pantanal',
];

// Aplica: primeira letra da frase em maiúscula, início de frase após . ! ? em
// maiúscula, e substantivos próprios (cidades/bairros) com a grafia correta.
export function capitalizarFrase(value) {
  if (!value) return value;
  let v = value;
  // Primeira letra da string
  v = v.replace(/^\s*([a-zà-ú])/, (m, c) => c.toUpperCase());
  // Início de frase após . ! ?
  v = v.replace(/(^|[.!?]\s+)([a-zà-ú])/g, (m, p, c) => p + c.toUpperCase());
  // Substantivos próprios (cidades, bairros, nomes de lugares)
  PMRV_PROPER_NOUNS.forEach((p) => {
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + esc + '\\b', 'gi');
    v = v.replace(re, p);
  });
  // Padrões "São X" / "Santa X" genéricos
  v = v.replace(/\b(são|santa)\s+([a-zà-ú])/gi, (m, s, c) => {
    const art = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return art + ' ' + c.toUpperCase();
  });
  return v;
}

export function formatPlacaValue(tipo, raw) {
  let v = (raw || '').toUpperCase().replace(/\s/g, '');
  if (tipo === 'estrangeira') return v;
  if (tipo === 'mercosul') {
    v = v.replace(/[^A-Z0-9]/g, '').substring(0, 7);
    const m = v.match(/^([A-Z]{0,3})(\d{0,1})([A-Z]{0,1})(\d{0,2})/);
    return m ? m[1] + m[2] + m[3] + m[4] : '';
  }
  v = v.replace(/[^A-Z0-9]/g, '').substring(0, 7);
  v = v.replace(/^([A-Z]{0,3})(\d{0,4}).*$/, (m, a, b) => (a || '') + (b || ''));
  return v;
}

// --- Geração do relatório ---

export function subtipoLabel(form) {
  if (form.subtipo === '7.1') return form.outros || 'Outros';
  const entry = PMRV_SUBTIPOS.find((s) => s.code === form.subtipo);
  return entry ? entry.label : '---';
}

/** ISO YYYY-MM-DD do fato → pt-BR. Vazio ou formato estranho vira --- (não usa o relógio). */
function dataCalendarioValida(ano, mes, dia) {
  const y = Number(ano);
  const m = Number(mes);
  const d = Number(dia);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function formatDataFato(value) {
  if (typeof value !== 'string') return '---';
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso && dataCalendarioValida(iso[1], iso[2], iso[3])) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br && dataCalendarioValida(br[3], br[2], br[1])) {
    return `${br[1]}/${br[2]}/${br[3]}`;
  }
  return '---';
}

/** Dígitos → dd/mm/aaaa enquanto o policial digita. Não completa data. */
export function maskDataFatoBr(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** dd/mm/aaaa ou ISO válido → YYYY-MM-DD. Incompleto ou inválido → string vazia. */
export function parseDataFatoBr(raw) {
  if (typeof raw !== 'string') return '';
  const t = raw.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso && dataCalendarioValida(iso[1], iso[2], iso[3])) return t;
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br && dataCalendarioValida(br[3], br[2], br[1])) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }
  return '';
}

/** Valor visível do campo: ISO vira dd/mm/aaaa; rascunho incompleto permanece como digitado. */
export function dataFatoFieldValue(value) {
  if (typeof value !== 'string' || !value) return '';
  const br = formatDataFato(value);
  if (br !== '---') return br;
  return value.includes('/') || /^\d{1,8}$/.test(value.replace(/\D/g, '')) ? maskDataFatoBr(value) : '';
}

/** Relógio injetável, fuso local. Não converte por UTC. */
export function nowFato(clock = () => new Date()) {
  const d = clock();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return { dataFato: `${y}-${mo}-${da}`, horaFato: `${h}:${mi}` };
}

export function generateReport(form, bold = false) {
  const b = bold ? '*' : '';
  const sade = form.sade || '---';
  const vtr = form.vtr || '---';
  const cidade = form.cidade || '---';
  const rodovia = rodoviaLabel(form.rodovia) || form.rodovia || '---';
  const km = form.km || '---';
  const conhc = form.conhecimento || 'pela Central';
  const ocorr = form.ocorrencia || 'Sinistro de trânsito com danos materiais';
  const dinamica = form.dinamica || '';
  const sentido =
    form.sentido === 'MANUAL' ? form.sentidoManual || '' : form.sentido || '---';
  const tipoLabel = subtipoLabel(form);

  let infoV = '';
  if (ocorr === 'Sinistro de trânsito com vítima(s)') {
    const l = parseInt(form.qtdLeve) || 0;
    const g = parseInt(form.qtdGrave) || 0;
    const gs = parseInt(form.qtdGravissima) || 0;
    const partes = [];
    if (l > 0) partes.push(`${String(l).padStart(2, '0')} leve(s)`);
    if (g > 0) partes.push(`${String(g).padStart(2, '0')} grave(s)`);
    if (gs > 0) partes.push(`${String(gs).padStart(2, '0')} gravíssima(s)`);
    infoV =
      partes.length > 0
        ? `\n${b}Vítimas:${b} ${partes.join(', ')}`
        : `\n${b}Vítimas:${b} Sem registro de quantidades`;
  }

  const hora =
    form.horaTipo === 'manual'
      ? form.horaManual || '---'
      : form.horaFato || '---';

  return (
    `${b}COMANDO DE POLÍCIA MILITAR RODOVIÁRIA${b}\n` +
    `${b}1º BPMRv / 1ª CIA / Posto 19${b}\n` +
    `${b}Protocolo SADE:${b} ${sade}\n` +
    `${b}Data:${b} ${formatDataFato(form.dataFato)}\n` +
    `${b}Hora:${b} ${hora}\n` +
    `${b}Rodovia:${b} ${rodovia} / ${b}KM:${b} ${km}\n` +
    `${b}Cidade:${b} ${cidade}\n` +
    `${b}Tipo de ocorrência:${b} ${ocorr}\n` +
    `${b}Tipo de sinistro:${b} ${tipoLabel}${infoV}\n\n` +
    `A guarnição foi acionada ${conhc} para atendimento de sinistro na rodovia ${rodovia}, km ${km}, sentido ${sentido || '---'}, sendo empenhada a Viatura PM-${vtr}.\n` +
    `${dinamica}\n\n` +
    `Foram adotadas as providências administrativas cabíveis.`
  );
}

export function buildIAPrompt(form, estilo) {
  const ocorr = form.ocorrencia;
  const rodovia = rodoviaLabel(form.rodovia) || form.rodovia || '---';
  const km = form.km || '---';
  const cidade = form.cidade || '---';
  const sentido =
    form.sentido === 'MANUAL' ? form.sentidoManual || '' : form.sentido || '---';
  const dinamica = form.dinamica || '(sem descrição preenchida)';
  const tipoLabel = subtipoLabel(form);

  let vitimas = 'sem vítimas (apenas danos materiais)';
  if (ocorr === 'Sinistro de trânsito com vítima(s)') {
    const l = parseInt(form.qtdLeve) || 0;
    const g = parseInt(form.qtdGrave) || 0;
    const gs = parseInt(form.qtdGravissima) || 0;
    const partes = [];
    if (l > 0) partes.push(`${l} leve(s)`);
    if (g > 0) partes.push(`${g} grave(s)`);
    if (gs > 0) partes.push(`${gs} óbito(s)`);
    vitimas = partes.length > 0 ? partes.join(', ') : 'com vítima(s), quantidades não informadas';
  }

  return (
    'Você é um redator de relatórios da Polícia Militar Rodoviária de Santa Catarina.\n' +
    `Reescreva a descrição da dinâmica do sinistro de trânsito abaixo no estilo ${PMRV_ESTILOS_IA[estilo]}\n\n` +
    'Dados da ocorrência:\n' +
    `- Classificação: ${ocorr}\n` +
    `- Tipo de sinistro: ${tipoLabel}\n` +
    `- Local: rodovia ${rodovia}, km ${km}, ${cidade}, sentido ${sentido || '---'}\n` +
    `- Vítimas: ${vitimas}\n` +
    `- Descrição atual da dinâmica: "${dinamica}"\n\n` +
    'Regras obrigatórias:\n' +
    '- Responda APENAS com o parágrafo reescrito, sem título, sem markdown e sem aspas.\n' +
    '- Um único parágrafo, em português do Brasil.\n' +
    '- Mantenha o tom presuntivo ("presume-se"), pois a guarnição não presenciou os fatos.\n' +
    '- Não invente fatos que não estejam nos dados acima. Preserve os marcadores @@ caso existam no texto original.'
  );
}

export function reviewReportPrompt(text) {
  return (
    'Você é um revisor de documentos oficiais da Polícia Militar.\n' +
    'Revise o relatório abaixo corrigindo APENAS erros de ortografia, acentuação, concordância verbal/nominal, regência e pontuação, conforme a norma culta do português do Brasil exigida em documentos oficiais.\n\n' +
    'Regras obrigatórias:\n' +
    '- NÃO altere dados: números, protocolo, datas, horas, quilometragem, siglas (SADE, PM, BPMRv, SC-401 etc.) e nomes.\n' +
    '- NÃO altere a estrutura: mantenha as mesmas linhas, quebras de linha e os asteriscos (*) exatamente onde estão (são marcadores de negrito).\n' +
    '- NÃO reescreva frases nem mude o estilo do texto; corrija somente o que estiver errado.\n' +
    '- Responda SOMENTE com JSON válido no formato: {"texto_corrigido": "...", "correcoes": ["descrição curta de cada correção feita"]}\n' +
    '- Se não houver nenhum erro, devolva o texto original e a lista "correcoes" vazia.\n\n' +
    'Relatório:\n' + text
  );
}

export function envolvidosText(list) {
  if (!list || list.length === 0) return '';
  let txt = '*ENVOLVIDOS*\n\n';
  list.forEach((ev) => {
    txt += `Envolvido #${ev.id}\n`;
    txt += `Nome: ${ev.nome || '---'}\n`;
    txt += `CPF: ${ev.cpf || '---'}\n`;
    txt += `UF: ${ev.uf || '---'}  Cidade: ${ev.cidade || '---'}\n`;
    txt += `Endereço: ${ev.endereco || '---'}\n`;
    txt += `Telefone: ${ev.telefone || '---'}\n`;
    txt += `Veículo: ${ev.placa || '---'} (${ev.modelo || '---'}) [${ev.placa_tipo || 'br'}]\n`;
    txt += `Relato: ${ev.relato || '---'}\n`;
    const fotos = Array.isArray(ev.fotos) ? ev.fotos : [];
    if (fotos.length) {
      txt += `Fotos: ${fotos.length}\n`;
    } else {
      txt += 'Fotos: nenhuma\n';
    }
    txt += '\n';
  });
  return txt;
}

// --- IA (Groq) ---

// A chave real fica no servidor (.env.local / GROQ_API_KEY) e NUNCA vai ao
// navegador. Esta função só lida com um override opcional que o usuário informa
// pelo botão 🔑 (salvo em localStorage) — se vazio, o servidor usa a chave padrão.
export function obterChaveIA(forcarNova = false) {
  if (typeof window === 'undefined') return '';
  let chave = localStorage.getItem('PMRV_GROQ_KEY') || '';
  if (forcarNova) {
    chave = window.prompt(
      'Chave Groq opcional (deixe em branco para usar a chave do servidor):',
      chave || ''
    );
    if (chave !== null) {
      chave = chave.trim();
      localStorage.setItem('PMRV_GROQ_KEY', chave);
    }
  }
  return chave;
}

export function cleanIAResponse(texto) {
  if (!texto) return '';
  return texto.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export function extractJSON(texto) {
  const limpo = cleanIAResponse(texto);
  const match = limpo.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Nenhum JSON retornado pela IA');
  return JSON.parse(match[0]);
}

export async function callGroq({
  apiKey = '',
  prompt,
  system = null,
  onToken = null,
  temperature = 1,
  maxTokens = 2048,
}) {
  const resp = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, prompt, system, temperature, maxTokens }),
  });

  if (resp.status === 400) return { error: 'invalid' };
  if (resp.status === 500) {
    // Sem chave configurada (nem .env.local nem override do usuário).
    return { error: 'nokey' };
  }
  if (resp.status === 401 || resp.status === 403) {
    return { error: 'auth' };
  }
  if (resp.status === 429) {
    return { error: 'quota' };
  }
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let textoCompleto = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const linhas = buffer.split('\n');
    buffer = linhas.pop() || '';
    for (const linha of linhas) {
      const l = linha.trim();
      if (!l.startsWith('data:')) continue;
      const payload = l.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        const delta = obj.choices?.[0]?.delta?.content || '';
        if (delta) {
          textoCompleto += delta;
          if (onToken) onToken(delta, textoCompleto);
        }
      } catch (e) {
        /* linha parcial — ignora */
      }
    }
  }

  textoCompleto = cleanIAResponse(textoCompleto);
  if (!textoCompleto) throw new Error('Resposta vazia da IA');
  return { text: textoCompleto };
}
