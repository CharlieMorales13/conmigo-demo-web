// Port de lib/data/servicios/arbitro_letras.dart (ArbitroLetras). Las
// constantes y sus mediciones están documentadas allá; aquí van tal cual.
// Tiempos en milisegundos. [mano]: 21 puntos [x, y, z] del recorte 3:2.

export const FORMA_INICIAL = { J: 'I' };
export const UMBRAL_FORMA = 0.6;
export const CUADROS_CON_FORMA = 2;
export const VENTANA_FORMA_MS = 2000;
export const PAUSA_ENTRE_SENAS_MS = 500;
export const VELOCIDAD_MAXIMA_ESTATICA = 1.5;
export const VENTANA_VELOCIDAD_MS = 300;
export const EXTENSION_MINIMA_MENIQUE = { J: 1.3, espacio: 2.0 };
export const ESPERA_CONFIRMACION_J_MS = 350;
export const FRACCION_OTRA_FORMA_QUE_CANCELA = 0.5;
const NINGUNA = 'ninguna';

export const LETRAS_DOBLES = { L: 'LL', R: 'RR' };
export const DESPLAZAMIENTO_MINIMO_DOBLE = 0.6;
export const DESPLAZAMIENTO_MAXIMO_DOBLE = 2.5;
export const DESVIACION_MAXIMA_DOBLE = 0.5;
export const DURACION_MINIMA_DOBLE_MS = 300;
export const DURACION_MAXIMA_DOBLE_MS = 1200;
export const FORMA_MINIMA_DOBLE = 0.6;
export const FRACCION_CON_FORMA_DOBLE = 0.5;

export const FORMA_DE_LA_K = 'P';
export const DESPLAZAMIENTO_MINIMO_K = 0.35;
export const DESPLAZAMIENTO_MAXIMO_K = 2.5;
export const COSENO_MINIMO_K = 0.5;
export const DURACION_MINIMA_K_MS = 300;
export const DURACION_MAXIMA_K_MS = 2000;
export const FRACCION_CON_FORMA_K = 0.5;
export const VELOCIDAD_MINIMA_K = 0.5;
export const CORRELACION_MINIMA_K = 0.9;

export const FORMA_SOSTENIDA_QUE_DESCARTA = { Z: ['L', 0.6], Q: ['N', 0.4] };
export const VENTANA_FORMA_SOSTENIDA_MS = 1500;
export const RECTITUD_MINIMA_INDICE_LL = 0.85;
export const SILENCIO_QZ_TRAS_LL_MS = 1500;
export const SILENCIO_Q_TRAS_X_MS = 1500;
export const SILENCIO_ESPACIO_TRAS_DOBLE_MS = 600;

/** Las x del recorte 3:2 abarcan 1.5 veces lo que las y. */
const PROPORCION_RECORTE = 1.5;
const PUNTOS_PALMA = [0, 5, 9, 13, 17];

// Vectores 2D como [x, y].
const resta = (a, b) => [a[0] - b[0], a[1] - b[1]];
const suma = (a, b) => [a[0] + b[0], a[1] + b[1]];
const por = (a, k) => [a[0] * k, a[1] * k];
const largo = (a) => Math.hypot(a[0], a[1]);
const distancia = (a, b) => largo(resta(a, b));
const promedio = (v) => v.reduce((s, x) => s + x, 0) / v.length;

/** Punto [i] de la mano con la x a la escala de la y. */
const punto = (mano, i) => [mano[i][0] * PROPORCION_RECORTE, mano[i][1]];

function centroPalma(mano) {
  return por(PUNTOS_PALMA.map((i) => punto(mano, i)).reduce(suma), 1 / PUNTOS_PALMA.length);
}

function correlacion(a, b) {
  const mediaA = promedio(a);
  const mediaB = promedio(b);
  let cruzado = 0;
  let sumaA = 0;
  let sumaB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - mediaA;
    const y = b[i] - mediaB;
    cruzado += x * y;
    sumaA += x * x;
    sumaB += y * y;
  }
  const producto = Math.sqrt(sumaA * sumaB);
  return producto > 0 ? cruzado / producto : 0;
}

