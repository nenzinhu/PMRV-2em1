// Aba Danos: fotos de veículos → descrição dos danos materiais pela IA.
// Os arquivos ficam no IndexedDB (foto-store); aqui só ids, textos e o prompt.

export const DANOS_STORAGE_KEY = 'PMRV_DANOS';
export const DANOS_MAX_FOTOS = 6;
// Marcador que o modelo devolve quando não recebeu/viu as imagens.
export const SEM_IMAGEM = 'SEM_IMAGEM';

export const DANOS_SYSTEM =
  'Você auxilia a Polícia Militar Rodoviária de Santa Catarina (PMRV-SC) a registrar danos materiais em ' +
  'veículos envolvidos em sinistros de trânsito. Descreve somente o que é visível nas fotos, com linguagem ' +
  'policial-administrativa formal, no português do Brasil, sem mencionar inteligência artificial.';

export function estadoDanosVazio() {
  return { fotos: [], envolvidoId: '', observacao: '', descricao: '' };
}

export function parseDanos(raw) {
  const vazio = estadoDanosVazio();
  if (typeof raw !== 'string' || !raw) return vazio;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return vazio;
    return {
      fotos: (Array.isArray(obj.fotos) ? obj.fotos : [])
        .filter((f) => f && typeof f.id === 'string')
        .slice(0, DANOS_MAX_FOTOS)
        .map((f) => ({ id: f.id })),
      envolvidoId: obj.envolvidoId == null ? '' : String(obj.envolvidoId),
      observacao: typeof obj.observacao === 'string' ? obj.observacao : '',
      descricao: typeof obj.descricao === 'string' ? obj.descricao : '',
    };
  } catch {
    return vazio;
  }
}

/** Só ids das fotos — o src (blob:) não sobrevive ao recarregar. */
export function serializeDanos(estado) {
  return JSON.stringify({
    fotos: (estado.fotos || []).filter((f) => f?.id).map((f) => ({ id: f.id })),
    envolvidoId: estado.envolvidoId || '',
    observacao: estado.observacao || '',
    descricao: estado.descricao || '',
  });
}

/** "Placa ABC1D23 · Gol · Branco (João)" — só com o que foi preenchido. */
export function descreverVeiculo(ev) {
  if (!ev || typeof ev !== 'object') return '';
  const partes = [
    ev.placa && `Placa ${String(ev.placa).trim()}`,
    ev.modelo && String(ev.modelo).trim(),
    ev.cor && String(ev.cor).trim(),
  ].filter(Boolean);
  const nome = typeof ev.nome === 'string' ? ev.nome.trim() : '';
  if (!partes.length) return nome;
  return nome ? `${partes.join(' · ')} (${nome})` : partes.join(' · ');
}

export function buildDanosPrompt({ quantidade, veiculo = '', observacao = '' }) {
  const n = Math.max(1, Number(quantidade) || 1);
  const linhas = [
    `Analise ${n === 1 ? 'a foto anexada' : `as ${n} fotos anexadas`} de veículo envolvido em sinistro de trânsito.`,
  ];
  if (veiculo.trim()) linhas.push(`Veículo informado pelo policial: ${veiculo.trim()}.`);
  if (observacao.trim()) linhas.push(`Observação do policial: ${observacao.trim()}`);
  linhas.push(
    '',
    'Descreva os danos materiais visíveis em um único parágrafo corrido, informando:',
    '- a região do veículo (dianteira, traseira, laterais, teto, vidros), indicando lado esquerdo/direito somente se for possível determinar pela imagem;',
    '- as peças atingidas (para-choque, capô, para-lama, portas, faróis, lanternas, retrovisores, rodas, para-brisa etc.);',
    '- a natureza e a intensidade (arranhão, amassamento, trinca, quebra, deformação leve, moderada ou severa) e vestígios visíveis, como transferência de tinta, fragmentos ou vazamento.',
    '',
    'Regras:',
    '- Não invente danos; o que não for possível confirmar pela foto deve ser dito assim ("não é possível confirmar pela imagem").',
    '- Não atribua culpa nem deduza dinâmica, velocidade ou causa do sinistro.',
    '- Não identifique pessoas e não cite placa que não esteja legível.',
    '- Responda apenas com o texto da descrição, sem títulos, listas ou comentários.',
    `- Se você não conseguir ver as imagens, responda somente: ${SEM_IMAGEM}`
  );
  return linhas.join('\n');
}

export function respostaSemImagem(texto) {
  return typeof texto === 'string' && texto.trim().toUpperCase().startsWith(SEM_IMAGEM);
}

/** Reduz para caber no lado maior `max`, mantendo a proporção. Nunca amplia. */
export function dimensoesAlvo(largura, altura, max = 1280) {
  const w = Number(largura) || 0;
  const h = Number(altura) || 0;
  if (w <= 0 || h <= 0) return { largura: 0, altura: 0 };
  const escala = Math.min(1, max / Math.max(w, h));
  return { largura: Math.round(w * escala), altura: Math.round(h * escala) };
}

/** Navegador: foto (Blob) → data URL JPEG comprimida para enviar à IA. */
export async function comprimirParaIA(blob, { max = 1280, qualidade = 0.8 } = {}) {
  const bitmap = await createImageBitmap(blob);
  try {
    const { largura, altura } = dimensoesAlvo(bitmap.width, bitmap.height, max);
    if (!largura) throw new Error('Imagem inválida');
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, largura, altura);
    return canvas.toDataURL('image/jpeg', qualidade);
  } finally {
    bitmap.close?.();
  }
}
