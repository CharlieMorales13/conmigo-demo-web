# ConMigo: demo web

Demo de la final (18 nov 2026): el público escanea un QR, escribe su primer
nombre, lo deletrea en LSM frente a su cámara, ve cómo presentarse y nos
califica. El video nunca sale del celular: MediaPipe y los modelos corren en
el navegador.

## Correr

```sh
npm install
npm run dev       # http://localhost:5173 (la cámara funciona en localhost)
npm run dev:lan   # HTTPS en la red local, para probar desde el celular
npm test          # pruebas (vitest)
npm run build     # sitio estático en dist/
```

Con `dev:lan` el certificado es propio: el celular mostrará una advertencia
la primera vez; acéptala para continuar.

## Variables de Firebase

Copia `.env.example` a `.env.local` (no se versiona) y llena:
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. Las opiniones se guardan
en la colección `testers_demo` con los campos `nombre`, `estrellas`,
`comentario` y `creado`. Si faltan las variables, la demo funciona igual y
solo no guarda la opinión.

## Fotos y videos de las letras

`src/medios.json` dice qué mostrar de cada letra:

```json
{
  "letras": {
    "A": { "imagen": "https://..." },
    "J": { "video": "https://..." },
    "X": { "video": "https://...", "video_lado": "https://..." }
  },
  "hola_mi_nombre_es": { "video": "https://..." }
}
```

Reemplaza el archivo (lo genera el script del bucket) y vuelve a compilar. Si
una URL está vacía o no carga, se muestra la letra en grande.

## Reconocimiento

`src/precarga.js` es el único lugar que elige el reconocimiento:
`./vision/index.js` (el real, el que se usa) o `./vision_falsa.js` (valida
cualquier letra tras 2 s, para probar la UI sin modelos).

## Publicar en Cloudflare Pages

- Directorio raíz: vacío (la raíz del repo) · Comando de build: `npm run build` · Salida: `dist`.
- Variables de entorno del build: las cuatro `VITE_FIREBASE_*` de `.env.example`.
- Los archivos de MediaPipe (`public/mediapipe_wasm/`) no van en git: `npm install` los copia de `@mediapipe/tasks-vision`.
- Antes de publicar, corre `npm run medios-demo` en `backend/seed` del repo de la app (DuolingoClone): escribe `demo_web/src/medios.json` allá; cópialo a `src/medios.json` de este repo.
- QR con la URL final: `python herramientas/generar_qr.py https://<tu-sitio>.pages.dev qr.png`.
