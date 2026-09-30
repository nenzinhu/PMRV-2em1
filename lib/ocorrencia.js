// A ocorrência como documento único (raiz agregada).
// Relato, Envolvidos, Danos, Resumo e referências de fotos passam a viver em
// UM registro (PMRV_OCORRENCIA), substituindo os 4 rascunhos soltos:
//   PMRV_RELATO_RASCUNHO, PMRV_ENVOLVIDOS, PMRV_DANOS, PMRV_RESUMO_DINAMICA
// Benefícios: "nova ocorrência" limpa tudo de uma vez, fotos deixam de ficar
// órfãs e o envio vira um dossiê só (relatório + envolvidos + resumo).
// Arquivo puro (sem DOM, sem React): qualquer teste cobre qualquer consumidor.

// ---------------------------------------------------------------- helpers

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);

/** Fotos válidas: objetos com id string não vazio (usado em envolvidos e danos). */
function fotosValidas(arr) {
  return Array.isArray(arr) ? arr.filter((f) => f && typeof f.id === 'string' && f.id) : [];
}

/** JSON.parse que devolve null em vez de lançar (bloco corrompido). */
function lerJSONSeguro(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Normaliza o bloco de resumo (compartilhado por normalizar e migrar). */
function normalizarResumo(bruto) {
  const resumo = obj(bruto) || {};
  const resumos = obj(resumo.resumos) || {};
  return {
    relatos: Array.isArray(resumo.relatos) ? resumo.relatos : [],
    resumo: typeof resumo.resumo === 'string' ? resumo.resumo : '',
    resumos: {
      tecnico: typeof resumos.tecnico === 'string' ? resumos.tecnico : '',
      policial: typeof resumos.policial === 'string' ? resumos.policial : '',
      leigo: typeof resumos.leigo === 'string' ? resumos.leigo : '',
    },
    estiloResumo: ['tecnico', 'policial', 'leigo'].includes(resumo.estiloResumo)
      ? resumo.estiloResumo
      : 'policial',
  };
}

// ---------------------------------------------------------------- documento

export const OCORRENCIA_VERSION = 2;

export function novaOcorrencia(id, agora = () => new Date()) {
  const t = agora().toISOString();
  return {
    version: OCORRENCIA_VERSION,
    id: id != null && String(id).trim() ? String(id) : `oc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    criadoEm: t,
    atualizadoEm: t,
    relato: { form: {}, step: 1, manualEdit: false, manualText: '' },
    envolvidos: [],
    danos: { fotos: [], envolvidoId: '', observacao: '', descricao: '' },
    resumo: {
      relatos: [],
      resumo: '',
      resumos: { tecnico: '', policial: '', leigo: '' },
      estiloResumo: 'policial',
    },
  };
}

/** Completa o que faltar sem inventar fatos — chaves ausentes continuam ausentes. */
export function normalizarOcorrencia(entrada, agora = () => new Date()) {
  const base = obj(entrada) || {};
  const o = { ...novaOcorrencia(base.id, agora), ...obj(base) };
  o.version = OCORRENCIA_VERSION;
  o.id = typeof base.id === 'string' && base.id.trim() ? base.id : o.id;
  o.criadoEm = typeof base.criadoEm === 'string' ? base.criadoEm : o.criadoEm;
  o.atualizadoEm = typeof base.atualizadoEm === 'string' ? base.atualizadoEm : o.criadoEm;

  const relato = obj(base.relato) || {};
  o.relato = {
    form: obj(relato.form) || {},
    step: Number.isFinite(relato.step) ? relato.step : 1,
    manualEdit: relato.manualEdit === true,
    manualText: typeof relato.manualText === 'string' ? relato.manualText : '',
  };

  o.envolvidos = Array.isArray(base.envolvidos)
    ? base.envolvidos.filter((e) => e && typeof e === 'object').map((e) => ({
        ...e,
        fotos: fotosValidas(e.fotos),
      }))
    : [];

  const danos = obj(base.danos) || {};
  o.danos = {
    fotos: fotosValidas(danos.fotos),
    envolvidoId: typeof danos.envolvidoId === 'string' ? danos.envolvidoId : '',
    observacao: typeof danos.observacao === 'string' ? danos.observacao : '',
    descricao: typeof danos.descricao === 'string' ? danos.descricao : '',
  };

  o.resumo = normalizarResumo(base.resumo);

  return o;
}

// ------------------------------------------------------------------ migração

// Chaves legadas (fonte da migração). Nomes exportados para os consumidores
// antigo continuarem funcionando durante a transição.
export const ENVOLVIDOS_KEY = 'PMRV_ENVOLVIDOS';
export const DANOS_LEGADO_KEY = 'PMRV_DANOS';
export const RESUMO_LEGADO_KEY = 'PMRV_RESUMO_DINAMICA';

/**
 * Migra os 4 rascunhos legados para o documento único.
 * Sem legado → null (a ocorrência nova é criada pelo provider, não aqui).
 * Nunca inventa data/hora: o merge do relato fica por conta do componente.
 */
export function migrarLegado(storage, parseRelatoDraft, parseDanos) {
  const relatoRaw = storage.getItem('PMRV_RELATO_RASCUNHO');
  const envolvidosRaw = storage.getItem(ENVOLVIDOS_KEY);
  const danosRaw = storage.getItem(DANOS_LEGADO_KEY);
  const resumoRaw = storage.getItem(RESUMO_LEGADO_KEY);
  if (relatoRaw == null && envolvidosRaw == null && danosRaw == null && resumoRaw == null) {
    return null;
  }

  const o = novaOcorrencia();

  const parsedRelato = relatoRaw ? parseRelatoDraft(relatoRaw) : null;
  if (parsedRelato) {
    o.relato = {
      form: obj(parsedRelato.form) || {},
      step: Number.isFinite(parsedRelato.step) ? parsedRelato.step : 1,
      manualEdit: parsedRelato.manualEdit === true,
      manualText: typeof parsedRelato.manualText === 'string' ? parsedRelato.manualText : '',
    };
  }

  if (envolvidosRaw) {
    const p = lerJSONSeguro(envolvidosRaw);
    o.envolvidos = Array.isArray(p?.lista)
      ? p.lista.filter((e) => e && typeof e === 'object').map((e) => ({
          ...e,
          fotos: fotosValidas(e.fotos),
        }))
      : [];
  }

  if (danosRaw && typeof parseDanos === 'function') {
    const d = lerJSONSeguro(danosRaw);
    if (d) {
      o.danos = {
        fotos: fotosValidas(d.fotos),
        envolvidoId: typeof d.envolvidoId === 'string' ? d.envolvidoId : '',
        observacao: typeof d.observacao === 'string' ? d.observacao : '',
        descricao: typeof d.descricao === 'string' ? d.descricao : '',
      };
    }
  }

  if (resumoRaw) {
    const r = lerJSONSeguro(resumoRaw);
    if (r) o.resumo = normalizarResumo(r);
  }

  return o;
}

// -------------------------------------------------------------------- dossiê

const PLACEHOLDER = '---';

/** Texto do bloco Envolvidos (resumo humano; o WhatsApp já usa envolvidosText). */
function blocoEnvolvidos(envolvidos) {
  if (!envolvidos.length) return '';
  return envolvidos
    .map((e, i) => {
      const nome = (e.nome || '').trim() || `Envolvido #${e.id ?? i + 1}`;
      const partes = [`${i + 1}. ${nome}`];
      if (e.placa) partes.push(`   Placa: ${e.placa}`);
      if (e.modelo) partes.push(`   Veículo: ${e.modelo}${e.cor ? ' — ' + e.cor : ''}`);
      const relato = (e.relato || '').trim();
      if (relato) partes.push(`   Relato: ${relato}`);
      return partes.join('\\n');
    })
    .join('\\n\\n');
}

