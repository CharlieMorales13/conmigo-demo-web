import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { predecirDinamico, predecirEstatico } from './modelos.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf-8'));
const TOLERANCIA = 1e-4;

function comparar(obtenidas, esperadas) {
  expect(obtenidas).toHaveLength(esperadas.length);
  obtenidas.forEach((p, i) => expect(Math.abs(p - esperadas[i])).toBeLessThan(TOLERANCIA));
}

describe('paridad con el .tflite', () => {
  it('estático', () => {
    const modelo = leer('../../public/modelos/estatico.json');
    const { entradas, salidas } = leer('./__fixtures__/estatico.json');
    entradas.forEach((e, i) => comparar(predecirEstatico(modelo, e), salidas[i]));
  });

  it('dinámico', () => {
    const modelo = leer('../../public/modelos/dinamico.json');
    const { entradas, salidas } = leer('./__fixtures__/dinamico.json');
    entradas.forEach((e, i) => comparar(predecirDinamico(modelo, e), salidas[i]));
  });
});
