// Port de test/detector_dinamico_test.dart y test/suavizador_mano_test.dart.
import { describe, expect, it } from 'vitest';
import { remuestrearPorTiempo } from './detectorDinamico.js';
import { SuavizadorMano } from './suavizador.js';

describe('remuestrearPorTiempo', () => {
  it('remuestrea por tiempo con interpolación lineal', () => {
    const cuadros = [
      { t: 0, v: [0, 10] },
      { t: 100, v: [1, 10] },
      { t: 400, v: [4, 40] },
    ];
    const r = remuestrearPorTiempo(cuadros, 5);
    expect(r).toHaveLength(5);
    expect(r.map((c) => c[0])).toEqual([0, 1, 2, 3, 4]);
    expect(r[2][1]).toBeCloseTo(20, 9);
    expect(r.at(-1)).toEqual([4, 40]);
  });

  it('con dos cuadros en el mismo instante no divide entre cero', () => {
    const r = remuestrearPorTiempo([{ t: 5, v: [1] }, { t: 5, v: [2] }], 3);
    expect(r.every((c) => Number.isFinite(c[0]))).toBe(true);
  });
});

describe('SuavizadorMano', () => {
  const mano = (dx) => Array.from({ length: 21 }, (_, i) => [0.4 + dx + i * 0.01, 0.5, 0]);

  it('quieta con ruido: el temblor baja mucho', () => {
    const s = new SuavizadorMano();
    let semilla = 1;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    const salidas = [];
    for (let k = 0; k < 60; k++) {
      salidas.push(s.filtrar(mano((azar() - 0.5) * 0.006), k / 20)[0][0]);
    }
    const ultimas = salidas.slice(30);
    expect(Math.max(...ultimas) - Math.min(...ultimas)).toBeLessThan(0.006 * 0.5);
  });

  it('movimiento rápido: la sigue sin quedarse atrás', () => {
    const s = new SuavizadorMano();
    for (let k = 0; k <= 10; k++) s.filtrar(mano(k * 0.03), k / 20);
    expect(Math.abs(s.filtrar(mano(0.33), 11 / 20)[0][0] - 0.73)).toBeLessThan(0.03);
  });

  it('sostiene la mano un instante y luego la suelta', () => {
    const s = new SuavizadorMano();
    s.filtrar(mano(0), 0);
    expect(s.filtrar(null, 0.1)).not.toBeNull();
    expect(s.filtrar(null, 0.5)).toBeNull();
    expect(s.filtrar(mano(0.3), 0.6)[0][0]).toBeCloseTo(0.7, 9);
  });
});
