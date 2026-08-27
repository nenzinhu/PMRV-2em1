// Gerado por gen_geojson.py a partir do Shapefile oficial Rodovias_SC
export const RODOVIAS = ["ACESSO ABELARDO LUZ", "ACESSO AEROPORTO INTERNACIONAL HERCÍLIO LUZ", "ACESSO ARVOREDO", "ACESSO AVENIDA GABRIEL ZANETTE", "ACESSO BETO CARRERO", "ACESSO BRUNÓPOLIS", "ACESSO CRICIÚMA", "ACESSO CUNHATAÍ", "ACESSO DE LIGAÇÃO SUL DE CRICIÚMA", "ACESSO DONA EMMA", "ACESSO ERMO", "ACESSO FLORIANÓPOLIS (TAPERA)", "ACESSO IMBUIA", "ACESSO IRATI", "ACESSO IRINEÓPOLIS", "ACESSO JABORÁ", "ACESSO JAGUARUNA", "ACESSO JOINVILLE", "ACESSO JOSÉ BOITEUX", "ACESSO LAGUNA", "ACESSO LAGUNA (FAROL DE SANTA MARTA)", "ACESSO LESTE BOMJESUS DO OESTE", "ACESSO LESTE RIO DOS CEDROS", "ACESSO MAREMA", "ACESSO MIRIM DOCE", "ACESSO NORTE DISTRITO CLARAÍBA", "ACESSO NOVA ITABERABA", "ACESSO OESTE BOM JESUS DO OESTE", "ACESSO OESTE OURO VERDE", "ACESSO OESTE SÃO BENTO DO SUL", "ACESSO PASSO DE TORRES", "ACESSO PASSOS MAIA", "ACESSO PENHA", "ACESSO PRINCESA", "ACESSO RIO MAINA", "ACESSO SEDE OURO", "ACESSO SUL BRASIL", "ACESSO SUL DE SEARA", "ACESSO SUL DISTRITO CLARAÍBA", "ACESSO SUL RIO DOS CEDROS", "ACESSO SUL SÃO BENTO DO SUL", "ACESSO SÃO DOMINGOS", "ACESSO VILA MARIA", "ACESSO À RUA TANCREDO DE ALMEIDA NEVES", "BR-280", "CONTORNO LESTE DE XANXERÊ", "CONTORNO RODOVIÁRIO DE JABORÁ", "CONTORNO RODOVIÁRIO DE LAURO MÜLLER", "CONTORNO RODOVIÁRIO DE TUBARÃO", "CONTORNO RODOVIÁRIO DO MUNICÍPIO DE GARUVA", "SC-100", "SC-108", "SC-110", "SC-112", "SC-114", "SC-120", "SC-135", "SC-150", "SC-154", "SC-155", "SC-156", "SC-157", "SC-159", "SC-160", "SC-161", "SC-163", "SC-170", "SC-281", "SC-283", "SC-284", "SC-285", "SC-290", "SC-305", "SC-340", "SC-350", "SC-355", "SC-370", "SC-386", "SC-390", "SC-400", "SC-401", "SC-402", "SC-403", "SC-404", "SC-405", "SC-406", "SC-407", "SC-408", "SC-410", "SC-412", "SC-414", "SC-415", "SC-416", "SC-417", "SC-418", "SC-421", "SC-427", "SC-434", "SC-435", "SC-436", "SC-437", "SC-441", "SC-442", "SC-443", "SC-445", "SC-446", "SC-447", "SC-449", "SC-451", "SC-452", "SC-453", "SC-459", "SC-462", "SC-464", "SC-465", "SC-467", "SC-468", "SC-469", "SC-473", "SC-477", "SC-479", "SC-480", "SC-482", "SC-483", "SC-484", "SC-486", "SC-492", "SC-496", "P. Hercílio Luz", "P. C. Machado Salles", "P. Pedro Ivo Campos"];
export const RODOVIAS_GEOJSON_URL = '/rodovias-sc.geojson';

/** Nomes usados no seletor e no relatório. GPS ainda casa TIC01–TIC03 na malha oficial. */
export const RODOVIA_DISPLAY = {
  TIC01: 'P. Hercílio Luz',
  TIC02: 'P. C. Machado Salles',
  TIC03: 'P. Pedro Ivo Campos',
};

export function rodoviaLabel(code) {
  if (typeof code !== 'string' || !code) return '';
  return RODOVIA_DISPLAY[code] || code;
}

/**
 * Opções do Relato: só ilha, pontes, Grande Florianópolis e vizinhas próximas.
 * Nomes vêm da malha oficial — não inventa rodovia.
 */
export const RODOVIAS_GRUPOS = [
  {
    grupo: 'Florianópolis',
    itens: [
      'SC-400',
      'SC-401',
      'SC-402',
      'SC-403',
      'SC-404',
      'SC-405',
      'SC-406',
      'ACESSO AEROPORTO INTERNACIONAL HERCÍLIO LUZ',
      'ACESSO FLORIANÓPOLIS (TAPERA)',
    ],
  },
  {
    grupo: 'Pontes',
    itens: ['P. Hercílio Luz', 'P. C. Machado Salles', 'P. Pedro Ivo Campos'],
  },
  {
    grupo: 'Grande Florianópolis e vizinhas',
    itens: ['SC-281', 'SC-407', 'SC-410'],
  },
];

export function rodoviasDoSeletor(valorAtual = '') {
  const oficiais = new Set(RODOVIAS);
  const grupos = RODOVIAS_GRUPOS.map((g) => ({
    grupo: g.grupo,
    itens: g.itens.filter((r) => oficiais.has(r)),
  })).filter((g) => g.itens.length);

  const noSeletor = new Set(grupos.flatMap((g) => g.itens));
  const atual = rodoviaLabel(valorAtual) || valorAtual;
  if (atual && oficiais.has(atual) && !noSeletor.has(atual)) {
    grupos.push({ grupo: 'Outra da malha', itens: [atual] });
  }
  return grupos;
}
