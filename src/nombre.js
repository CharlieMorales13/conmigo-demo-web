// Nombre que se deletrea en la demo: el primer nombre, en mayúsculas, sin
// acentos (la Ñ se queda), solo letras y 10 como máximo.

export const LARGO_MAXIMO_NOMBRE = 10;

// LSM deletrea la LL y la RR como una sola letra (igual que la app).
const LETRAS_DOBLES = ['LL', 'RR'];

function limpiar(palabra) {
  return palabra
    .toUpperCase()
    .normalize('NFD')
    .replace(/Ñ/g, 'Ñ') // la tilde de la Ñ no es acento: se recompone
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-ZÑ]/g, '');
}

export function normalizarNombre(texto) {
  const primero = texto
    .split(/\s+/)
    .map(limpiar)
    .find((palabra) => palabra.length > 0);
  return (primero ?? '').slice(0, LARGO_MAXIMO_NOMBRE);
}

export function letrasDe(nombre) {
  const letras = [];
  for (let i = 0; i < nombre.length; i++) {
    const doble = nombre.slice(i, i + 2);
    if (LETRAS_DOBLES.includes(doble)) {
      letras.push(doble);
      i++;
    } else {
      letras.push(nombre[i]);
    }
  }
  return letras;
}
