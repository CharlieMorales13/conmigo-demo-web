// Carga MediaPipe y los modelos una sola vez. Inicio la llama en cuanto se
// abre la página, para que al llegar a Deletrea ya esté todo listo.

// Único lugar para elegir el reconocimiento: './vision_falsa.js' valida todo
// a los 2 s, para probar la UI sin modelos.
import { cargarReconocimiento } from './vision/index.js';

async function crearDetectorDeManos() {
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
  const archivos = await FilesetResolver.forVisionTasks('/mediapipe_wasm');
  const opciones = (delegate) => ({
    baseOptions: { modelAssetPath: '/modelos/hand_landmarker.task', delegate },
    runningMode: 'VIDEO',
    numHands: 1,
  });
  let detector = null;
  try {
    detector = await HandLandmarker.createFromOptions(archivos, opciones('GPU'));
    calentar(detector);
    return detector;
  } catch (error) {
    console.warn('Sin GPU para MediaPipe, uso CPU', error);
    detector?.close();
    detector = await HandLandmarker.createFromOptions(archivos, opciones('CPU'));
    calentar(detector);
    return detector;
  }
}

const LADO_CALENTAMIENTO = 256;

/** El primer cuadro que procesa MediaPipe prepara la GPU y congela la cámara
 *  1 a 3 s. Se hace aquí, con una imagen vacía, mientras escriben su nombre.
 *  ponytail: sin mano en la imagen solo se calienta el detector de palmas; el
 *  de puntos se prepara con la primera mano real, que tarda mucho menos. */
function calentar(detector) {
  const lienzo = document.createElement('canvas');
  lienzo.width = LADO_CALENTAMIENTO;
  lienzo.height = LADO_CALENTAMIENTO;
  lienzo.getContext('2d').fillRect(0, 0, LADO_CALENTAMIENTO, LADO_CALENTAMIENTO);
  // VIDEO pide tiempos crecientes; los de la cámara (performance.now) serán mayores.
  detector.detectForVideo(lienzo, performance.now());
}

let carga = null;

export function precargar() {
  carga ??= Promise.all([crearDetectorDeManos(), cargarReconocimiento('/modelos')])
    .then(([detector, reco]) => ({ detector, reco }))
    .catch((error) => {
      carga = null; // que el siguiente intento vuelva a cargar
      throw error;
    });
  return carga;
}
