import { describe, expect, it } from 'vitest';
import {
  buildAberturaRelato,
  conhecimentoLabel,
  generateReport,
  localDoFato,
  resumoVitimas,
  rotuloOcorrencia,
  sentidoLabel,
  totalVitimas,
} from './pmrv';
import { dossieVersionado, montarDossie } from './ocorrencia';
import { rodapeVersao } from './versao';

function form(patch = {}) {
  return {
    sade: '1234567',
    vtr: '1901',
    conhecimento: 'pela Central',
    cidade: 'Florianópolis/SC',
    rodovia: 'SC-401',
    km: '12,300',
    sentido: 'Crescente',
    ocorrencia: 'Sinistro de trânsito com danos materiais',
    subtipo: '1.2',
    dinamica: 'Quanto à dinâmica dos fatos, presume-se que o condutor transitava.',
    dataFato: '2024-03-15',
    horaFato: '03:17',
    horaTipo: 'auto',
    irregularidade: 'nenhuma',
    ...patch,
  };
}

describe('abertura do relatório', () => {
  it('descreve acionamento, local e viatura em uma frase', () => {
    const texto = buildAberturaRelato(form());
    expect(texto).toContain('A guarnição foi acionada pela Central de Operações');
    expect(texto).toContain('sinistro de trânsito');
    expect(texto).toContain('Rodovia SC-401');
    expect(texto).toContain('km 12,300');
    expect(texto).toContain('sentido Crescente');
    expect(texto).toContain('viatura PM-1901');
    expect(texto.endsWith('.')).toBe(true);
  });

  it('omite o que não foi preenchido em vez de imprimir placeholders', () => {
    const texto = buildAberturaRelato(form({ km: '', sentido: '', vtr: '' }));
    expect(texto).not.toContain('---');
    expect(texto).not.toContain('PM-');
    expect(texto).toBe(
      'A guarnição foi acionada pela Central de Operações para atendimento de sinistro de trânsito na Rodovia SC-401.'
    );
  });

  it('mantém a frase válida sem nenhum dado de local', () => {
    const texto = buildAberturaRelato(form({ rodovia: '', km: '', sentido: '', vtr: '', sade: '' }));
    expect(texto).toBe(
      'A guarnição foi acionada pela Central de Operações para atendimento de sinistro de trânsito.'
    );
  });

  it('mantém a frase válida sem rodovia informada', () => {
    const texto = buildAberturaRelato(form({ rodovia: '', km: '' }));
    expect(texto).toBe(
      'A guarnição foi acionada pela Central de Operações para atendimento de sinistro de trânsito, sendo empenhada a viatura PM-1901.'
    );
  });

  it('usa "por populares" quando o conhecimento veio da população', () => {
    expect(buildAberturaRelato(form({ conhecimento: 'por populares' }))).toContain(
      'A guarnição foi acionada por populares'
    );
  });

  it('não diz que a guarnição foi acionada quando ela mesma constatou o fato', () => {
    const texto = buildAberturaRelato(form({ conhecimento: 'pela guarnição' }));
    expect(texto).toContain('Durante patrulhamento na Rodovia SC-401');
    expect(texto).not.toContain('acionada');
    expect(texto).toContain('viatura PM-1901');
  });
});

describe('normalização dos campos de local', () => {
  it('lê o sentido manual e ignora espaços extras', () => {
    expect(sentidoLabel({ sentido: 'MANUAL', sentidoManual: '  Bairro -> Centro ' })).toBe('Bairro -> Centro');
    expect(sentidoLabel({ sentido: '' })).toBe('');
  });

  it('remove o prefixo km duplicado digitado pelo policial', () => {
    expect(localDoFato(form({ km: 'km 12,300' })).km).toBe('12,300');
  });

  it('traduz o conhecimento em frase corrida', () => {
    expect(conhecimentoLabel('pela Central')).toBe('pela Central de Operações');
    expect(conhecimentoLabel('por populares')).toBe('por populares');
    expect(conhecimentoLabel('')).toBe('pela Central de Operações');
    expect(conhecimentoLabel('por denúncia anônima')).toBe('por denúncia anônima');
  });
});

