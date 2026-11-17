import { expect, it } from 'vitest';
import { fontesDosRelatos } from './fontes-relatos';
import { normalizarAnalise } from './dinamica-presumida';
import {
  normalizarOcorrencia,
  novaOcorrencia,
  montarDossie,
} from './ocorrencia';
import { normalizarResumoEstilos } from './resumo-prompt';

it('substitui cópias antigas sem repetir a fonte, mantendo notas e danos', () => {
  const fontes = fontesDosRelatos(
    [
      { id: 1, nome: 'Ana', relato: 'Atual' },
      { id: 2, relato: '', presumido: false },
      { id: 3, relato: 'Hipótese', presumido: true },
    ],
    [
      { id: 4, envolvidoId: 1, texto: 'Antigo' },
      { id: 5, danosDe: '1', texto: 'Danos' },
      { id: 6, texto: 'Nota' },
    ],
  );
  expect(fontes.map((e) => e.texto)).toEqual(['Atual', 'Danos', 'Nota']);
});
it('preserva relatos antigos sem cadastro correspondente para revisão', () => {
  const fontes = fontesDosRelatos(
    [],
    [{ id: 1, envolvidoId: 4, texto: 'Declaração antiga' }],
  );
  expect(fontes[0].texto).toBe('Declaração antiga');
  expect(fontes[0].envolvidoNome).toContain('registro anterior');
});
it('normaliza análise sem aceitar perguntas atribuídas a pessoas inexistentes', () => {
  const a = normalizarAnalise(
    {
      lacunas: [' Falta local ', 'Falta local', null],
      perguntas: [
        { envolvido: 8, perguntas: ['x'] },
        { envolvido: 1, perguntas: ['O que viu?', null] },
      ],
    },
    2,
  );
  expect(a.lacunas).toEqual(['Falta local']);
  expect(a.perguntas).toEqual([{ envolvido: 1, perguntas: ['O que viu?'] }]);
});
it('preserva a análise no documento, mas uma nova ocorrência começa vazia', () => {
  const doc = normalizarOcorrencia({
    envolvidos: [{ id: 1 }],
    dinamica: {
      estilo: 'tecnico',
      dinamica: 'Texto',
      fonte: 'origem',
      analise: { lacunas: ['Local'] },
    },
    resumo: { fontes: { tecnico: 'fonte resumo' } },
  });
  const restaurado = normalizarOcorrencia(JSON.parse(JSON.stringify(doc)));
  expect(restaurado.dinamica).toEqual(doc.dinamica);
  expect(restaurado.resumo.fontes.tecnico).toBe('fonte resumo');
  expect(novaOcorrencia().dinamica.dinamica).toBe('');
});
it('mantém versões antigas diferentes ao migrar para três estilos', () => {
  const antigo = {
    narrativo: 'Narrativa',
    leigo: 'Fácil',
    tecnico_policial: 'Policial técnico',
    tecnico: 'Técnico anterior',
  };
  const { resumos, estiloResumo } = normalizarResumoEstilos({
    resumos: antigo,
    estiloResumo: 'tecnico_policial',
    resumo: 'Texto selecionado',
  });
  expect(estiloResumo).toBe('tecnico');
  expect(resumos.formal).toBe('Narrativa');
  expect(resumos.leigo).toBe('Fácil');
  expect(resumos.tecnico_policial).toBe('Policial técnico');
  expect(resumos.tecnico).toBe('Texto selecionado');
});
it('não repete no dossiê o resumo já presente no relatório', () => {
  const texto = montarDossie(
    { generateReport: () => 'Relatório: dinâmica revisada.' },
    { resumo: { resumo: 'dinâmica revisada.' } },
  );
  expect(texto.match(/dinâmica revisada/g)).toHaveLength(1);
});
