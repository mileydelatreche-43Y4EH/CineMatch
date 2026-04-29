import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./login.html', import.meta.url)),
        search: fileURLToPath(new URL('./search.html', import.meta.url)),
        securite: fileURLToPath(new URL('./securite-confidentialite.html', import.meta.url)),
        aPropos: fileURLToPath(new URL('./a-propos.html', import.meta.url)),
      },
    },
  },
});