describe('vítimas', () => {
  it('escreve quantidades sem "(s)" e sem zero à esquerda', () => {
    expect(resumoVitimas({ qtdLeve: '1', qtdGrave: '2', qtdGravissima: '0' })).toEqual([
      '1 leve',
      '2 graves',
    ]);
    expect(resumoVitimas({ qtdLeve: '01' })).toEqual(['1 leve']);
    expect(resumoVitimas({})).toEqual([]);
  });

  it('soma as vítimas informadas', () => {
    expect(totalVitimas({ qtdLeve: '1', qtdGrave: '2', qtdGravissima: '1' })).toBe(4);
    expect(totalVitimas({})).toBe(0);
  });

  it('troca "vítima(s)" pelo rótulo humano conforme a contagem', () => {
    expect(rotuloOcorrencia('Sinistro de trânsito com vítima(s)', 1)).toBe('Sinistro de trânsito com vítima');
    expect(rotuloOcorrencia('Sinistro de trânsito com vítima(s)', 3)).toBe('Sinistro de trânsito com vítimas');
    expect(rotuloOcorrencia('Sinistro de trânsito com danos materiais', 0)).toBe(
      'Sinistro de trânsito com danos materiais'
    );
    expect(rotuloOcorrencia('', 0)).toBe('Sinistro de trânsito com danos materiais');
  });

describe('generateReport — texto padrão', () => {
  it('coloca a abertura como primeiro parágrafo, separada da dinâmica', () => {
    const texto = generateReport(form());
    const paragrafos = texto.split('\n\n');
    expect(paragrafos[1].startsWith('A guarnição foi acionada')).toBe(true);
    expect(paragrafos[2].startsWith('Quanto à dinâmica')).toBe(true);
  });

  it('não imprime "---" na prosa, só no cabeçalho', () => {
    const texto = generateReport(form({ km: '', sentido: '', vtr: '', sade: '' }), true);
    const prosa = texto.split('\n\n').slice(1).join('\n\n');
    expect(prosa).not.toContain('---');
    expect(texto).toContain('*Protocolo SADE:* ---');
  });

  it('encerra com o texto de irregularidade escolhido', () => {
    expect(generateReport(form({ irregularidade: 'sanada' }))).toContain('a qual foi sanada no local');
    expect(generateReport(form({ irregularidade: 'nao_sanada' }))).toContain('foi removido por guincho credenciado');
    expect(generateReport(form({ irregularidade: 'ocultar' }))).not.toContain('providências administrativas');
  });
});

describe('dossiê — quebras de linha reais', () => {
  it('usa quebra de linha de verdade entre as seções, não a sequência literal', () => {
    const doc = {
      relato: { form: form(), manualEdit: false, manualText: '' },
      envolvidos: [],
      resumo: { resumo: 'Resumo.' },
      danos: { descricao: 'Amassado.' },
    };
    const ferramentas = { generateReport: () => 'RELATORIO', envolvidosText: () => '*ENVOLVIDOS*' };
    const texto = dossieVersionado(ferramentas, doc, rodapeVersao);

    expect(texto).not.toContain('\\n');
    expect(texto).toContain('\n\n--------------------\n\n');
    expect(texto).toContain('\n—\n');
    expect(montarDossie(ferramentas, doc)).not.toContain('\\n');
  });
});

  it('marca no cabeçalho quando a quantidade não foi informada', () => {
    const texto = generateReport(
      form({ ocorrencia: 'Sinistro de trânsito com vítima(s)', irregularidade: 'ocultar' }),
      true
    );
    expect(texto).toContain('*Vítimas:* quantidade não informada');
  });
});
