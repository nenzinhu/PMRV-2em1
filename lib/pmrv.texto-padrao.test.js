import { describe, expect, it } from 'vitest';
import {
  buildAberturaRelato,
  conhecimentoLabel,
  generateReport,
  localDoFato,
  resumoVitimas,
  rotuloOcorrencia,
  rotuloRodovia,
  sentidoLabel,
  totalVitimas,
} from './pmrv';
import { montarDossie } from './ocorrencia';

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
  it('descreve a guarnição, o acionamento e o deslocamento ao local', () => {
    const texto = buildAberturaRelato(form());
    expect(texto).toContain('A guarnição PM-1901 foi acionada pela Central 198');
    expect(texto).toContain('sinistro de trânsito');
    expect(texto).toContain('Deslocado até o local indicado (SC-401, km 12,300)');
    expect(texto).toContain('km 12,300');
    expect(texto.endsWith('.')).toBe(true);
  });

  it('mantém o marcador da viatura ausente e omite o km', () => {
    const texto = buildAberturaRelato(form({ km: '', sentido: '', vtr: '' }));
    expect(texto).toContain('A guarnição PM---- foi acionada');
    expect(texto).not.toContain('km ');
    expect(texto).toBe(
      'A guarnição PM---- foi acionada pela Central 198 para atendimento da ocorrência.\n\nDeslocado até o local indicado (SC-401), constatou-se tratar de um sinistro de trânsito com danos materiais.'
    );
  });

  it('mantém a abertura sem dados de local', () => {
    const texto = buildAberturaRelato(form({ rodovia: '', km: '', sentido: '', vtr: '', sade: '' }));
    expect(texto).toBe(
      'A guarnição PM---- foi acionada pela Central 198 para atendimento da ocorrência.\n\nDeslocado até o local indicado, constatou-se tratar de um sinistro de trânsito com danos materiais.'
    );
  });

  it('mantém o local indicado sem rodovia informada', () => {
    const texto = buildAberturaRelato(form({ rodovia: '', km: '' }));
    expect(texto).toBe(
      'A guarnição PM-1901 foi acionada pela Central 198 para atendimento da ocorrência.\n\nDeslocado até o local indicado, constatou-se tratar de um sinistro de trânsito com danos materiais.'
    );
  });

  it('usa "por populares" quando o conhecimento veio da população', () => {
    expect(buildAberturaRelato(form({ conhecimento: 'por populares' }))).toContain(
      'A guarnição PM-1901 foi acionada por populares'
    );
  });

  it('não diz que a guarnição foi acionada quando ela mesma constatou o fato', () => {
    const texto = buildAberturaRelato(form({ conhecimento: 'pela guarnição' }));
    expect(texto).toContain('A guarnição PM-1901 deparou-se com sinistro de trânsito');
    expect(texto).not.toContain('acionada');
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

  it('completa o prefixo SC quando o policial digita só o número', () => {
    expect(rotuloRodovia('401')).toBe('SC-401');
    expect(rotuloRodovia('SC 401')).toBe('SC-401');
    expect(rotuloRodovia('sc401')).toBe('SC-401');
    expect(rotuloRodovia('SC-401')).toBe('SC-401');
  });

  it('mantém o nome da ponte e não inventa prefixo SC', () => {
    expect(rotuloRodovia('P. Hercílio Luz')).toBe('P. Hercílio Luz');
    expect(rotuloRodovia('TIC01')).toBe('P. Hercílio Luz');
    expect(rotuloRodovia('ACESSO AEROPORTO INTERNACIONAL HERCÍLIO LUZ')).toBe(
      'ACESSO AEROPORTO INTERNACIONAL HERCÍLIO LUZ'
    );
    expect(rotuloRodovia('BR-101')).toBe('BR-101');
    expect(rotuloRodovia('br 101')).toBe('BR-101');
  });

  it('usa o nome da ponte na abertura, sem a palavra Rodovia', () => {
    const texto = buildAberturaRelato(form({ rodovia: 'P. Hercílio Luz', km: '3,200' }));
    expect(texto).toContain('sinistro de trânsito na P. Hercílio Luz, km 3,200');
    expect(texto).not.toContain('Rodovia');
  });

  it('traduz o conhecimento em frase corrida', () => {
    expect(conhecimentoLabel('pela Central')).toBe('pela Central 198');
    expect(conhecimentoLabel('por populares')).toBe('por populares');
    expect(conhecimentoLabel('')).toBe('pela Central 198');
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
});

describe('generateReport — texto padrão', () => {
  it('coloca a abertura como primeiro parágrafo, separada da dinâmica', () => {
    const texto = generateReport(form());
    const paragrafos = texto.split('\n\n');
    expect(paragrafos[1].startsWith('A guarnição PM-1901 foi acionada')).toBe(true);
    expect(paragrafos[2].startsWith('Quanto à dinâmica')).toBe(true);
  });

  it('mantém os marcadores ausentes no cabeçalho e na viatura da abertura', () => {
    const texto = generateReport(form({ km: '', sentido: '', vtr: '', sade: '' }), true);
    const prosa = texto.split('\n\n').slice(1).join('\n\n');
    expect(prosa).toContain('A guarnição PM---- foi acionada');
    expect(texto).toContain('*Protocolo SADE:* ---');
    expect(texto).toContain('*Viatura:* ---');
  });

  it('encerra com o texto de irregularidade escolhido', () => {
    expect(generateReport(form({ irregularidade: 'sanada' }))).toContain('a qual foi sanada no local');
    expect(generateReport(form({ irregularidade: 'nao_sanada' }))).toContain('foi removido por guincho credenciado');
    expect(generateReport(form({ irregularidade: 'ocultar' }))).not.toContain('providências administrativas');
  });
});

describe('dossiê — texto final', () => {
  function docExemplo() {
    return {
      relato: { form: form(), manualEdit: false, manualText: '' },
      envolvidos: [],
      resumo: { resumo: 'Resumo.' },
      danos: { descricao: 'Amassado.' },
    };
  }

  it('usa quebra de linha de verdade entre as seções', () => {
    const texto = montarDossie({ generateReport: () => 'RELATORIO' }, docExemplo());

    expect(texto).not.toContain('\\n');
    expect(texto).toContain('\n\n--------------------\n\n');
  });

  it('não termina com rodapé de versão', () => {
    const texto = montarDossie({ generateReport: () => 'RELATORIO' }, docExemplo());

    expect(texto).not.toContain('Gerado pelo PMRV-SC');
    expect(texto).not.toContain('modelo de ocorrência');
    expect(texto.endsWith('Amassado.')).toBe(true);
  });
});
