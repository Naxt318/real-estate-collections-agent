import type { NextConfig } from 'next';

// Importing the env module validates it, so a bad environment fails `next build`.
import './src/env';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
