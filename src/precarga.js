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
  try {
    return await HandLandmarker.createFromOptions(archivos, opciones('GPU'));
  } catch (error) {
    console.warn('Sin GPU para MediaPipe, uso CPU', error);
    return HandLandmarker.createFromOptions(archivos, opciones('CPU'));
  }
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
