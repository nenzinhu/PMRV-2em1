import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { gravarOcorrenciaIDB, lerOcorrenciaIDB, OCORRENCIA_ID } from './idb';
import { montarDossie, migrarLegado, normalizarOcorrencia, novaOcorrencia, OCORRENCIA_VERSION } from './ocorrencia';

// localStorage de teste (Map por trás).
function storageFake() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}

// parseRelatoDraft e parseDanos reais (importados) para migrar de verdade.
import { parseRelatoDraft } from './relato-draft';
import { parseDanos } from './danos';

beforeEach(() => {
  const req = indexedDB.deleteDatabase('pmrv-ocorrencias');
  return new Promise((resolve) => {
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});

describe('documento único', () => {
  it('ocorrência nova tem id, versão e blocos vazios', () => {
    const o = novaOcorrencia();
    expect(o.id).toMatch(/^oc-/);
    expect(o.version).toBe(OCORRENCIA_VERSION);
    expect(o.envolvidos).toEqual([]);
    expect(o.relato.form).toEqual({});
    expect(o.danos.fotos).toEqual([]);
    expect(o.resumo.estiloResumo).toBe('policial');
  });

  it('normaliza entrada parcial sem inventar fatos', () => {
    const o = normalizarOcorrencia({ relato: { form: { sade: '123' } } });
    expect(o.relato.form.sade).toBe('123');
    expect(o.relato.form.dataFato).toBeUndefined(); // não inventa data
    expect(o.relato.step).toBe(1);
    expect(o.envolvidos).toEqual([]);
  });

  it('descarta fotos sem id em envolvidos e danos', () => {
    const o = normalizarOcorrencia({
      envolvidos: [{ id: 1, nome: 'Ana', fotos: [{ id: 'f1' }, { src: 'sem-id' }, null] }],
      danos: { fotos: [{ id: 'd1' }, 'lixo'] },
    });
    expect(o.envolvidos[0].fotos).toEqual([{ id: 'f1' }]);
    expect(o.danos.fotos).toEqual([{ id: 'd1' }]);
  });
});

describe('migração dos rascunhos legados', () => {
  it('sem legado devolve null (não cria ocorrência fantasma)', () => {
    expect(migrarLegado(storageFake(), parseRelatoDraft, parseDanos)).toBeNull();
  });

  it('migra os 4 blocos para o documento único', () => {
    const s = storageFake();
    s.setItem(
      'PMRV_RELATO_RASCUNHO',
      JSON.stringify({
        form: { sade: '987', vtr: '1901', dataFato: '2026-09-20', horaFato: '14:33', dinamica: 'colisão' },
        step: 3,
        manualEdit: true,
        manualText: 'texto manual',
      })
    );
    s.setItem('PMRV_ENVOLVIDOS', JSON.stringify({ lista: [{ id: 1, nome: 'Ana', fotos: [{ id: 'f1' }] }], seq: 1 }));
    s.setItem('PMRV_DANOS', JSON.stringify({ fotos: [{ id: 'd1' }], envolvidoId: '1', observacao: '', descricao: 'amassado' }));
    s.setItem(
      'PMRV_RESUMO_DINAMICA',
      JSON.stringify({ relatos: [{ id: 9, envolvidoId: 1, texto: 'relato ana' }], resumo: '', resumos: { policial: 'resumo!' }, estiloResumo: 'policial' })
    );

    const o = migrarLegado(s, parseRelatoDraft, parseDanos);
    expect(o.relato.form.sade).toBe('987');
    expect(o.relato.form.dataFato).toBe('2026-09-20');
    expect(o.relato.manualEdit).toBe(true);
    expect(o.envolvidos[0].nome).toBe('Ana');
    expect(o.danos.descricao).toBe('amassado');
    expect(o.resumo.relatos).toHaveLength(1);
    expect(o.resumo.resumos.policial).toBe('resumo!');
  });

  it('bloco corrompido não derruba a migração dos demais', () => {
    const s = storageFake();
    s.setItem('PMRV_ENVOLVIDOS', '{quebrado');
    s.setItem(
      'PMRV_RELATO_RASCUNHO',
      JSON.stringify({ form: { sade: '5' }, step: 2 })
    );
    const o = migrarLegado(s, parseRelatoDraft, parseDanos);
    expect(o.envolvidos).toEqual([]);
    expect(o.relato.form.sade).toBe('5');
  });
});

describe('IndexedDB do documento', () => {
  it('grava e relê o registro atual', async () => {
    const doc = normalizarOcorrencia(novaOcorrencia());
    doc.envolvidos.push({ id: 1, nome: 'Ana' });
    await gravarOcorrenciaIDB(indexedDB, doc);
    const lido = await lerOcorrenciaIDB(indexedDB);
    expect(lido.id).toBe(doc.id);
    expect(lido.envolvidos[0].nome).toBe('Ana');
    expect(lido).not.toBe(doc); // veio do banco (deserializado)
  });

  it('leitura sem banco devolve null em vez de quebrar', async () => {
    expect(await lerOcorrenciaIDB(null)).toBeNull();
    expect(await gravarOcorrenciaIDB(null, novaOcorrencia())).toBe(false);
  });

  it('usa o id padrão "atual"', () => {
    expect(OCORRENCIA_ID).toBe('atual');
  });
});

describe('dossiê de envio', () => {
  it('relatório vazio não gera texto', () => {
    expect(montarDossie({}, novaOcorrencia())).toBe('');
  });

  it('junta relatório + envolvidos + resumo + danos em um só texto', () => {
    const doc = normalizarOcorrencia({
      relato: { form: { sade: '1', dataFato: '2026-09-20', horaFato: '10:00' } },
      envolvidos: [{ id: 1, nome: 'Ana Silva', placa: 'ABC1D23', modelo: 'Gol', cor: 'Prata', relato: 'Colidiu atrás.' }],
      resumo: { resumo: 'Resumo unificado dos fatos.', resumos: { policial: 'Resumo unificado dos fatos.' }, estiloResumo: 'policial' },
      danos: { descricao: 'Parachoque traseiro amassado.' },
    });
    const texto = montarDossie(
      {
        generateReport: (form) => `RELATÓRIO SADE ${form.sade}`,
        envolvidosText: (lista) => `*ENVOLVIDOS*\n\n${lista.map((e) => `${e.nome} (${e.placa})`).join('\n')}`,
      },
      doc
    );
    expect(texto).toContain('RELATÓRIO SADE 1');
    expect(texto).toContain('*ENVOLVIDOS*');
    expect(texto).toContain('Ana Silva (ABC1D23)');
    expect(texto).toContain('*RESUMO DA DINÂMICA*');
    expect(texto).toContain('Resumo unificado dos fatos.');
    expect(texto).toContain('*DANOS MATERIAIS*');
    expect(texto).toContain('Parachoque traseiro amassado.');
    // ordem: relatório antes de envolvidos
    expect(texto.indexOf('RELATÓRIO')).toBeLessThan(texto.indexOf('ENVOLVIDOS'));
  });
});
