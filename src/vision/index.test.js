// Contrato de index.js: ejes del navegador a los de la app y la regla de
// "Haz la seña" (ejercicio_haz_la_sena.dart) para letras estáticas, dinámicas y por regla.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { aEjesDelRecorte, aVideo, crearReconocimiento, recorteDe } from './index.js';
import { indiceMayor, predecirEstatico } from './modelos.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf-8'));
const estatico = leer('../../public/modelos/estatico.json');
const dinamico = leer('../../public/modelos/dinamico.json');
const reco = crearReconocimiento(estatico, dinamico);
const clases = estatico.etiquetas;

describe('ejes', () => {
  const p = { x: 0.6, y: 0.25, z: -0.04 };

  it('webcam horizontal: igual que aEjesDelSensor de web/index.js', () => {
    const r = recorteDe({ videoWidth: 1280, videoHeight: 720 });
    const anchoRecorte = (720 * 2) / 3;
    const [x, y, z] = aEjesDelRecorte([p], r)[0];
    expect(x).toBeCloseTo(1 - p.y, 12);
    expect(y).toBeCloseTo((p.x * 1280 - (1280 - anchoRecorte) / 2) / anchoRecorte, 12);
    expect(z).toBeCloseTo((p.z * 1280) / 720, 12);
  });

  it('celular vertical: recorte 2:3 y de ida y vuelta', () => {
    for (const video of [{ videoWidth: 480, videoHeight: 640 }, { videoWidth: 720, videoHeight: 1280 }]) {
      const r = recorteDe(video);
      expect(r.h / r.w).toBeCloseTo(1.5, 12);
      const [vuelta] = aVideo(aEjesDelRecorte([p], r), r);
      expect(vuelta.x).toBeCloseTo(p.x, 12);
      expect(vuelta.y).toBeCloseTo(p.y, 12);
      expect(vuelta.z).toBeCloseTo(p.z, 12);
    }
  });
});

describe('Haz la seña', () => {
  const mano = Array.from({ length: 21 }, () => [0.5, 0.5, 0]);
  const probs = (letra, p) => clases.map((c) => (c === letra ? p : (1 - p) / (clases.length - 1)));
  const cuadro = (letra, p, extra = {}) => ({
    mano,
    estatico: probs(letra, p),
    mejorForma: [letra, p],
    dinamico: null,
    dinamicaAceptada: null,
    ...extra,
  });

  it('estática: valida tras 600 ms con el promedio de la racha', () => {
    const prueba = reco.crearPrueba('A');
    expect(prueba.evaluar(cuadro('A', 0.9), 0).progreso).toBe(0);
    expect(prueba.evaluar(cuadro('A', 0.9), 300).progreso).toBeCloseTo(0.5);
    expect(prueba.evaluar(cuadro('A', 0.9), 600)).toEqual({
      validada: true,
      progreso: 1,
      pareceOtra: null,
      puntaje: 90,
    });
  });

  it('"Eso parece una P" tras 1 s; "ninguna" no se avisa', () => {
    const prueba = reco.crearPrueba('A');
    let r;
    for (let t = 0; t <= 1000; t += 50) r = prueba.evaluar(cuadro('P', 0.9), t);
    expect(r.pareceOtra).toBe('P');
    const otra = reco.crearPrueba('A');
    for (let t = 0; t <= 1000; t += 50) r = otra.evaluar(cuadro('ninguna', 0.95), t);
    expect(r.pareceOtra).toBeNull();
  });

  it('LL: valida al aceptarla el árbitro, con el puntaje de la L', () => {
    const prueba = reco.crearPrueba('LL');
    for (let t = 0; t < 600; t += 50) expect(prueba.evaluar(cuadro('L', 0.85), t).validada).toBe(false);
    const r = prueba.evaluar(cuadro('L', 0.85, { dinamicaAceptada: 'LL' }), 600);
    expect(r).toMatchObject({ validada: true, puntaje: 85 });
  });

  it('J: la mejor probabilidad del dinámico; K: sin puntaje', () => {
    const conJ = (p) => dinamico.etiquetas.map((c) => (c === 'J' ? p : 0));
    const j = reco.crearPrueba('J');
    j.evaluar(cuadro('I', 0.9, { dinamico: conJ(0.95) }), 0);
    const r = j.evaluar(cuadro('I', 0.9, { dinamico: conJ(0.92), dinamicaAceptada: 'J' }), 50);
    expect(r).toMatchObject({ validada: true, puntaje: 95 });
    const k = reco.crearPrueba('K');
    expect(k.evaluar(cuadro('P', 0.9, { dinamicaAceptada: 'K' }), 0)).toMatchObject({
      validada: true,
      puntaje: null,
    });
  });

  it('acepta las 29 letras y rechaza las demás', () => {
    const letras = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'LL', 'RR', 'Ñ'];
    for (const letra of letras) expect(() => reco.crearPrueba(letra)).not.toThrow();
    expect(() => reco.crearPrueba('espacio')).toThrow();
    expect(() => reco.crearPrueba('ninguna')).toThrow();
  });
});

describe('procesar de punta a punta con los modelos reales', () => {
  /** Una mano (ejes de la app) que el estático ve como letra con p >= 0.7. */
  function manoReconocible() {
    let semilla = 3;
    const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    for (let intento = 0; intento < 5000; intento++) {
      const muneca = [0.3 + azar() * 0.4, 0.3 + azar() * 0.4];
      const mano = Array.from({ length: 21 }, (_, i) => {
        if (i === 0) return [...muneca, 0];
        const a = (azar() - 0.5) * 2.4;
        const l = 0.02 + azar() * 0.23;
        return [muneca[0] + l * Math.cos(a), muneca[1] + l * Math.sin(a), 0];
      });
      const p = predecirEstatico(estatico, mano.flatMap(([x, y]) => [x - mano[0][0], y - mano[0][1]]));
      const i = indiceMayor(p);
      if (clases[i] !== 'ninguna' && p[i] >= 0.7) return { mano, letra: clases[i], p: p[i] };
    }
    throw new Error('no se encontró mano reconocible');
  }

  it('valida una sola vez, con manos para dibujar en coordenadas del video', () => {
    const video = { videoWidth: 480, videoHeight: 640 };
    const { mano, letra, p } = manoReconocible();
    const landmarks = aVideo(mano, recorteDe(video));
    const resultado = { landmarks: [landmarks], handedness: [[{ categoryName: 'Right', score: 1 }]] };
    const prueba = reco.crearPrueba(letra);
    const validaciones = [];
    let r;
    for (let t = 0; t <= 900; t += 50) {
      r = prueba.procesar(resultado, t, video);
      if (r.validada) validaciones.push({ t, puntaje: r.puntaje });
    }
    expect(validaciones).toEqual([{ t: 600, puntaje: Math.round(p * 100) }]);
    expect(r.manos[0][4].x).toBeCloseTo(landmarks[4].x, 6); // quieta: el filtro no la mueve
    expect(prueba.procesar({ landmarks: [] }, 1000, video).manos).toHaveLength(1); // persiste 0.2 s
  });
});
