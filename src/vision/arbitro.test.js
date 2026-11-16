// Port de test/arbitro_letras_test.dart. Tiempos en ms; mano: 21 [x, y, z].
import { describe, expect, it } from 'vitest';
import { ArbitroLetras } from './arbitro.js';

const puntos = (f) => Array.from({ length: 21 }, (_, i) => f(i));

/** Mano de tamaño 0.2 (muñeca a nudillo medio) con la palma corrida [dx]. */
const mano = (dx) => puntos((i) => [0.3 + dx, i === 9 ? 0.3 : 0.5, 0]);

/** Mano de tamaño 0.2 con la punta del meñique corrida ([dx], [dy]). */
const conMenique = (dx, dy) =>
  puntos((i) => (i === 9 ? [0.3, 0.3, 0] : i === 20 ? [0.3 + dx, 0.3 + dy, 0] : [0.3, 0.5, 0]));

/** Ve la I dos veces mientras el meñique se mueve por [recorrido]. */
function hacerI(arbitro, recorrido) {
  recorrido.forEach(([dx, dy], i) =>
    arbitro.decidir({ ahora: 600 + i * 50, estatica: '', mejorForma: ['I', 0.7], mano: conMenique(dx, dy) }),
  );
}

/** La punta del meñique barre 0.5 en x (3.75 manos): como el espacio. */
function barrer(arbitro, desde, estatica = '') {
  for (let k = 0; k <= 5; k++) {
    arbitro.decidir({ ahora: desde + k * 50, estatica, mano: conMenique(k * 0.1, 0) });
  }
}

/** La primera seña que entrega el árbitro entre [desde] y [hasta]. */
function entregada(arbitro, desde, hasta, estatica = '') {
  for (let t = desde; t <= hasta; t += 50) {
    const sena = arbitro.decidir({ ahora: t, estatica }).dinamica;
    if (sena !== null) return sena;
  }
  return null;
}

const ARCO_J = [[0, 0], [0.1, 0.1], [0.2, 0.3], [0.1, 0.4]];

