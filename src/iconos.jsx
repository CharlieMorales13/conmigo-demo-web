// Íconos SVG sencillos (sin emojis).

export function IconoCheck() {
  return (
    <svg className="icono-check" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#6BA84F" />
      <path d="M13 25l7 7 15-16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoEstrella({ llena }) {
  return (
    <svg className="icono-estrella" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
        fill={llena ? '#F6B430' : '#CCDAE8'}
        stroke={llena ? '#CC8E12' : '#B5C4D3'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Estrellas({ llenas, total }) {
  return (
    <span className="estrellas" aria-label={`${llenas} de ${total} estrellas`}>
      {Array.from({ length: total }, (_, i) => (
        <IconoEstrella key={i} llena={i < llenas} />
      ))}
    </span>
  );
}
