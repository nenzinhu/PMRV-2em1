// Municípios por UF — SC é o dia a dia do app e carrega junto do bundle;
// os demais UFs (envolvidos de outros estados) vêm sob demanda, um chunk
// por UF, com cache em memória. Dados gerados da API do IBGE
// (ver scripts/gen-municipios.mjs).

import { MUNICIPIOS_SC } from './municipios-sc';
import { carregarMunicipiosUF, UFS_COM_DADOS } from './municipios-dados';

// Compatibilidade: leitores síncronos recebem SC; para outros UFs use
// garantirMunicipios(uf) e guarde a lista no estado do componente.
export const MUNICIPIOS_POR_UF = { SC: MUNICIPIOS_SC };

const cache = { SC: MUNICIPIOS_SC };
const pendentes = new Map();

/** Lista do UF se já estiver em memória; null quando ainda não carregada. */
export function municipiosDoUF(uf) {
  return cache[uf] || null;
}

/** Carrega o UF sob demanda (import dinâmico) e cacheia. Falha → lista vazia. */
export async function garantirMunicipios(uf) {
  if (!uf) return [];
  if (cache[uf]) return cache[uf];
  if (pendentes.has(uf)) return pendentes.get(uf);
  const promessa = carregarMunicipiosUF(uf)
    .then((lista) => {
      cache[uf] = lista;
      pendentes.delete(uf);
      return lista;
    })
    .catch((err) => {
      console.error(`Falha ao carregar municípios de ${uf}:`, err);
      pendentes.delete(uf);
      return [];
    });
  pendentes.set(uf, promessa);
  return promessa;
}

export { UFS_COM_DADOS };
