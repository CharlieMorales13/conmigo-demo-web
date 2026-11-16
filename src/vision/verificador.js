// Port de lib/data/servicios/verificador_sena.dart (VerificadorSena,
// DetectorConfusion) y puntaje_sena.dart (PuntajeSena). Tiempos en ms.

export const UMBRAL_PARECIDA = 0.7;
export const TIEMPO_PARA_VALIDAR_MS = 600;
export const UMBRAL_NO_SE_PARECE = 0.3;
export const TIEMPO_PARA_AVISAR_MS = 1500;

/** 'esperando' | 'parecida' | 'noSeParece' | 'valida'. */
export class VerificadorSena {
  parecidaDesde = null;
  distintaDesde = null;
  estado = 'esperando';

  /** [probabilidad] de la letra esperada; null sin mano. */
  ver(probabilidad, ahora) {
    if (this.estado === 'valida') return this.estado;
    if (probabilidad === null) {
      this.parecidaDesde = this.distintaDesde = null;
      return (this.estado = 'esperando');
    }
    if (probabilidad >= UMBRAL_PARECIDA) {
      this.distintaDesde = null;
      this.parecidaDesde ??= ahora;
      return (this.estado =
        ahora - this.parecidaDesde >= TIEMPO_PARA_VALIDAR_MS ? 'valida' : 'parecida');
    }
    this.parecidaDesde = null;
    if (probabilidad >= UMBRAL_NO_SE_PARECE) {
      this.distintaDesde = null;
      return (this.estado = 'esperando');
    }
    this.distintaDesde ??= ahora;
    return (this.estado =
      ahora - this.distintaDesde >= TIEMPO_PARA_AVISAR_MS ? 'noSeParece' : 'esperando');
  }

  /** 0..1 de la racha hacia validar (no está en la app: es para la barra de la demo). */
  progreso(ahora) {
    if (this.estado === 'valida') return 1;
    if (this.parecidaDesde === null) return 0;
    return Math.min((ahora - this.parecidaDesde) / TIEMPO_PARA_VALIDAR_MS, 1);
  }

  validarDinamica() {
    return (this.estado = 'valida');
  }
}

export const UMBRAL_OTRA_LETRA = 0.8;
export const TIEMPO_PARA_AVISAR_CONFUSION_MS = 1000;

/** "Eso parece una P": otra letra con mucha certeza, sostenida 1 s. */
export class DetectorConfusion {
  candidata = null;
  desde = null;

  /** [mejor]: [letra, p] del estático, o null sin mano. */
  ver(mejor, esperada, ahora) {
    if (mejor === null || mejor[0] === esperada || mejor[1] < UMBRAL_OTRA_LETRA) {
      this.candidata = this.desde = null;
      return null;
    }
    if (mejor[0] !== this.candidata) {
      this.candidata = mejor[0];
      this.desde = ahora;
    }
    return ahora - this.desde >= TIEMPO_PARA_AVISAR_CONFUSION_MS ? this.candidata : null;
  }
}

const VENTANA_PUNTAJE_MS = TIEMPO_PARA_VALIDAR_MS;
const HISTORIAL_PUNTAJE_MS = 3000;
const PUNTAJE_MAXIMO = 100;

const aPuntaje = (p) => Math.min(Math.max(Math.round(p * PUNTAJE_MAXIMO), 0), PUNTAJE_MAXIMO);

/** Probabilidad de la letra esperada cuadro por cuadro; el puntaje al validar. */
export class PuntajeSena {
  estatico = [];
  dinamico = [];

  /** null (sin mano) cuenta como 0. */
  agregarEstatico(probabilidad, ahora) {
    this.estatico = agregar(this.estatico, probabilidad ?? 0, ahora);
  }

  agregarDinamico(probabilidad, ahora) {
    this.dinamico = agregar(this.dinamico, probabilidad, ahora);
  }

  /** Promedio ×100 de los cuadros de los últimos 600 ms (la racha que validó). */
  puntajeEstatico() {
    if (this.estatico.length === 0) return 0;
    const fin = this.estatico.at(-1).t;
    const racha = this.estatico.filter((m) => fin - m.t <= VENTANA_PUNTAJE_MS);
    return aPuntaje(racha.reduce((s, m) => s + m.p, 0) / racha.length);
  }

  /** La mejor probabilidad reciente del dinámico ×100. */
  puntajeDinamico() {
    if (this.dinamico.length === 0) return 0;
    return aPuntaje(Math.max(...this.dinamico.map((m) => m.p)));
  }
}

function agregar(lista, p, ahora) {
  lista.push({ t: ahora, p });
  return lista.filter((m) => ahora - m.t <= HISTORIAL_PUNTAJE_MS);
}
