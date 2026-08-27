import { describe, expect, it } from 'vitest';
import { generateReport, nowFato, formatDataFato, maskDataFatoBr, parseDataFatoBr } from './pmrv';

function formBase(patch = {}) {
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
    horaManual: '23:59',
    ...patch,
  };
}

describe('formatDataFato', () => {
  it('converte ISO do fato para pt-BR sem usar o relógio', () => {
    expect(formatDataFato('2024-03-15')).toBe('15/03/2024');
  });

  it('aceita data já no modelo brasileiro dd/mm/aaaa', () => {
    expect(formatDataFato('15/03/2024')).toBe('15/03/2024');
  });

  it('não inventa data quando o campo está vazio ou inválido', () => {
    expect(formatDataFato('')).toBe('---');
    expect(formatDataFato(undefined)).toBe('---');
    expect(formatDataFato('2024-13-40')).toBe('---');
    expect(formatDataFato('31/02/2024')).toBe('---');
    expect(formatDataFato('15-03-2024')).toBe('---');
  });
});

describe('máscara dd/mm/aaaa', () => {
  it('monta o modelo brasileiro só com os dígitos digitados', () => {
    expect(maskDataFatoBr('15032024')).toBe('15/03/2024');
    expect(maskDataFatoBr('15')).toBe('15');
    expect(maskDataFatoBr('1503')).toBe('15/03');
  });

  it('grava ISO só quando a data brasileira é calendário válido', () => {
    expect(parseDataFatoBr('15/03/2024')).toBe('2024-03-15');
    expect(parseDataFatoBr('15/03')).toBe('');
    expect(parseDataFatoBr('31/02/2024')).toBe('');
    expect(parseDataFatoBr('2024-03-15')).toBe('2024-03-15');
  });
});

describe('nowFato', () => {
  it('lê data e hora do relógio injetado, no fuso local, sem UTC', () => {
    const clock = () => new Date(2024, 2, 15, 3, 17, 59);
    expect(nowFato(clock)).toEqual({ dataFato: '2024-03-15', horaFato: '03:17' });
  });
});

describe('generateReport — fidelidade factual de data/hora', () => {
  it('imprime a data e a hora do fato, não o instante da geração', () => {
    const texto = generateReport(formBase());
    expect(texto).toContain('Data: 15/03/2024');
    expect(texto).toContain('Hora: 03:17');
    expect(texto).not.toContain('23:59');
  });

  it('com hora manual, usa só o horário informado pelo policial', () => {
    const texto = generateReport(formBase({ horaTipo: 'manual', horaManual: '06:15' }));
    expect(texto).toContain('Hora: 06:15');
    expect(texto).not.toContain('Hora: 03:17');
  });

  it('não preenche data/hora faltantes com o relógio', () => {
    const texto = generateReport(formBase({ dataFato: '', horaFato: '', horaTipo: 'auto', horaManual: '' }));
    expect(texto).toContain('Data: ---');
    expect(texto).toContain('Hora: ---');
  });
});