describe('ArbitroLetras', () => {
  it('sin seña dinámica responde el estático', () => {
    const r = new ArbitroLetras().decidir({ ahora: 0, estatica: 'A' });
    expect(r.estatica).toBe('A');
    expect(r.dinamica).toBeNull();
  });

  it('con la mano en movimiento no hay letra estática', () => {
    const arbitro = new ArbitroLetras();
    for (let t = 0; t <= 300; t += 50) {
      expect(arbitro.decidir({ ahora: t, estatica: 'H', mano: mano(0) }).estatica).toBe('H');
    }
    let r;
    for (let t = 350; t <= 700; t += 50) {
      r = arbitro.decidir({ ahora: t, estatica: 'H', mano: mano((((t - 300) / 1000) * 0.2 * 2.5) / 1.5) });
    }
    expect(r.estatica).toBe('');
  });

  it('el espacio se entrega una vez, al detectarlo, y no se sostiene', () => {
    const arbitro = new ArbitroLetras();
    barrer(arbitro, 0);
    expect(arbitro.decidir({ ahora: 300, estatica: '', dinamica: 'espacio' }).dinamica).toBe('espacio');
    for (let t = 450; t <= 1500; t += 150) {
      expect(arbitro.decidir({ ahora: t, estatica: '', dinamica: 'espacio' }).dinamica).toBeNull();
    }
    expect(arbitro.decidir({ ahora: 1600, estatica: 'B' }).estatica).toBe('B');
    barrer(arbitro, 2000);
    expect(arbitro.decidir({ ahora: 2300, estatica: '', dinamica: 'espacio' }).dinamica).toBe('espacio');
  });

  it('la J espera 350 ms y solo cuenta si antes se vio la I', () => {
    const arbitro = new ArbitroLetras();
    arbitro.decidir({ ahora: 0, estatica: '', mejorForma: ['W', 0.9] });
    arbitro.decidir({ ahora: 30, estatica: '', dinamica: 'J' });
    expect(entregada(arbitro, 80, 500)).toBeNull();

    hacerI(arbitro, ARCO_J);
    expect(arbitro.decidir({ ahora: 800, estatica: 'I', dinamica: 'J' }).dinamica).toBeNull();
    expect(entregada(arbitro, 850, 1300, 'I')).toBe('J');
  });

  it('una I que apenas se mueve no es J', () => {
    const arbitro = new ArbitroLetras();
    hacerI(arbitro, [[0, 0], [0.02, 0.05], [0.03, 0.08]]);
    expect(arbitro.extensionMenique()).toBeLessThan(1.3);
    arbitro.decidir({ ahora: 760, estatica: '', dinamica: 'J' });
    expect(entregada(arbitro, 800, 1300)).toBeNull();
  });

  it('una I con poca confianza o vieja no habilita la J', () => {
    const arbitro = new ArbitroLetras();
    arbitro.decidir({ ahora: 0, estatica: '', mejorForma: ['I', 0.5] });
    arbitro.decidir({ ahora: 30, estatica: '', mejorForma: ['I', 0.5] });
    arbitro.decidir({ ahora: 60, estatica: '', dinamica: 'J' });
    expect(entregada(arbitro, 100, 500)).toBeNull();

    arbitro.decidir({ ahora: 600, estatica: '', mejorForma: ['I', 0.9] });
    arbitro.decidir({ ahora: 630, estatica: '', mejorForma: ['I', 0.9] });
    arbitro.decidir({ ahora: 3000, estatica: '', dinamica: 'J' });
    expect(entregada(arbitro, 3050, 3500)).toBeNull();
  });

  it('de la I a la G no es J: la mano queda quieta en la G', () => {
    const arbitro = new ArbitroLetras();
    hacerI(arbitro, ARCO_J);
    for (let t = 800; t <= 1300; t += 50) {
      arbitro.decidir({ ahora: t, estatica: 'G', mano: conMenique(0.1, 0.4) });
    }
    arbitro.decidir({ ahora: 1350, estatica: 'G', dinamica: 'J', mano: conMenique(0.1, 0.4) });
    expect(entregada(arbitro, 1400, 1900, 'G')).toBeNull();
  });

  it('si la J llega a mitad del giro y la mano queda en G, se cancela', () => {
    const arbitro = new ArbitroLetras();
    hacerI(arbitro, ARCO_J);
    arbitro.decidir({ ahora: 800, estatica: '', dinamica: 'J' });
    expect(entregada(arbitro, 850, 1400, 'G')).toBeNull();
  });

  it('si en la espera de la J el estático ya ve la G, se cancela', () => {
    function conForma(forma) {
      const arbitro = new ArbitroLetras();
      hacerI(arbitro, ARCO_J);
      let sena = null;
      for (let t = 800; t <= 1300; t += 50) {
        sena ??= arbitro.decidir({
          ahora: t,
          estatica: '',
          mejorForma: forma,
          dinamica: t === 800 ? 'J' : null,
        }).dinamica;
      }
      return sena;
    }
    expect(conForma(['G', 0.8])).toBeNull();
    expect(conForma(['I', 0.8])).toBe('J');
    expect(conForma(['ninguna', 0.9])).toBe('J');
    expect(conForma(['G', 0.5])).toBe('J');
  });

  it('espacio: no sin el barrido, ni con la H quieta', () => {
    function sosteniendo(letra) {
      const arbitro = new ArbitroLetras();
      for (let t = 0; t <= 500; t += 50) {
        arbitro.decidir({ ahora: t, estatica: letra, mano: conMenique(0, 0) });
      }
      return arbitro;
    }
    const espacio = (a, letra) => a.decidir({ ahora: 550, estatica: letra, dinamica: 'espacio' }).dinamica;
    expect(espacio(sosteniendo('G'), 'G')).toBeNull();
    expect(espacio(sosteniendo('H'), 'H')).toBeNull();
    const conBarrido = new ArbitroLetras();
    barrer(conBarrido, 200, 'H');
    expect(espacio(conBarrido, 'H')).toBe('espacio');
  });
});