export class ArbitroLetras {
  formasVistas = {};
  palma = [];
  menique = [];
  ultimaDeteccion = {};
  jPendienteDesde = null;
  cuadrosEnEspera = 0;
  otrasFormasEnEspera = {};
  trayecto = [];
  ultimaDoble = -Infinity;
  ultimaLL = -Infinity;
  ultimaX = -Infinity;
  ultimaVelocidad = 0;

  /**
   * [estatica]: letra que ya pasó su umbral, o "". [mejorForma]: [letra, p]
   * del estático aunque no pase el umbral (o null). [dinamica]: lo que vio el
   * dinámico en este cuadro. Regresa { estatica, dinamica }.
   */
  decidir({ ahora, estatica, mejorForma = null, dinamica = null, mano = null }) {
    this.registrarForma(ahora, mejorForma);
    this.registrarMenique(ahora, mano);
    this.registrarTrayecto(ahora, mano, mejorForma);
    this.ultimaVelocidad = this.velocidad(ahora, mano);
    const mostrada = this.ultimaVelocidad > VELOCIDAD_MAXIMA_ESTATICA ? '' : estatica;
    let entregar = null;
    const pendiente = this.jPendienteDesde;
    if (pendiente !== null) {
      this.contarFormaEnEspera(mejorForma);
      if (mostrada !== '' && mostrada !== FORMA_INICIAL.J) {
        this.jPendienteDesde = null; // la mano se fue a otra letra
      } else if (ahora - pendiente >= ESPERA_CONFIRMACION_J_MS) {
        this.jPendienteDesde = null;
        if (!this.otraFormaEnEspera()) entregar = 'J';
      }
    }
    if (dinamica !== null && this.aceptar(dinamica, ahora)) {
      if (dinamica === 'J') {
        if (this.jPendienteDesde === null) {
          this.jPendienteDesde = ahora;
          this.cuadrosEnEspera = 0;
          this.otrasFormasEnEspera = {};
          this.contarFormaEnEspera(mejorForma);
        }
      } else {
        entregar ??= dinamica;
      }
    }
    const doble = this.letraDoble(ahora) ?? this.letraK(ahora);
    if (doble !== null) {
      this.ultimaDoble = ahora;
      if (doble === 'LL') this.ultimaLL = ahora;
      this.jPendienteDesde = null;
      entregar = doble;
    } else if (entregar === 'espacio' && ahora - this.ultimaDoble < SILENCIO_ESPACIO_TRAS_DOBLE_MS) {
      entregar = null;
    }
    if (entregar === 'X') this.ultimaX = ahora;
    return { estatica: mostrada, dinamica: entregar };
  }

  contarFormaEnEspera(mejorForma) {
    this.cuadrosEnEspera++;
    if (mejorForma === null) return;
    const [letra, probabilidad] = mejorForma;
    if (probabilidad < UMBRAL_FORMA || letra === FORMA_INICIAL.J || letra === NINGUNA) return;
    this.otrasFormasEnEspera[letra] = (this.otrasFormasEnEspera[letra] ?? 0) + 1;
  }

  otraFormaEnEspera() {
    return Object.values(this.otrasFormasEnEspera).some(
      (n) => n >= this.cuadrosEnEspera * FRACCION_OTRA_FORMA_QUE_CANCELA,
    );
  }

  vieneDeFormaQueDescarta(dinamica, ahora) {
    const regla = FORMA_SOSTENIDA_QUE_DESCARTA[dinamica];
    if (!regla) return false;
    const [forma, fraccion] = regla;
    const tramo = this.trayecto.filter((c) => ahora - c.t <= VENTANA_FORMA_SOSTENIDA_MS);
    if (tramo.length === 0) return false;
    return tramo.filter((c) => c.forma === forma).length >= tramo.length * fraccion;
  }

