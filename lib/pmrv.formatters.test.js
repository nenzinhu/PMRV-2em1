import { describe, expect, it } from 'vitest';
import { formatKM, formatKMNumero } from './pmrv';

describe('formatKM', () => {
  it.each([
    ['', ''],
    ['9', '0,009'],
    ['90', '0,090'],
    ['900', '0,900'],
    ['1000', '1,000'],
    ['10000', '10,000'],
  ])('formata %j com três casas decimais', (entrada, esperado) => {
    expect(formatKM(entrada)).toBe(esperado);
  });

  it('mantém no máximo seis caracteres e aceita valor já formatado', () => {
    expect(formatKM('10,000')).toBe('10,000');
    expect(formatKM('123456')).toBe('12,345');
    expect(formatKM('km 900')).toBe('0,900');
  });

  it('permite continuar digitando sobre a máscara já exibida', () => {
    expect(formatKM('0,0090')).toBe('0,090');
    expect(formatKM('0,0900')).toBe('0,900');
    expect(formatKM('0,9000')).toBe('9,000');
  });

  it('converte a leitura numérica do GPS para a mesma máscara', () => {
    expect(formatKMNumero(0.9)).toBe('0,900');
    expect(formatKMNumero(1)).toBe('1,000');
    expect(formatKMNumero(10)).toBe('10,000');
    expect(formatKMNumero('12,5')).toBe('12,500');
    expect(formatKMNumero(100)).toBe('99,999');
  });
});
