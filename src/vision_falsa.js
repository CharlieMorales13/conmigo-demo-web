// Doble temporal de src/vision/: misma interfaz, valida cualquier letra tras
// ~2 s con mano o sin ella. Solo para armar la UI mientras llega la real.

const MS_PARA_VALIDAR = 2000;

export async function cargarReconocimiento() {
  return {
    crearPrueba() {
      let inicio = null;
      return {
        procesar(resultado, ahora) {
          inicio ??= ahora;
          const progreso = Math.min(1, (ahora - inicio) / MS_PARA_VALIDAR);
          return {
            validada: progreso >= 1,
            progreso,
            pareceOtra: null,
            puntaje: progreso >= 1 ? 70 + Math.round(Math.random() * 30) : null,
            manos: resultado?.landmarks ?? [],
          };
        },
      };
    },
  };
}