  aceptar(dinamica, ahora) {
    if (!this.formaVista(dinamica)) return false;
    if (this.vieneDeFormaQueDescarta(dinamica, ahora)) return false;
    if ((dinamica === 'Q' || dinamica === 'Z') && ahora - this.ultimaLL < SILENCIO_QZ_TRAS_LL_MS) {
      return false;
    }
    if (dinamica === 'Q' && ahora - this.ultimaX < SILENCIO_Q_TRAS_X_MS) return false;
    if (this.extensionMenique() < (EXTENSION_MINIMA_MENIQUE[dinamica] ?? 0)) return false;
    const anterior = this.ultimaDeteccion[dinamica];
    this.ultimaDeteccion[dinamica] = ahora;
    return anterior === undefined || ahora - anterior >= PAUSA_ENTRE_SENAS_MS;
  }

  registrarTrayecto(ahora, mano, mejorForma) {
    this.trayecto = this.trayecto.filter((c) => ahora - c.t <= DURACION_MAXIMA_K_MS);
    if (mano === null) {
      this.trayecto = [];
      return;
    }
    const p = (i) => punto(mano, i);
    const tramo = (a, b) => distancia(p(a), p(b));
    const largoDedo = tramo(5, 6) + tramo(6, 7) + tramo(7, 8);
    const afuera = resta(p(17), p(5));
    const largoAfuera = largo(afuera);
    const forma = mejorForma !== null && mejorForma[1] >= FORMA_MINIMA_DOBLE ? mejorForma[0] : '';
    this.trayecto.push({
      t: ahora,
      centro: centroPalma(mano),
      afuera: largoAfuera > 0 ? por(afuera, 1 / largoAfuera) : [0, 0],
      tamano: distancia(p(9), p(0)),
      forma,
      eje: resta(p(9), p(0)),
      indiceRecto: largoDedo > 0 ? tramo(5, 8) / largoDedo : 0,
    });
  }

  /** Tramo del trayecto desde [inicio] y el tamaño medio de la mano en él. */
  tramoDesde(inicio) {
    const tramo = this.trayecto.filter((c) => c.t >= inicio.t);
    return { tramo, tamano: promedio(tramo.map((c) => c.tamano)) };
  }

  letraK(ahora) {
    if (ahora - this.ultimaDoble < DURACION_MAXIMA_DOBLE_MS) return null;
    const fin = this.trayecto.at(-1);
    if (this.trayecto.length < 3 || fin.forma !== FORMA_DE_LA_K) return null;
    for (const inicio of this.trayecto) {
      if (fin.t - inicio.t < DURACION_MINIMA_K_MS) break;
      if (inicio.forma !== FORMA_DE_LA_K) continue;
      const { tramo, tamano } = this.tramoDesde(inicio);
      const conForma = tramo.filter((c) => c.forma === FORMA_DE_LA_K).length;
      if (conForma < tramo.length * FRACCION_CON_FORMA_K) continue;
      const eje = tramo.map((c) => c.eje).reduce(suma);
      const d = resta(fin.centro, inicio.centro);
      if (tamano <= 0 || largo(eje) <= 0 || largo(d) <= 0) continue;
      const manos = largo(d) / tamano;
      const coseno = (d[0] * eje[0] + d[1] * eje[1]) / largo(d) / largo(eje);
      const segundos = (fin.t - inicio.t) / 1000;
      if (
        manos >= DESPLAZAMIENTO_MINIMO_K &&
        manos <= DESPLAZAMIENTO_MAXIMO_K &&
        coseno >= COSENO_MINIMO_K &&
        manos / segundos >= VELOCIDAD_MINIMA_K &&
        this.pareceMedioCoseno(tramo, d) >= CORRELACION_MINIMA_K
      ) {
        return 'K';
      }
    }
    return null;
  }

  pareceMedioCoseno(tramo, d) {
    const inicio = tramo[0];
    const total = tramo.at(-1).t - inicio.t;
    const avance = tramo.map(
      (c) => ((c.centro[0] - inicio.centro[0]) * d[0] + (c.centro[1] - inicio.centro[1]) * d[1]) / largo(d),
    );
    const ideal = tramo.map((c) => (1 - Math.cos((Math.PI * (c.t - inicio.t)) / total)) / 2);
    return correlacion(avance, ideal);
  }

