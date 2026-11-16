import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:lan` (modo lan): HTTPS con certificado propio y expuesto en la
// red local, porque el celular solo da la cámara en HTTPS.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'lan' ? [basicSsl()] : [])],
  server: mode === 'lan' ? { host: true } : {},
}));
