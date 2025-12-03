// @ts-check
import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  site: 'https://patrickdeniso.dev',

  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },

  adapter: cloudflare(),
});