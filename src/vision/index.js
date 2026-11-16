// Reconocimiento de letras de "Haz la seña" en el navegador: mismos modelos,
// umbrales y reglas que la app (lib/data/servicios/ y
// lib/presentation/lesson/ejercicios/ejercicio_haz_la_sena.dart).
//
// EJES Y ESPEJO (el riesgo nº 1). En la app, la cámara frontal manda el cuadro
// del sensor SIN espejo y SIN rotar; MotorVision.kt lo recorta al centro a 3:2
// (720x480) y MediaPipe regresa los puntos en los ejes de ese recorte sin
// rotar. Visto en vertical: "arriba" es +x y el pulgar de la mano derecha
// apunta a +y (medido con el dataset v2; web/README.md). El <video> del
// navegador ya viene derecho y sin espejo, así que la conversión es solo una
// rotación de 90° más el recorte vertical 2:3 (la misma de aEjesDelSensor en
// web/index.js y de ml/extraer_msl_dinamico.py, con la que se entrenó):
// x = 1 - v, y = u, z en unidades del lado largo del recorte. No se espeja ni
// se usa la lateralidad: los modelos se entrenaron con espejo (las dos manos).
// Por eso `zurdo` no cambia el reconocimiento; en la app solo voltea la foto.
import { ArbitroLetras, LETRAS_DOBLES } from './arbitro.js';
import { DetectorDinamico } from './detectorDinamico.js';
import { indiceMayor, predecirEstatico } from './modelos.js';
import { SuavizadorMano } from './suavizador.js';
import { DetectorConfusion, PuntajeSena, VerificadorSena } from './verificador.js';

// ServicioVision.umbralConfianza y umbralesPorLetra (servicio_vision.dart).
export const UMBRAL_CONFIANZA = 0.95;
export const UMBRALES_POR_LETRA = { E: 0.8, T: 0.8, S: 0.8, R: 0.7, U: 0.85, D: 0.8, M: 0.8 };
const NINGUNA = 'ninguna';
const PROPORCION_RECORTE = 1.5;
// Si no llega el <video>: lo que da getUserMedia 640x480 en un celular vertical.
const VIDEO_POR_DEFECTO = { videoWidth: 480, videoHeight: 640 };
// Letras por regla sin forma base en el estático; LL y RR usan L y R
// (_formaBaseDeRegla en ejercicio_haz_la_sena.dart).
const SOLO_POR_REGLA = ['K'];
const FORMA_BASE = Object.fromEntries(Object.entries(LETRAS_DOBLES).map(([b, d]) => [d, b]));

export const pasaUmbral = (letra, p) => p > (UMBRALES_POR_LETRA[letra] ?? UMBRAL_CONFIANZA);

/** Recorte vertical 2:3 centrado del video, en pixeles. */
export function recorteDe({ videoWidth: ancho, videoHeight: alto }) {
  const w = Math.min(ancho, alto / PROPORCION_RECORTE);
  const h = w * PROPORCION_RECORTE;
  return { ancho, alto, w, h, izquierda: (ancho - w) / 2, arriba: (alto - h) / 2 };
}

/** Puntos de MediaPipe (video completo, derecho, sin espejo) a los ejes del recorte de la app. */
export function aEjesDelRecorte(puntos, r) {
  return puntos.map((p) => [
    1 - (p.y * r.alto - r.arriba) / r.h,
    (p.x * r.ancho - r.izquierda) / r.w,
    (p.z * r.ancho) / r.h,
  ]);
}

/** Lo inverso, para dibujar sobre el video. */
export function aVideo(mano, r) {
  return mano.map(([x, y, z]) => ({
    x: (r.izquierda + y * r.w) / r.ancho,
    y: (r.arriba + (1 - x) * r.h) / r.alto,
    z: (z * r.h) / r.ancho,
  }));
}

/** x, y de cada punto menos la muñeca (Mano.coordenadasRelativasAMuneca). */
const relativasAMuneca = (mano) => mano.flatMap(([x, y]) => [x - mano[0][0], y - mano[0][1]]);