describe('letras dobles, K y silencios', () => {
  /** Mano de tamaño 0.2 con la muñeca en (0.3, [y]); "hacia afuera" es +y. */
  const manoEn = (y) =>
    puntos((i) => {
      if (i === 0) return [0.3, y, 0];
      if (i === 5) return [0.3 + 0.2 / 1.5, y - 0.05, 0];
      if (i === 17) return [0.3 + 0.2 / 1.5, y + 0.05, 0];
      return [0.3 + 0.2 / 1.5, y, 0];
    });

  /** Sostiene [letra] 300 ms y mueve la mano con [enPaso](f) de f = 0 a 1. */
  function trazar(letra, enPaso, pasos = 12) {
    const arbitro = new ArbitroLetras();
    let sena = null;
    let t = 0;
    for (; t <= 300; t += 50) {
      sena ??= arbitro.decidir({ ahora: t, estatica: letra, mejorForma: [letra, 0.9], mano: enPaso(0) }).dinamica;
    }
    for (let k = 1; k <= pasos; k++, t += 50) {
      sena ??= arbitro.decidir({
        ahora: t,
        estatica: '',
        mejorForma: [letra, 0.8],
        mano: enPaso(k / pasos),
      }).dinamica;
    }
    return { sena, arbitro, t };
  }

  /** Desplaza la palma [manos] tamaños de mano hacia afuera en 600 ms. */
  const desplazar = (letra, manos) => trazar(letra, (f) => manoEn(0.5 + 0.2 * manos * f)).sena;

  /** Desplaza la palma ([x], [y]) tamaños de mano; los dedos apuntan a +x. */
  const mover = (letra, x, y, pasos = 12) =>
    trazar(
      letra,
      (f) => manoEn(0.5 + 0.2 * y * f).map(([px, py]) => [px + (0.2 / 1.5) * x * f, py, 0]),
      pasos,
    ).sena;

  /** Sostiene formas([i]) 1.5 s y luego el dinámico ve [letra]. */
  function trasSostener(letra, forma) {
    const arbitro = new ArbitroLetras();
    for (let i = 0; i < 30; i++) {
      arbitro.decidir({ ahora: i * 50, estatica: '', mejorForma: [forma(i), 0.9], mano: manoEn(0.5) });
    }
    return arbitro.decidir({
      ahora: 1500,
      estatica: '',
      mejorForma: [forma(30), 0.9],
      dinamica: letra,
      mano: manoEn(0.5),
    }).dinamica;
  }

  it('L o R desplazadas hacia afuera son LL y RR', () => {
    expect(desplazar('L', 1.0)).toBe('LL');
    expect(desplazar('R', 1.2)).toBe('RR');
  });

  it('la P desplazada hacia donde apuntan los dedos es K', () => {
    expect(mover('P', 1.0, 0)).toBe('K');
    expect(mover('P', 0.8, 0.5)).toBe('K');
  });

  it('la P quieta, de lado, hacia atrás o con otra letra: no es K', () => {
    expect(mover('P', 0.1, 0)).toBeNull();
    expect(mover('P', 0, 1.0)).toBeNull();
    expect(mover('P', -1.0, 0)).toBeNull();
    expect(mover('A', 1.0, 0)).toBeNull();
  });

  it('la Z no cuenta si la mano viene sostenida en L', () => {
    expect(trasSostener('Z', () => 'L')).toBeNull();
    expect(trasSostener('Z', (i) => (i % 2 === 0 ? 'D' : 'P'))).toBe('Z');
    expect(trasSostener('Z', (i) => (i % 3 === 0 ? 'L' : 'D'))).toBe('Z');
  });

  it('después de la X, la Q no cuenta por 1.5 s', () => {
    const arbitro = new ArbitroLetras();
    const sena = (t, letra) => arbitro.decidir({ ahora: t, estatica: '', dinamica: letra }).dinamica;
    expect(sena(0, 'X')).toBe('X');
    expect(sena(200, 'Q')).toBeNull();
    expect(sena(1400, 'Q')).toBeNull();
    expect(sena(1600, 'Q')).toBe('Q');
  });

  it('después de la LL, la Q y la Z no cuentan por 1.5 s', () => {
    const { sena, arbitro, t } = trazar('L', (f) => manoEn(0.5 + 0.2 * f));
    expect(sena).toBe('LL');
    const despues = (ventana, letra) =>
      arbitro.decidir({
        ahora: t + ventana,
        estatica: '',
        mejorForma: ['D', 0.9],
        dinamica: letra,
        mano: manoEn(0.8),
      }).dinamica;
    expect(despues(100, 'Q')).toBeNull();
    expect(despues(200, 'Z')).toBeNull();
    expect(despues(1700, 'Q')).toBe('Q');
  });

  it('la L con el índice doblado al final no es LL', () => {
    const doblada = (y) => {
      const base = manoEn(y);
      return base.map((p, i) => {
        if (i === 6) return [base[5][0] + 0.04, base[5][1], 0];
        if (i === 7) return [base[5][0] + 0.08, base[5][1], 0];
        if (i === 8) return base[5];
        return p;
      });
    };
    expect(trazar('L', (f) => doblada(0.5 + 0.2 * f)).sena).toBeNull();
  });

  it('la Q no cuenta si la mano viene en N', () => {
    expect(trasSostener('Q', () => 'N')).toBeNull();
    expect(trasSostener('Q', (i) => (i % 2 === 0 ? 'N' : 'D'))).toBeNull();
    expect(trasSostener('Q', (i) => (i % 4 === 0 ? 'N' : 'L'))).toBe('Q');
  });

  it('la P que se desliza despacio no es K', () => {
    expect(mover('P', 0.4, 0, 38)).toBeNull();
  });

  it('poco desplazamiento, hacia adentro o con otra letra: no', () => {
    expect(desplazar('L', 0.3)).toBeNull();
    expect(desplazar('L', -1.0)).toBeNull();
    expect(desplazar('A', 1.0)).toBeNull();
  });
});
