import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({command}) => {
  return {
    // GitHub Pages serves a project site from a subpath (e.g. /Emil/), but Vite
    // defaults to root-absolute asset URLs (/assets/...), which 404 there and
    // leave a blank page. A relative base resolves against whatever directory
    // the page is served from, so the same build works at the domain root, at
    // any subpath, and from the local filesystem. The dev server still needs a
    // root base because it is mounted as Express middleware.
    base: command === 'build' ? './' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
