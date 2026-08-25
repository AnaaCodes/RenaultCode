import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'index.html'),
        minhasF4: resolve(__dirname, 'minhas-f4.html'),
        detalheF4: resolve(__dirname, 'f4.html')
      }
    }
  }
});