  letraDoble(ahora) {
    if (ahora - this.ultimaDoble < DURACION_MAXIMA_DOBLE_MS) return null;
    if (this.trayecto.length < 3) return null;
    const fin = this.trayecto.at(-1);
    const doble = LETRAS_DOBLES[fin.forma];
    if (!doble) return null;
    if (doble === 'LL' && !this.indiceExtendidoAlFinal()) return null;
    for (const inicio of this.trayecto) {
      const duracion = fin.t - inicio.t;
      if (duracion < DURACION_MINIMA_DOBLE_MS) break;
      if (duracion > DURACION_MAXIMA_DOBLE_MS) continue;
      if (inicio.forma !== fin.forma) continue;
      const { tramo, tamano } = this.tramoDesde(inicio);
      const conForma = tramo.filter((c) => c.forma === fin.forma).length;
      if (conForma < tramo.length * FRACCION_CON_FORMA_DOBLE) continue;
      const afuera = suma(inicio.afuera, fin.afuera);
      const largoAfuera = largo(afuera);
      if (tamano <= 0 || largoAfuera <= 0) continue;
      const direccion = por(afuera, 1 / largoAfuera);
      const d = resta(fin.centro, inicio.centro);
      const avance = (d[0] * direccion[0] + d[1] * direccion[1]) / tamano;
      const desvio = Math.abs(d[0] * direccion[1] - d[1] * direccion[0]) / tamano;
      if (
        avance >= DESPLAZAMIENTO_MINIMO_DOBLE &&
        avance <= DESPLAZAMIENTO_MAXIMO_DOBLE &&
        desvio <= avance * DESVIACION_MAXIMA_DOBLE
      ) {
        return doble;
      }
    }
    return null;
  }

  indiceExtendidoAlFinal() {
    return promedio(this.trayecto.slice(-3).map((c) => c.indiceRecto)) >= RECTITUD_MINIMA_INDICE_LL;
  }

  registrarMenique(ahora, mano) {
    this.menique = this.menique.filter((m) => ahora - m.t <= VENTANA_FORMA_MS);
    if (mano === null) return;
    this.menique.push({
      t: ahora,
      punta: resta(punto(mano, 20), punto(mano, 0)),
      tamano: distancia(punto(mano, 9), punto(mano, 0)),
    });
  }

  /** Lo más que se alejó la punta del meñique de sí misma, en tamaños de mano. */
  extensionMenique() {
    const m = this.menique;
    if (m.length < 2) return 0;
    const tamano = promedio(m.map((x) => x.tamano));
    if (tamano <= 0) return 0;
    let maxima = 0;
    for (let i = 0; i < m.length; i++) {
      for (let j = i + 1; j < m.length; j++) {
        maxima = Math.max(maxima, distancia(m[i].punta, m[j].punta));
      }
    }
    return maxima / tamano;
  }

  /** Tamaños de mano por segundo del centro de la palma en los últimos 300 ms. */
  velocidad(ahora, mano) {
    if (mano === null) {
      this.palma = [];
      return 0;
    }
    const centro = centroPalma(mano);
    const tamano = distancia(punto(mano, 9), punto(mano, 0));
    this.palma.push({ t: ahora, centro });
    this.palma = this.palma.filter((m) => ahora - m.t <= VENTANA_VELOCIDAD_MS);
    const primero = this.palma[0];
    const segundos = (ahora - primero.t) / 1000;
    if (segundos <= 0 || tamano <= 0) return 0;
    return distancia(primero.centro, centro) / tamano / segundos;
  }

  registrarForma(ahora, mejorForma) {
    for (const letra of Object.keys(this.formasVistas)) {
      this.formasVistas[letra] = this.formasVistas[letra].filter((t) => ahora - t <= VENTANA_FORMA_MS);
    }
    if (mejorForma === null) return;
    const [letra, probabilidad] = mejorForma;
    if (probabilidad >= UMBRAL_FORMA && Object.values(FORMA_INICIAL).includes(letra)) {
      (this.formasVistas[letra] ??= []).push(ahora);
    }
  }

  formaVista(dinamica) {
    const forma = FORMA_INICIAL[dinamica];
    if (forma === undefined) return true;
    return (this.formasVistas[forma]?.length ?? 0) >= CUADROS_CON_FORMA;
  }
}
