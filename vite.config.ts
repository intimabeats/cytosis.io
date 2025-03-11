import { defineConfig } from 'vite';

    export default defineConfig({
      base: './', // Define o caminho base como relativo
      build: {
        outDir: 'dist', // Define o diretório de saída como 'dist'
        assetsDir: 'assets', // Define o diretório de assets como 'assets' dentro de 'dist'
        rollupOptions: {
          output: {
            // Configura a estrutura de arquivos de saída
            entryFileNames: `assets/[name].js`,
            chunkFileNames: `assets/[name].js`,
            assetFileNames: `assets/[name].[ext]`
          }
        }
      }
    });
