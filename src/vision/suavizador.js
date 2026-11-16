// Port de lib/data/servicios/suavizador_mano.dart: filtro One Euro por
// coordenada, solo para dibujar (los modelos usan los puntos crudos).

const CORTE_MINIMO = 0.05;
const BETA = 3.0;
const CORTE_DERIVADA = 1.0;
const PERSISTENCIA_SEGUNDOS = 0.2;

const alfa = (corteHz, segundos) => 1 / (1 + 1 / (2 * Math.PI * corteHz) / segundos);

class FiltroUnEuro {
  valor = null;
  derivada = 0;

  filtrar(valor, segundos, escala) {
    const anterior = this.valor;
    if (anterior === null || segundos <= 0) return (this.valor = valor);
    const derivadaCruda = ((valor - anterior) * escala) / segundos;
    this.derivada += alfa(CORTE_DERIVADA, segundos) * (derivadaCruda - this.derivada);
    const corte = CORTE_MINIMO + BETA * Math.abs(this.derivada);
    return (this.valor = anterior + alfa(corte, segundos) * (valor - anterior));
  }
}

/** Promedio de ancho y alto de la caja de la mano (como MediaPipe). */
function tamano(mano) {
  const xs = mano.map((p) => p[0]);
  const ys = mano.map((p) => p[1]);
  const ancho = Math.max(...xs) - Math.min(...xs);
  const alto = Math.max(...ys) - Math.min(...ys);
  return Math.max((ancho + alto) / 2, 1e-3);
}

export class SuavizadorMano {
  filtros = [];
  ultima = null;
  ultimoTiempo = 0;

  /** [mano]: 21 puntos [x, y, z] o null, en el instante [segundos]. */
  filtrar(mano, segundos) {
    const transcurrido = segundos - this.ultimoTiempo;
    if (mano === null) {
      if (transcurrido > PERSISTENCIA_SEGUNDOS) this.reiniciar();
      return this.ultima;
    }
    if (this.ultima === null || transcurrido > PERSISTENCIA_SEGUNDOS) this.reiniciar();
    const escala = 1 / tamano(mano);
    let i = 0;
    this.ultima = mano.map((p) => p.map((v) => this.filtros[i++].filtrar(v, transcurrido, escala)));
    this.ultimoTiempo = segundos;
    return this.ultima;
  }

  reiniciar() {
    this.ultima = null;
    this.filtros = Array.from({ length: 21 * 3 }, () => new FiltroUnEuro());
  }
}
