import { describe, expect, it } from 'vitest';
import {
  RELATO_DRAFT_KEY,
  parseRelatoDraft,
  serializeRelatoDraft,
  mergeRelatoDraft,
  aplicarDinamicaNoRascunho,
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

describe('aplicarDinamicaNoRascunho', () => {
  it('grava o resumo na dinâmica sem inventar data do fato', () => {
    const store = new Map();
    const storage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
    };
    const ok = aplicarDinamicaNoRascunho('Colisão traseira na SC-401.', storage);
    expect(ok).toBe(true);
    const parsed = parseRelatoDraft(storage.getItem(RELATO_DRAFT_KEY));
    expect(parsed.form.dinamica).toBe('Colisão traseira na SC-401.');
    expect(parsed.form.dataFato).toBeUndefined();
  });

  it('atualiza só a dinâmica de um rascunho existente', () => {
    const store = new Map();
    const storage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
    };
    storage.setItem(
      RELATO_DRAFT_KEY,
      serializeRelatoDraft({
        form: { sade: '123', vtr: '1901', dataFato: '2024-03-15', horaFato: '03:17', dinamica: 'antigo' },
        step: 2,
      })
    );
    aplicarDinamicaNoRascunho('Novo resumo da dinâmica.', storage);
    const parsed = parseRelatoDraft(storage.getItem(RELATO_DRAFT_KEY));
    expect(parsed.form.dinamica).toBe('Novo resumo da dinâmica.');
    expect(parsed.form.sade).toBe('123');
    expect(parsed.form.vtr).toBe('1901');
    expect(parsed.form.dataFato).toBe('2024-03-15');
    expect(parsed.form.horaFato).toBe('03:17');
    expect(parsed.step).toBe(2);
  });

  it('texto vazio não grava dinâmica inventada', () => {
    expect(aplicarDinamicaNoRascunho('  ')).toBe(false);
    expect(aplicarDinamicaNoRascunho('')).toBe(false);
  });
});
