import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig, loadEnv } from 'vite';

function log(...args: any[]) {
  const time = new Date().toISOString();
  console.log(`[${time}]`, ...args);
}

const config = defineConfig(({ mode, command }) => {
  const isBuild = command === 'build';
  const env = loadEnv(mode, process.cwd(), '');
  log('VITE_API_URL', env.VITE_API_URL);
  log('VITE_BASE_URL', env.VITE_BASE_URL);
  log('VITE_ASSETS_BASE_URL', env.VITE_ASSETS_BASE_URL);
  return {
    base: isBuild ? env.VITE_ASSETS_BASE_URL : '/',
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      nitro({ rollupConfig: { external: [/^@sentry\//] } }),
      tailwindcss(),
      tanstackStart({
        spa: { enabled: true },
        router: { basepath: isBuild ? env.VITE_BASE_URL : '/' },
      }),
      viteReact()
    ],
  };
});

export default config;
