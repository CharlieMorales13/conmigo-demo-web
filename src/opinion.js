import { initializeApp } from 'firebase/app';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore/lite';

let db = null;

// Firebase se inicia hasta el primer envío: sin variables de entorno,
// getFirestore lanza, y así solo falla el envío y no toda la página.
function baseDeDatos() {
  db ??= getFirestore(
    initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }),
  );
  return db;
}

// Exactamente estos 4 campos: las reglas de Firestore no aceptan otros.
export async function enviarOpinion({ nombre, estrellas, comentario }) {
  return addDoc(collection(baseDeDatos(), 'testers_demo'), {
    nombre,
    estrellas,
    comentario,
    creado: serverTimestamp(),
  });
}
