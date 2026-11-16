import { useCallback, useEffect, useRef, useState } from 'react';
import medios from './medios.json';
import { precargar } from './precarga.js';
import { IconoCheck, Estrellas } from './iconos.jsx';

const MS_FESTEJO = 800; // la palomita antes de pasar sola a la siguiente letra
const MS_PARA_SALTAR = 6000; // cuándo aparece "Siguiente letra"
const PASOS_BARRA = 20; // la barra cambia en pasos de 5 %: menos renders
// En estas el reconocimiento no da progreso: sin barra, solo la pista.
const LETRAS_CON_MOVIMIENTO = ['J', 'K', 'Ñ', 'Q', 'X', 'Z', 'LL', 'RR'];

// Mismas uniones que lib/presentation/traductor/pintor_manos.dart.
const CONEXIONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

function estrellasDe(puntaje) {
  if (puntaje >= 90) return 3;
  if (puntaje >= 80) return 2;
  return puntaje > 0 ? 1 : 0;
}

function dibujarManos(lienzo, manos) {
  const ctx = lienzo.getContext('2d');
  const { width: ancho, height: alto } = lienzo;
  ctx.clearRect(0, 0, ancho, alto);
  for (const mano of manos) {
    ctx.strokeStyle = '#60AEDE';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (const [a, b] of CONEXIONES) {
      ctx.moveTo(mano[a].x * ancho, mano[a].y * alto);
      ctx.lineTo(mano[b].x * ancho, mano[b].y * alto);
    }
    ctx.stroke();
    ctx.fillStyle = '#F6B430';
    for (const punto of mano) {
      ctx.beginPath();
      ctx.arc(punto.x * ancho, punto.y * alto, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

// Foto o video de cómo se hace la letra; la letra en grande si no hay medio.
function Referencia({ letra }) {
  const medio = medios.letras[letra] ?? {};
  const videos = [
    [medio.video, 'De frente'],
    [medio.video_lado, 'De lado'],
  ].filter(([url]) => url);
  const [falla, setFalla] = useState(false);
  const fallar = () => setFalla(true);

  if (falla || (!medio.imagen && videos.length === 0)) {
    return <div className="letra-grande">{letra}</div>;
  }
  if (medio.imagen) {
    return <img src={medio.imagen} alt={`Seña de la ${letra}`} onError={fallar} />;
  }
  return (
    <div className="videos">
      {videos.map(([url, etiqueta]) => (
        <figure key={url}>
          <video src={url} autoPlay loop muted playsInline onError={fallar} />
          {videos.length > 1 && <figcaption>{etiqueta}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export default function Deletrea({ letras, alTerminar }) {
  const [indice, setIndice] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [pareceOtra, setPareceOtra] = useState(null);
  const [logro, setLogro] = useState(null); // { puntaje } al validar la letra
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const [atorado, setAtorado] = useState(false);
  const video = useRef(null);
  const lienzo = useRef(null);
  const indiceActual = useRef(0); // el ciclo de cámara lee la letra de aquí

  const siguiente = useCallback(() => {
    setLogro(null);
    setProgreso(0);
    setPareceOtra(null);
    setAtorado(false);
    if (indiceActual.current + 1 >= letras.length) {
      alTerminar();
      return;
    }
    indiceActual.current += 1;
    setIndice(indiceActual.current);
  }, [letras.length, alTerminar]);

  // Precarga las fotos de todas las letras del nombre.
  useEffect(() => {
    for (const letra of letras) {
      const url = medios.letras[letra]?.imagen;
      if (url) new Image().src = url;
    }
  }, [letras]);

  // Cámara y ciclo de reconocimiento; se liberan al salir de la pantalla.
  useEffect(() => {
    let vivo = true;
    let flujo = null;
    let cuadro = 0;
    (async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
      } catch (e) {
        console.warn('Sin cámara', e);
        if (vivo) setError('camara');
        return;
      }
      if (!vivo) return flujo.getTracks().forEach((pista) => pista.stop());
      video.current.srcObject = flujo;
      await video.current.play().catch(() => {});

      let cargado;
      try {
        cargado = await precargar();
      } catch (e) {
        console.warn('No cargó el reconocimiento', e);
        if (vivo) setError('carga');
        return;
      }
      if (!vivo) return;
      setListo(true);

      const { detector, reco } = cargado;
      let prueba = null;
      let pruebaDe = -1;
      let validadaEn = -1;
      let ultimoTiempo = -1;
      const ciclo = () => {
        cuadro = requestAnimationFrame(ciclo);
        const v = video.current;
        if (!v || v.readyState < 2 || v.currentTime === ultimoTiempo) return;
        ultimoTiempo = v.currentTime;
        const ahora = performance.now();
        const resultado = detector.detectForVideo(v, ahora); // sin espejo
        const i = indiceActual.current;
        if (pruebaDe !== i) {
          prueba = reco.crearPrueba(letras[i]);
          pruebaDe = i;
        }
        const l = lienzo.current;
        if (l.width !== v.videoWidth) {
          l.width = v.videoWidth;
          l.height = v.videoHeight;
        }
        if (validadaEn === i) {
          dibujarManos(l, resultado.landmarks ?? []);
          return;
        }
        const r = prueba.procesar(resultado, ahora, v); // v: tamaño del cuadro
        dibujarManos(l, r.manos ?? []);
        setProgreso(Math.round(r.progreso * PASOS_BARRA) / PASOS_BARRA);
        setPareceOtra(r.pareceOtra);
        if (r.validada) {
          validadaEn = i;
          setLogro({ puntaje: r.puntaje });
        }
      };
      ciclo();
    })();
    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
      flujo?.getTracks().forEach((pista) => pista.stop());
    };
  }, [intento, letras]);

  // Tras la palomita pasa sola a la siguiente letra.
  useEffect(() => {
    if (!logro) return;
    const t = setTimeout(siguiente, MS_FESTEJO);
    return () => clearTimeout(t);
  }, [logro, siguiente]);

  // Por si alguien se atora: "Siguiente letra" a los pocos segundos.
  useEffect(() => {
    if (!listo) return;
    const t = setTimeout(() => setAtorado(true), MS_PARA_SALTAR);
    return () => clearTimeout(t);
  }, [indice, listo]);

  const letra = letras[indice];
  const conMovimiento = LETRAS_CON_MOVIMIENTO.includes(letra);
  const estrellas = logro ? estrellasDe(logro.puntaje) : 0;

  return (
    <main className="pantalla deletrea">
      <ol className="fila-letras" aria-label="Tu nombre">
        {letras.map((l, i) => (
          <li key={i} className={i < indice ? 'hecha' : i === indice ? 'actual' : ''}>
            {l}
          </li>
        ))}
      </ol>

      <section className="referencia">
        <Referencia key={indice} letra={letra} />
      </section>

      <section className="camara">
        <video ref={video} muted playsInline />
        <canvas ref={lienzo} />
        {!listo && !error && <p className="aviso-camara">Preparando la cámara…</p>}
        {error && (
          <div className="aviso-camara">
            <p>
              {error === 'camara'
                ? 'Necesitamos tu cámara para ver tus señas. Permite el acceso en tu navegador.'
                : 'No se pudo preparar el reconocimiento. Revisa tu conexión.'}
            </p>
            <button
              className="boton"
              onClick={() => {
                setError(null);
                setIntento((n) => n + 1);
              }}
            >
              Reintentar
            </button>
          </div>
        )}
        {logro && (
          <div className="festejo">
            <IconoCheck />
            {estrellas > 0 ? (
              <>
                <strong>{logro.puntaje}</strong>
                <Estrellas llenas={estrellas} total={3} />
              </>
            ) : (
              <strong>¡Bien hecha!</strong>
            )}
          </div>
        )}
      </section>

      {!conMovimiento && (
        <div className="barra" role="progressbar" aria-valuenow={Math.round(progreso * 100)}>
          <div style={{ width: `${progreso * 100}%` }} />
        </div>
      )}
      <p className="pista">
        {conMovimiento && !logro
          ? 'Haz el movimiento completo'
          : pareceOtra && !logro
            ? `Eso parece una ${pareceOtra}`
            : `Haz la ${letra}`}
      </p>
      {atorado && !logro && (
        <button className="boton-discreto" onClick={siguiente}>
          Siguiente letra
        </button>
      )}
    </main>
  );
}
