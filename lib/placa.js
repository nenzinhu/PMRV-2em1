// Consulta de placa (via /api/placa) → { modelo, cor }. Usada nas abas
// Envolvidos e Dinâmica. A credencial existe somente no servidor.

export function normalizarPlaca(raw) {
  const placa = (raw || '').trim().toUpperCase();
  return /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(placa) ? placa.replace('-', '') : placa;
}

export function placaConsultavel(placa) {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(placa));
}

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

export function normalizarDadosPlaca(data) {
  const bruto = data && typeof data === 'object' ? data : {};
  const extra = bruto.extra && typeof bruto.extra === 'object' ? bruto.extra : {};
  const marca = texto(bruto.MARCA) || texto(bruto.marca) || texto(extra.MARCA) || texto(extra.marca);
  const nomeModelo = texto(bruto.MODELO) || texto(bruto.modelo) || texto(extra.MODELO) || texto(extra.modelo);
  const marcaMaiuscula = marca.toLocaleUpperCase('pt-BR');
  const modeloMaiusculo = nomeModelo.toLocaleUpperCase('pt-BR');
  const modeloJaIncluiMarca =
    modeloMaiusculo === marcaMaiuscula ||
    [`${marcaMaiuscula} `, `${marcaMaiuscula}/`, `${marcaMaiuscula}-`].some((prefixo) => modeloMaiusculo.startsWith(prefixo));
  const modelo = marca && nomeModelo && !modeloJaIncluiMarca
    ? `${marca} ${nomeModelo}`
    : nomeModelo || marca;
  const cor = texto(bruto.cor) || texto(bruto.COR) || texto(extra.cor) || texto(extra.COR);
  return { modelo, cor };
}

export function aplicarDadosConsultados(lista, id, placaConsultada, dados) {
  const placaAlvo = normalizarPlaca(placaConsultada);
  return lista.map((envolvido) => {
    if (envolvido.id !== id || normalizarPlaca(envolvido.placa) !== placaAlvo) return envolvido;
    return {
      ...envolvido,
      modelo: texto(dados?.modelo),
      cor: texto(dados?.cor),
    };
  });
}

export async function consultarPlaca(placa) {
  const p = normalizarPlaca(placa);
  if (!placaConsultavel(p)) throw new Error('Placa inválida. Use o formato AAA0X00 ou AAA9999.');

  const resp = await fetch(`/api/placa?${new URLSearchParams({ placa: p })}`);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Erro ao consultar placa');

  const { modelo, cor } = normalizarDadosPlaca(data);
  if (!modelo && !cor) throw new Error('Placa sem dados de veículo.');
  return { modelo, cor };
}
