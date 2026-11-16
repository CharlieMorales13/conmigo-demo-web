// Port de lib/data/servicios/detector_dinamico.dart (DetectorDinamico):
// ventana de los últimos 2 s de puntos crudos, remuestreada por tiempo.
import { indiceMayor, predecirDinamico } from './modelos.js';

const NINGUNA = 'ninguna';
export const CUADROS_POR_VENTANA = 16;
export const DURACION_VENTANA_MS = 2000;
export const DURACION_MINIMA_MS = 1000;
export const HUECO_MAXIMO_MS = 500;
export const UMBRAL_CONFIANZA = 0.9;
export const UMBRALES_POR_CLASE = { Z: 0.8, Q: 0.8, X: 0.7 };
// inferirCadaCuadros = 1 en la app: se infiere en cada cuadro.

export const pasaUmbralDinamico = (clase, p) => p >= (UMBRALES_POR_CLASE[clase] ?? UMBRAL_CONFIANZA);

/**
 * [n] cuadros equiespaciados en el tiempo entre el primero y el último (al
 * menos 2), con interpolación lineal. cuadros: [{ t, v: [63 números] }].
 */
export function remuestrearPorTiempo(cuadros, n) {
  const inicio = cuadros[0].t;
  const fin = cuadros.at(-1).t;
  const resultado = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = inicio + ((fin - inicio) * i) / (n - 1);
    while (j < cuadros.length - 2 && cuadros[j + 1].t < t) j++;
    const a = cuadros[j];
    const b = cuadros[j + 1];
    const f = b.t === a.t ? 0 : Math.min(Math.max((t - a.t) / (b.t - a.t), 0), 1);
    resultado.push(a.v.map((va, k) => va + (b.v[k] - va) * f));
  }
  return resultado;
}

export class DetectorDinamico {
  ventana = [];
  /** Salida del modelo en el último cuadro, o null si no infirió. */
  ultimasProbabilidades = null;

  constructor(modelo) {
    this.modelo = modelo;
    this.clases = modelo.etiquetas;
  }

  /** [mano]: 21 puntos [x, y, z] del recorte, o null. Regresa la seña o null. */
  agregar(mano, ahora) {
    this.ultimasProbabilidades = null;
    if (mano === null) {
      const ultima = this.ventana.at(-1);
      if (ultima && ahora - ultima.t > HUECO_MAXIMO_MS) this.ventana = [];
      return null;
    }
    this.ventana.push({ t: ahora, v: mano.flat() });
    this.ventana = this.ventana.filter((c) => ahora - c.t <= DURACION_VENTANA_MS);
    if (ahora - this.ventana[0].t < DURACION_MINIMA_MS) return null;
    const probabilidades = predecirDinamico(
      this.modelo,
      remuestrearPorTiempo(this.ventana, CUADROS_POR_VENTANA),
    );
    this.ultimasProbabilidades = probabilidades;
    const mejor = indiceMayor(probabilidades);
    const letra = this.clases[mejor];
    return letra === NINGUNA || !pasaUmbralDinamico(letra, probabilidades[mejor]) ? null : letra;
  }
}
