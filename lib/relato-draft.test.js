import { describe, expect, it } from 'vitest';
import {
  RELATO_DRAFT_KEY,
  parseRelatoDraft,
  serializeRelatoDraft,
  mergeRelatoDraft,
} from './relato-draft';
import { PMRV_DINAMICAS } from './pmrv';

describe('rascunho do Relato', () => {
  it('exporta a chave estável de persistência', () => {
    expect(RELATO_DRAFT_KEY).toBe('PMRV_RELATO_RASCUNHO');
  });

  it('serializa e relê form, passo e texto manual sem alterar os fatos', () => {
    const draft = {
      form: {
        sade: '999',
        vtr: '1901',
        dataFato: '2024-03-15',
        horaFato: '03:17',
        horaTipo: 'auto',
        dinamica: PMRV_DINAMICAS['1.2'],
      },
      step: 3,
      manualEdit: true,
      manualText: 'texto revisado pelo policial',
    };
    const parsed = parseRelatoDraft(serializeRelatoDraft(draft));
    expect(parsed.form.sade).toBe('999');
    expect(parsed.form.dataFato).toBe('2024-03-15');
    expect(parsed.form.horaFato).toBe('03:17');
    expect(parsed.step).toBe(3);
    expect(parsed.manualEdit).toBe(true);
    expect(parsed.manualText).toBe('texto revisado pelo policial');
  });

  it('JSON inválido ou vazio não inventa ocorrência', () => {
    expect(parseRelatoDraft(null)).toBe(null);
    expect(parseRelatoDraft('')).toBe(null);
    expect(parseRelatoDraft('{')).toBe(null);
    expect(parseRelatoDraft('[]')).toBe(null);
  });

  it('rascunho antigo sem dataFato não ganha data de hoje no merge', () => {
    const merged = mergeRelatoDraft({ form: { sade: '1', vtr: '1901' }, step: 2 });
    expect(merged.form.sade).toBe('1');
    expect(merged.form.vtr).toBe('1901');
    expect(merged.form.dataFato).toBe('');
    expect(merged.form.horaFato).toBe('');
    expect(merged.step).toBe(2);
  });
});
