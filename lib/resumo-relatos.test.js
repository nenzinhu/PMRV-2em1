import { describe, expect, it } from 'vitest';
import {
  loadResumoState,
  relatoFromEnvolvido,
  removerRelatoDoEnvolvido,
  upsertDanosNoResumo,
  upsertRelatoNoResumo,
} from './resumo-relatos';

describe('relatoFromEnvolvido', () => {
  it('copia só o texto informado, sem inventar conteúdo', () => {
    expect(
      relatoFromEnvolvido({ id: 3, nome: 'João Silva', relato: '  Colidiu na traseira.  ' })
    ).toEqual({
      envolvidoId: 3,
      envolvidoNome: 'João Silva',
      texto: 'Colidiu na traseira.',
    });
  });

  it('sem nome usa o número do envolvido; vazio não vira relato', () => {
    expect(relatoFromEnvolvido({ id: 2, nome: '  ', relato: 'saiu da pista' }).envolvidoNome).toBe(
      'Envolvido #2'
    );
    expect(relatoFromEnvolvido({ id: 1, nome: 'Ana', relato: '' })).toBe(null);
    expect(relatoFromEnvolvido({ id: 1, nome: 'Ana', relato: '   ' })).toBe(null);
  });
});

describe('upsertRelatoNoResumo', () => {
  const entrada = { envolvidoId: 3, envolvidoNome: 'João Silva', texto: 'Colidiu na traseira.' };

  it('inclui o relato salvo sem duplicar o mesmo envolvido', () => {
    const a = upsertRelatoNoResumo([], entrada, () => 100);
    expect(a).toEqual([{ id: 100, ...entrada }]);
    const b = upsertRelatoNoResumo(a, { ...entrada, texto: 'Texto revisado.' }, () => 999);
    expect(b).toHaveLength(1);
    expect(b[0].id).toBe(100);
    expect(b[0].texto).toBe('Texto revisado.');
    expect(b[0].envolvidoNome).toBe('João Silva');
  });

  it('entrada nula não inventa card no resumo', () => {
    const atual = [{ id: 1, envolvidoId: 9, texto: 'já estava' }];
    expect(upsertRelatoNoResumo(atual, null, () => 2)).toEqual(atual);
  });

  it('salvar envolvidos 1, 2, 3 e 4 gera quatro cards, um por pessoa', () => {
    let n = 0;
    const nextId = () => ++n;
    let lista = [];
    [1, 2, 3, 4].forEach((id) => {
      lista = upsertRelatoNoResumo(
        lista,
        relatoFromEnvolvido({ id, nome: `Pessoa ${id}`, relato: `relato ${id}` }),
        nextId
      );
    });
    expect(lista).toHaveLength(4);
    expect(lista.map((r) => r.envolvidoId)).toEqual([1, 2, 3, 4]);
    expect(lista.map((r) => r.texto)).toEqual(['relato 1', 'relato 2', 'relato 3', 'relato 4']);
  });
});

describe('removerRelatoDoEnvolvido', () => {
  it('tira só o relato daquele envolvido', () => {
    const lista = [
      { id: 1, envolvidoId: 3, texto: 'A' },
      { id: 2, envolvidoId: 8, texto: 'B' },
    ];
    expect(removerRelatoDoEnvolvido(lista, 3)).toEqual([{ id: 2, envolvidoId: 8, texto: 'B' }]);
  });
});

describe('upsertDanosNoResumo', () => {
  it('um card por veículo: atualiza o existente e não mexe nos relatos', () => {
    const base = [{ id: 1, envolvidoId: 1, envolvidoNome: 'Ana', texto: 'relato' }];
    const a = upsertDanosNoResumo(base, { texto: 'amassado', rotulo: 'Gol', chave: '1' }, () => 9);
    expect(a[1]).toEqual({ id: 9, danosDe: '1', envolvidoNome: 'Danos — Gol', texto: 'amassado' });
    const b = upsertDanosNoResumo(a, { texto: 'riscado', rotulo: 'Gol', chave: '1' }, () => 10);
    expect(b).toHaveLength(2);
    expect(b[1].texto).toBe('riscado');
    expect(upsertDanosNoResumo(b, { texto: '  ' })).toEqual(b);
    // Retirar o relato do envolvido não apaga o card de danos.
    expect(removerRelatoDoEnvolvido(b, 1)).toEqual([b[1]]);
  });
});

describe('migração dos estilos antigos do resumo', () => {
  it('preserva o resumo policial no novo modo técnico/policial', () => {
    localStorage.setItem(
      'PMRV_RESUMO_DINAMICA',
      JSON.stringify({
        relatos: [],
        resumo: 'Resumo policial existente.',
        resumos: { policial: 'Resumo policial existente.' },
        estiloResumo: 'policial',
      })
    );

    const state = loadResumoState();
    expect(state.estiloResumo).toBe('tecnico_policial');
    expect(state.resumos.tecnico_policial).toBe('Resumo policial existente.');
  });

  it('preserva o resumo leigo no novo modo narrativo', () => {
    localStorage.setItem(
      'PMRV_RESUMO_DINAMICA',
      JSON.stringify({
        relatos: [],
        resumo: 'Resumo direto existente.',
        resumos: { leigo: 'Resumo direto existente.' },
        estiloResumo: 'leigo',
      })
    );

    const state = loadResumoState();
    expect(state.estiloResumo).toBe('narrativo');
    expect(state.resumos.narrativo).toBe('Resumo direto existente.');
  });
});