async function leerJson(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${ruta}: ${respuesta.status}`);
  const modelo = await respuesta.json();
  modelo.etiquetas = modelo.etiquetas.map((e) => e.normalize('NFC'));
  return modelo;
}

/** Carga los pesos desde `${base}/estatico.json` y `${base}/dinamico.json`. */
export async function cargarReconocimiento(base = '/modelos') {
  const [estatico, dinamico] = await Promise.all([
    leerJson(`${base}/estatico.json`),
    leerJson(`${base}/dinamico.json`),
  ]);
  return crearReconocimiento(estatico, dinamico);
}

export function crearReconocimiento(estatico, dinamico) {
  const validas = new Set([
    ...estatico.etiquetas,
    ...dinamico.etiquetas,
    ...Object.keys(FORMA_BASE),
    ...SOLO_POR_REGLA,
  ]);
  validas.delete(NINGUNA);
  validas.delete('espacio');
  return {
    crearPrueba(letra, { zurdo = false } = {}) {
      const esperada = letra.normalize('NFC');
      if (!validas.has(esperada)) throw new Error(`Letra no reconocible: ${letra}`);
      return new Prueba(estatico, dinamico, esperada, zurdo);
    },
  };
}

class Prueba {
  arbitro = new ArbitroLetras();
  suavizador = new SuavizadorMano();
  verificador = new VerificadorSena();
  puntaje = new PuntajeSena();
  confusion = new DetectorConfusion();
  validada = false;
  puntajeFinal = null;

  constructor(estatico, dinamico, letra, zurdo) {
    this.estatico = estatico;
    this.detector = new DetectorDinamico(dinamico);
    this.letra = letra;
    this.zurdo = zurdo; // no cambia el reconocimiento (ver arriba)
  }

  /** [video]: el <video> (o algo con videoWidth/videoHeight) del que salió [resultado]. */
  procesar(resultado, tMs, video = VIDEO_POR_DEFECTO) {
    const recorte = recorteDe(video.videoWidth ? video : VIDEO_POR_DEFECTO);
    const puntos = resultado?.landmarks?.[0];
    const mano = puntos ? aEjesDelRecorte(puntos, recorte) : null;
    const cuadro = this.verCuadro(mano, tMs);
    const dibujo = this.suavizador.filtrar(mano, tMs / 1000);
    const manos = [
      ...(dibujo ? [aVideo(dibujo, recorte)] : []),
      ...(resultado?.landmarks?.slice(1) ?? []),
    ];
    if (this.validada) {
      return { validada: false, progreso: 1, pareceOtra: null, puntaje: this.puntajeFinal, manos };
    }
    return { ...this.evaluar(cuadro, tMs), manos };
  }

  /** Lo que hace ServicioVision con cada resultado del motor. */
  verCuadro(mano, ahora) {
    const estatico = mano ? predecirEstatico(this.estatico, relativasAMuneca(mano)) : null;
    let mejorForma = null;
    if (estatico) {
      const i = indiceMayor(estatico);
      mejorForma = [this.estatico.etiquetas[i], estatico[i]];
    }
    const estatica =
      mejorForma && mejorForma[0] !== NINGUNA && pasaUmbral(...mejorForma) ? mejorForma[0] : '';
    const dinamica = this.detector.agregar(mano, ahora);
    const decision = this.arbitro.decidir({ ahora, estatica, mejorForma, dinamica, mano });
    return {
      mano,
      estatico,
      mejorForma,
      dinamico: this.detector.ultimasProbabilidades,
      dinamicaAceptada: decision.dinamica,
    };
  }

  /** EjercicioHazLaSena._alVerCuadro. */
  evaluar(cuadro, ahora) {
    const letra = this.letra;
    const indiceDinamico = this.detector.clases.indexOf(letra);
    if (indiceDinamico >= 0 && cuadro.dinamico) {
      this.puntaje.agregarDinamico(cuadro.dinamico[indiceDinamico], ahora);
    }
    const base = FORMA_BASE[letra];
    if (base) this.puntaje.agregarEstatico(this.probabilidadDe(cuadro, base), ahora);
    if (cuadro.dinamicaAceptada === letra) {
      this.verificador.validarDinamica();
      if (base) return this.validar(this.puntaje.puntajeEstatico());
      return this.validar(indiceDinamico >= 0 ? this.puntaje.puntajeDinamico() : null);
    }
    const probabilidad = this.probabilidadDe(cuadro, letra);
    let pareceOtra = null;
    // Solo en letras estáticas: la J empieza con la forma de la I.
    if (this.estatico.etiquetas.includes(letra)) {
      this.puntaje.agregarEstatico(probabilidad, ahora);
      pareceOtra = this.confusion.ver(cuadro.mano ? cuadro.mejorForma : null, letra, ahora);
      // ponytail: la app diría "Eso parece una ninguna"; aquí no se avisa.
      if (pareceOtra === NINGUNA) pareceOtra = null;
    }
    if (this.verificador.ver(probabilidad, ahora) === 'valida') {
      return this.validar(this.puntaje.puntajeEstatico());
    }
    return { validada: false, progreso: this.verificador.progreso(ahora), pareceOtra, puntaje: null };
  }

  validar(puntaje) {
    this.validada = true;
    this.puntajeFinal = puntaje;
    return { validada: true, progreso: 1, pareceOtra: null, puntaje };
  }

  /** Probabilidad estática de [letra]; null sin mano o si no es clase del estático. */
  probabilidadDe(cuadro, letra) {
    const i = this.estatico.etiquetas.indexOf(letra);
    return cuadro.mano && i >= 0 && cuadro.estatico ? cuadro.estatico[i] : null;
  }
}
