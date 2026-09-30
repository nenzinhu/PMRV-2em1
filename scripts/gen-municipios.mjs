// Gera os chunks de municípios a partir da API do IBGE:
//   node scripts/gen-municipios.mjs
// Saídas:
//   lib/municipios-sc.js               (SC — carregado junto do bundle)
//   lib/municipios/municipio-<UF>.js   (demais UFs — import dinâmico)
// Fonte: https://servicodados.ibge.gov.br/api/v1/localidades/estados/<UF>/municipios
import { mkdirSync, writeFileSync } from 'node:fs';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RN', 'RJ',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const CAB = (uf) =>
  `// Municípios de ${uf} — gerado por scripts/gen-municipios.mjs (API IBGE).\n` +
  `// Fonte: https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios\n`;

async function buscar(uf) {
  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`IBGE ${uf}: HTTP ${r.status}`);
  const dados = await r.json();
  const nomes = dados.map((m) => m.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (!nomes.length) throw new Error(`IBGE ${uf}: lista vazia`);
  return nomes;
}

const corpo = (nomes) =>
  nomes.map((n) => '  ' + JSON.stringify(n) + ',').join('\n');

mkdirSync('lib/municipios', { recursive: true });

for (const uf of UFS) {
  const nomes = await buscar(uf);
  if (uf === 'SC') {
    writeFileSync(
      'lib/municipios-sc.js',
      CAB(uf) + `export const MUNICIPIOS_SC = [\n${corpo(nomes)}\n];\n`
    );
  } else {
    writeFileSync(
      `lib/municipios/municipio-${uf}.js`,
      CAB(uf) + `export const MUNICIPIOS = [\n${corpo(nomes)}\n];\n`
    );
  }
  console.log(`${uf}: ${nomes.length} municípios`);
}

console.log('OK — chunks gerados em lib/municipios*/');
