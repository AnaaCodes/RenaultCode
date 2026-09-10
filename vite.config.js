import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'index.html'),
        novaF4: resolve(__dirname, 'nova-f4.html'),
        novaF4Impactos: resolve(__dirname, 'nova-f4-impactos.html'),
        novaF4ImpactosDetalhes: resolve(__dirname, 'nova-f4-impactos-detalhes.html'),
        novaF4Doa: resolve(__dirname, 'nova-f4-doa.html'),
        minhasF4: resolve(__dirname, 'minhas-f4.html'),
        detalheF4: resolve(__dirname, 'f4.html'),
        projetos: resolve(__dirname, 'projetos.html')
      }
    }
  }
});
