// Demais UFs sob demanda — um módulo por UF via import dinâmico.
// Padrão para novos UFs: lib/municipios/municipio-<UF>.js exportando
// `export const MUNICIPIOS = [...]` (gerado a partir da API do IBGE,
// ver scripts/gen-municipios.mjs).
const CARREGADORES = {
  AC: () => import('./municipios/municipio-AC'),
  AL: () => import('./municipios/municipio-AL'),
  AP: () => import('./municipios/municipio-AP'),
  AM: () => import('./municipios/municipio-AM'),
  BA: () => import('./municipios/municipio-BA'),
  CE: () => import('./municipios/municipio-CE'),
  DF: () => import('./municipios/municipio-DF'),
  ES: () => import('./municipios/municipio-ES'),
  GO: () => import('./municipios/municipio-GO'),
  MA: () => import('./municipios/municipio-MA'),
  MT: () => import('./municipios/municipio-MT'),
  MS: () => import('./municipios/municipio-MS'),
  MG: () => import('./municipios/municipio-MG'),
  PA: () => import('./municipios/municipio-PA'),
  PB: () => import('./municipios/municipio-PB'),
  PR: () => import('./municipios/municipio-PR'),
  PE: () => import('./municipios/municipio-PE'),
  PI: () => import('./municipios/municipio-PI'),
  RN: () => import('./municipios/municipio-RN'),
  RJ: () => import('./municipios/municipio-RJ'),
  RS: () => import('./municipios/municipio-RS'),
  RO: () => import('./municipios/municipio-RO'),
  RR: () => import('./municipios/municipio-RR'),
  SP: () => import('./municipios/municipio-SP'),
  SE: () => import('./municipios/municipio-SE'),
  TO: () => import('./municipios/municipio-TO'),
};

export async function carregarMunicipiosUF(uf) {
  const carregador = CARREGADORES[uf];
  if (!carregador) {
    throw new Error(`Sem dados de municípios para o UF ${uf}`);
  }
  const modulo = await carregador();
  const lista = modulo?.MUNICIPIOS;
  if (!Array.isArray(lista)) {
    throw new Error(`Chunk de municípios inválido para o UF ${uf}`);
  }
  return lista;
}

export const UFS_COM_DADOS = Object.keys(CARREGADORES);