/**
 * Dossiê completo da ocorrência: relatório + envolvidos + resumo + danos.
 * Um único texto pronto para WhatsApp/área de transferência/PMSC.
 */
export function montarDossie({ generateReport, envolvidosText } = {}, doc) {
  const o = normalizarOcorrencia(doc);
  const secoes = [];

  const relato =
    o.relato.manualEdit && o.relato.manualText.trim()
      ? o.relato.manualText
      : typeof generateReport === 'function'
        ? generateReport(o.relato.form, true)
        : '';
  if (relato && relato.trim()) secoes.push(relato.trim());

  const envTxt = typeof envolvidosText === 'function' ? envolvidosText(o.envolvidos) : '';
  if (envTxt && envTxt.trim()) secoes.push(envTxt.trim()); // já vem com o cabeçalho *ENVOLVIDOS*

  const resumo = (o.resumo.resumo || o.resumo.resumos?.[o.resumo.estiloResumo] || '').trim();
  if (resumo) secoes.push(`*RESUMO DA DINÂMICA*\\n\\n${resumo}`);

  const danosTxt = (o.danos.descricao || '').trim();
  if (danosTxt) secoes.push(`*DANOS MATERIAIS*\\n\\n${danosTxt}`);

  return secoes.join('\\n\\n--------------------\\n\\n');
}

/**
 * Dossiê + rodapé de rastreabilidade (versão do app e do modelo do documento).
 * Mantido separado do montarDossie para não sujar copiar/WhatsApp se o usuário
 * preferir o texto limpo.
 */
export function dossieVersionado(ferramentas, doc, rodape) {
  const corpo = montarDossie(ferramentas, doc);
  if (!corpo) return '';
  const o = normalizarOcorrencia(doc);
  return `${corpo}\\n\\n—\\n${rodape(o.version)}`;
}

// -------------------------------------------------------------------- export

export function baixarJSON(dados, nomeArquivo) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

/** SHA-256 hex de um objeto (backup verificável). Exige crypto.subtle (https/localhost). */
export async function hashJSON(dados) {
  const texto = JSON.stringify(dados);
  if (typeof crypto === 'undefined' || !crypto.subtle) return '';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const PLACEHOLDER_RELATORIO = PLACEHOLDER;
