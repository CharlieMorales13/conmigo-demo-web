import { useEffect, useState } from 'react';
import Deletrea from './Deletrea.jsx';
import { IconoEstrella } from './iconos.jsx';
import medios from './medios.json';
import { letrasDe, normalizarNombre } from './nombre.js';
import { enviarOpinion } from './opinion.js';
import { precargar } from './precarga.js';

const LARGO_MAXIMO_COMENTARIO = 280;

function Logo({ chico }) {
  return <img className={chico ? 'logo chico' : 'logo'} src="/logo_conmigo.png" alt="ConMigo" />;
}

function Inicio({ alEmpezar }) {
  const [texto, setTexto] = useState('');
  const [zurdo, setZurdo] = useState(false);
  const nombre = normalizarNombre(texto);

  // Mientras escribe su nombre ya se descargan MediaPipe y los modelos.
  useEffect(() => {
    precargar().catch((e) => console.warn('Precarga fallida; Deletrea reintenta', e));
  }, []);

  return (
    <main className="pantalla inicio">
      <Logo />
      <p className="lema">Deletrea tu nombre en Lengua de Señas Mexicana.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nombre) alEmpezar(nombre, zurdo);
        }}
      >
        <label htmlFor="nombre">¿Cuál es tu primer nombre?</label>
        <input
          id="nombre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={40}
          placeholder="Tu nombre"
        />
        <p className="vista-previa">{nombre && `Vas a deletrear: ${nombre}`}</p>
        {/* No se guarda: solo voltea las fotos y videos, como en la app. */}
        <fieldset className="mano">
          <legend>¿Eres diestro o zurdo?</legend>
          {[
            [false, 'Diestro'],
            [true, 'Zurdo'],
          ].map(([valor, texto]) => (
            <button type="button" key={texto} aria-pressed={zurdo === valor} onClick={() => setZurdo(valor)}>
              {texto}
            </button>
          ))}
        </fieldset>
        <button className="boton" disabled={!nombre}>
          Empezar
        </button>
      </form>
      <p className="aviso">Guardamos tu primer nombre y tu opinión para mejorar ConMigo.</p>
    </main>
  );
}

const PROPORCION_VIDEO = 16 / 9;
/** Fracción central del ancho que hay que mostrar sin cortar las manos.
 *  Copiada de assets/videos/encuadres.json de la app. */
const ENCUADRE = { hola_mi_nombre_es: 0.557, gracias: 0.416 };

/** Video en bucle del bucket, recortado a la persona (centrada y grande) y
 *  con alto máximo [altoMaximo]; si no hay URL o no carga, muestra el texto. */
function VideoSena({ url, texto, encuadre, altoMaximo, zurdo }) {
  const [falla, setFalla] = useState(false);
  const proporcion = encuadre * PROPORCION_VIDEO;
  const tamano = { aspectRatio: proporcion, width: `min(100%, calc(${altoMaximo} * ${proporcion}))` };
  return (
    <section className="referencia recorte" style={tamano}>
      {url && !falla ? (
        <video
          className={zurdo ? 'espejo' : undefined}
          src={url}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setFalla(true)}
        />
      ) : (
        <p className="frase">{texto}</p>
      )}
    </section>
  );
}

function MiNombre({ letras, zurdo, alSeguir }) {
  return (
    <main className="pantalla mi-nombre">
      <h1>Así te presentas en LSM</h1>
      <VideoSena
        url={medios.hola_mi_nombre_es?.video}
        texto="Hola, mi nombre es…"
        encuadre={ENCUADRE.hola_mi_nombre_es}
        altoMaximo="50dvh"
        zurdo={zurdo}
      />
      <p className="lema">
        Luis dice «Hola, mi nombre es» y deletrea L-U-I-S. Tú haz lo mismo con el tuyo:
      </p>
      <ol className="nombre-grande">
        {letras.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
      <button className="boton" onClick={alSeguir}>
        Continuar
      </button>
    </main>
  );
}

function Califica({ nombre, zurdo, alEnviar }) {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  return (
    <main className="pantalla califica">
      <VideoSena
        url={medios.gracias?.video}
        texto="¡Gracias!"
        encuadre={ENCUADRE.gracias}
        altoMaximo="38dvh"
        zurdo={zurdo}
      />
      <p className="lema">Nagbi te dice «Gracias» en LSM.</p>
      <h1>¿Qué tal te fue?</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // No hacemos esperar a nadie: Gracias sale ya y el envío sigue atrás.
          enviarOpinion({ nombre, estrellas, comentario: comentario.trim() }).catch((err) =>
            console.warn('No se guardó la opinión', err),
          );
          alEnviar();
        }}
      >
        <div className="calificar" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              role="radio"
              aria-checked={estrellas === n}
              aria-label={`${n} de 5`}
              onClick={() => setEstrellas(n)}
            >
              <IconoEstrella llena={n <= estrellas} />
            </button>
          ))}
        </div>
        <label htmlFor="comentario">¿Qué te pareció ConMigo en pocas palabras?</label>
        <textarea
          id="comentario"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={LARGO_MAXIMO_COMENTARIO}
          rows={3}
          placeholder="Opcional"
        />
        <button className="boton" disabled={!estrellas}>
          Enviar
        </button>
      </form>
    </main>
  );
}

function Gracias({ nombre, alReiniciar }) {
  return (
    <main className="pantalla gracias">
      <Logo />
      <h1>¡Gracias, {nombre}!</h1>
      <p className="lema">Ya sabes presentarte en Lengua de Señas Mexicana.</p>
      <button className="boton-discreto" onClick={alReiniciar}>
        Volver al inicio
      </button>
    </main>
  );
}

export default function App() {
  const [pantalla, setPantalla] = useState('inicio');
  const [nombre, setNombre] = useState('');
  const [letras, setLetras] = useState([]);
  const [zurdo, setZurdo] = useState(false);

  switch (pantalla) {
    case 'deletrea':
      return <Deletrea letras={letras} zurdo={zurdo} alTerminar={() => setPantalla('mi-nombre')} />;
    case 'mi-nombre':
      return <MiNombre letras={letras} zurdo={zurdo} alSeguir={() => setPantalla('califica')} />;
    case 'califica':
      return <Califica nombre={nombre} zurdo={zurdo} alEnviar={() => setPantalla('gracias')} />;
    case 'gracias':
      return <Gracias nombre={nombre} alReiniciar={() => setPantalla('inicio')} />;
    default:
      return (
        <Inicio
          alEmpezar={(n, z) => {
            setNombre(n);
            setZurdo(z);
            setLetras(letrasDe(n));
            setPantalla('deletrea');
          }}
        />
      );
  }
}
