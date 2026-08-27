import { describe, expect, it } from 'vitest';
import { envolvidosParaStorage, fotosParaStorage, precisaMigrarFotos } from './foto-store';

describe('fotosParaStorage', () => {
  it('guarda só o id — nunca o Data URL', () => {
    const out = fotosParaStorage([
      { id: 'abc', src: 'data:image/jpeg;base64,AAAA' },
      { id: 'def', src: 'blob:http://localhost/x' },
    ]);
    expect(out).toEqual([{ id: 'abc' }, { id: 'def' }]);
    expect(JSON.stringify(out)).not.toContain('data:');
    expect(JSON.stringify(out)).not.toContain('blob:');
  });

  it('descarta foto sem id (ainda não persistida no IndexedDB)', () => {
    expect(fotosParaStorage([{ src: 'data:image/jpeg;base64,AAAA' }])).toEqual([]);
  });
});

describe('envolvidosParaStorage', () => {
  it('tira bytes das fotos e preserva os demais fatos do envolvido', () => {
    const lista = [
      {
        id: 1,
        nome: 'João Silva',
        cpf: '123.456.789-00',
        relato: 'Colidiu na traseira.',
        fotos: [{ id: 'f1', src: 'data:image/jpeg;base64,AAAA' }],
      },
    ];
    const out = envolvidosParaStorage(lista);
    expect(out[0].nome).toBe('João Silva');
    expect(out[0].cpf).toBe('123.456.789-00');
    expect(out[0].relato).toBe('Colidiu na traseira.');
    expect(out[0].fotos).toEqual([{ id: 'f1' }]);
  });
});

describe('precisaMigrarFotos', () => {
  it('detecta Data URL legado sem inventar conteúdo', () => {
    expect(precisaMigrarFotos([{ fotos: [{ src: 'data:image/png;base64,xx' }] }])).toBe(true);
    expect(precisaMigrarFotos([{ fotos: [{ id: 'f1' }] }])).toBe(false);
    expect(precisaMigrarFotos([])).toBe(false);
  });
});
