import { describe, expect, it } from 'vitest';
import { letrasDe, normalizarNombre } from './nombre.js';

describe('normalizarNombre', () => {
  it('toma solo el primer nombre en mayúsculas', () => {
    expect(normalizarNombre('  maría josé ')).toBe('MARIA');
  });

  it('quita acentos y diéresis pero deja la Ñ', () => {
    expect(normalizarNombre('Begoña')).toBe('BEGOÑA');
    expect(normalizarNombre('Ñuño')).toBe('ÑUÑO');
    expect(normalizarNombre('Güero')).toBe('GUERO');
  });

  it('quita lo que no es letra y salta palabras vacías', () => {
    expect(normalizarNombre("O'Neil")).toBe('ONEIL');
    expect(normalizarNombre('123 ana')).toBe('ANA');
    expect(normalizarNombre('  ')).toBe('');
  });

  it('recorta a 10 letras', () => {
    expect(normalizarNombre('Maximilianopolis')).toBe('MAXIMILIAN');
  });
});

describe('letrasDe', () => {
  it('trata LL y RR como una sola letra', () => {
    expect(letrasDe('GUILLERMO')).toEqual(['G', 'U', 'I', 'LL', 'E', 'R', 'M', 'O']);
    expect(letrasDe('IRRA')).toEqual(['I', 'RR', 'A']);
  });

  it('con tres L seguidas toma LL y luego L', () => {
    expect(letrasDe('LLL')).toEqual(['LL', 'L']);
  });

  it('deja la Ñ como una letra', () => {
    expect(letrasDe('ÑU')).toEqual(['Ñ', 'U']);
  });
});
