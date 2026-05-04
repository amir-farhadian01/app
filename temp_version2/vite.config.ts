import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // ─── Firebase Compatibility Shims ────────────────────────────────────
        // AI Studio generates code that imports from 'firebase/*'.
        // In production these aliases redirect to our Express/JWT implementations
        // so no code transformation is needed after syncing from Version2.
        'firebase/app':       path.resolve(__dirname, 'src/lib/shims/firebase-app.ts'),
        'firebase/auth':      path.resolve(__dirname, 'src/lib/shims/firebase-auth.ts'),
        'firebase/firestore': path.resolve(__dirname, 'src/lib/shims/firebase-firestore.ts'),
        'firebase/storage':   path.resolve(__dirname, 'src/lib/shims/firebase-storage.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
