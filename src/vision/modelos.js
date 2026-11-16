// Forward pass de los dos modelos de la app, sin librerías de ML. Los pesos
// salen de los .tflite con `ml/exportar_modelos_web.py`; las cuentas siguen el
// grafo real de cada uno (ver ese script y ml/entrenar_*.py).

const relu = (v) => (v > 0 ? v : 0);

/** Capa densa con pesos [salidas][entradas]. */
function densa(entrada, { pesos, sesgos }, activacion) {
  return pesos.map((fila, o) => {
    let suma = sesgos[o];
    for (let i = 0; i < fila.length; i++) suma += fila[i] * entrada[i];
    return activacion ? activacion(suma) : suma;
  });
}

function softmax(v) {
  const maximo = Math.max(...v);
  const e = v.map((x) => Math.exp(x - maximo));
  const total = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / total);
}

/**
 * Modelo estático (MLP). [entrada]: 42 números, x,y de cada punto menos la
 * muñeca. Dentro se divide entre la distancia muñeca-nudillo medio.
 */
export function predecirEstatico(modelo, entrada) {
  const n = modelo.nudillo;
  const tamano = Math.hypot(entrada[2 * n], entrada[2 * n + 1]) + modelo.epsilon;
  let x = entrada.map((v) => v / tamano);
  const capas = modelo.capas;
  capas.forEach((capa, i) => {
    x = densa(x, capa, i < capas.length - 1 ? relu : null);
  });
  return softmax(x);
}

/** Conv1D con padding "same" y relu. pesos: [salidas][ancho][entradas]. */
function conv1d(cuadros, { pesos, sesgos }) {
  const medio = (pesos[0].length - 1) / 2;
  return cuadros.map((_, t) =>
    pesos.map((filtro, o) => {
      let suma = sesgos[o];
      filtro.forEach((pesosK, k) => {
        const cuadro = cuadros[t + k - medio];
        if (!cuadro) return;
        for (let i = 0; i < pesosK.length; i++) suma += pesosK[i] * cuadro[i];
      });
      return relu(suma);
    }),
  );
}

/**
 * Preprocesado del modelo dinámico (capa Preprocesar de
 * ml/entrenar_dinamico.py): relativo a la muñeca del primer cuadro, ejes a
 * escala, dividido entre el tamaño medio de la mano, más la velocidad.
 */
function preprocesar(modelo, ventana) {
  const [mx, my, mz] = ventana[0]; // muñeca del primer cuadro
  const escala = modelo.escalaEjes;
  const rel = ventana.map((c) =>
    c.map((v, i) => (v - [mx, my, mz][i % 3]) * escala[i % 3]),
  );
  const nudillo = 9 * 3;
  const tamanos = rel.map((c) => Math.hypot(c[nudillo] - c[0], c[nudillo + 1] - c[1]));
  const tamano = tamanos.reduce((a, b) => a + b, 0) / tamanos.length + modelo.epsilon;
  const f = rel.map((c) => c.map((v) => v / tamano));
  return f.map((c, t) => [
    ...c,
    ...c.map((v, i) => (t === 0 ? 0 : v - f[t - 1][i])),
  ]);
}

/** Modelo dinámico (CNN 1D). [ventana]: 16 cuadros de 63 números (x,y,z crudos). */
export function predecirDinamico(modelo, ventana) {
  let x = preprocesar(modelo, ventana);
  for (const conv of modelo.convs) x = conv1d(x, conv);
  const media = x[0].map((_, j) => x.reduce((s, c) => s + c[j], 0) / x.length);
  return softmax(densa(media, modelo.densa));
}

/** Índice de la probabilidad más alta (la primera si empatan, como la app). */
export function indiceMayor(probabilidades) {
  let mejor = 0;
  for (let i = 1; i < probabilidades.length; i++) {
    if (probabilidades[i] > probabilidades[mejor]) mejor = i;
  }
  return mejor;
}
