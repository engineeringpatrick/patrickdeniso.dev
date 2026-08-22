// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  site: 'https://patrickdeniso.dev',
  session: false,

  adapter: cloudflare({ imageService: 'compile' }),
});
