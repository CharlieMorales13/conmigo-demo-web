// Port de test/verificador_sena_test.dart y test/puntaje_sena_test.dart.
import { describe, expect, it } from 'vitest';
import { DetectorConfusion, PuntajeSena, VerificadorSena } from './verificador.js';

function sostener(v, p, desde, hasta) {
  let estado;
  for (let t = desde; t <= hasta; t += 50) estado = v.ver(p, t);
  return estado;
}

describe('VerificadorSena', () => {
  it('la seña parecida sostenida se valida', () => {
    const v = new VerificadorSena();
    expect(sostener(v, 0.8, 0, 300)).toBe('parecida');
    expect(v.progreso(300)).toBeCloseTo(0.5);
    expect(sostener(v, 0.8, 350, 650)).toBe('valida');
  });

  it('una vez válida no se pierde aunque la mano se vaya', () => {
    const v = new VerificadorSena();
    sostener(v, 0.9, 0, 700);
    expect(sostener(v, null, 750, 900)).toBe('valida');
  });

  it('si deja de parecerse antes de tiempo, vuelve a empezar', () => {
    const v = new VerificadorSena();
    sostener(v, 0.9, 0, 500);
    sostener(v, 0.5, 550, 600);
    expect(v.progreso(600)).toBe(0);
    expect(sostener(v, 0.9, 650, 950)).toBe('parecida');
  });

  it('avisa solo si lleva un rato sin parecerse', () => {
    const v = new VerificadorSena();
    expect(sostener(v, 0.1, 0, 1000)).toBe('esperando');
    expect(sostener(v, 0.1, 1050, 1600)).toBe('noSeParece');
  });

  it('sin mano no hay aviso y se reinicia', () => {
    const v = new VerificadorSena();
    sostener(v, 0.1, 0, 1000);
    expect(sostener(v, null, 1050, 1100)).toBe('esperando');
    expect(sostener(v, 0.1, 1150, 2000)).toBe('esperando');
  });

  it('una seña dinámica aceptada valida de inmediato', () => {
    expect(new VerificadorSena().validarDinamica()).toBe('valida');
  });
});

describe('DetectorConfusion', () => {
  function sostenerOtra(d, m, a, b) {
    let r;
    for (let t = a; t <= b; t += 50) r = d.ver(m, 'A', t);
    return r;
  }

  it('otra letra segura sostenida 1 s se avisa', () => {
    const d = new DetectorConfusion();
    expect(sostenerOtra(d, ['P', 0.9], 0, 900)).toBeNull();
    expect(sostenerOtra(d, ['P', 0.9], 950, 1000)).toBe('P');
  });

  it('la esperada, poca certeza o sin mano no avisan y reinician', () => {
    const d = new DetectorConfusion();
    sostenerOtra(d, ['P', 0.9], 0, 900);
    expect(d.ver(['P', 0.7], 'A', 950)).toBeNull();
    expect(sostenerOtra(d, ['P', 0.9], 1000, 1900)).toBeNull();
    expect(d.ver(['A', 0.95], 'A', 1950)).toBeNull();
    expect(d.ver(null, 'A', 2000)).toBeNull();
  });

  it('si cambia de letra vuelve a contar', () => {
    const d = new DetectorConfusion();
    sostenerOtra(d, ['P', 0.9], 0, 800);
    expect(sostenerOtra(d, ['R', 0.9], 850, 1500)).toBeNull();
    expect(sostenerOtra(d, ['R', 0.9], 1550, 1850)).toBe('R');
  });
});

describe('PuntajeSena', () => {
  function sostenerPuntaje(p, prob, desde, hasta) {
    for (let t = desde; t <= hasta; t += 50) p.agregarEstatico(prob, t);
  }

  it('sin datos da 0', () => {
    expect(new PuntajeSena().puntajeEstatico()).toBe(0);
    expect(new PuntajeSena().puntajeDinamico()).toBe(0);
  });

  it('promedia solo la racha final de 600 ms, no lo de antes', () => {
    const p = new PuntajeSena();
    sostenerPuntaje(p, 0.3, 0, 1000);
    sostenerPuntaje(p, 0.92, 1050, 1650);
    expect(p.puntajeEstatico()).toBe(92);
  });

  it('sin una ventana completa usa todo lo visto; sin mano cuenta 0', () => {
    const p = new PuntajeSena();
    p.agregarEstatico(0.8, 0);
    p.agregarEstatico(null, 50);
    expect(p.puntajeEstatico()).toBe(40);
  });

  it('la racha incluye el cuadro de hace justo 600 ms', () => {
    const p = new PuntajeSena();
    p.agregarEstatico(0.1, -1);
    p.agregarEstatico(0.5, 0);
    p.agregarEstatico(1, 600);
    expect(p.puntajeEstatico()).toBe(75);
  });

  it('el dinámico da la mejor probabilidad reciente', () => {
    const p = new PuntajeSena();
    p.agregarDinamico(0.6, 0);
    p.agregarDinamico(0.874, 100);
    p.agregarDinamico(0.7, 200);
    expect(p.puntajeDinamico()).toBe(87);
  });
});
