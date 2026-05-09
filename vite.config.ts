import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Copy public/ into dist/ manually so we can skip unreadable/stale files
// (e.g. transient "... copy.jpg" artifacts that break Vite's built-in copy).
function safePublicCopy() {
  return {
    name: 'safe-public-copy',
    apply: 'build' as const,
    closeBundle() {
      const src = path.resolve(__dirname, 'public');
      const dest = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(src)) return;
      const walk = (from: string, to: string) => {
        fs.mkdirSync(to, { recursive: true });
        for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
          const s = path.join(from, entry.name);
          const d = path.join(to, entry.name);
          try {
            if (entry.isDirectory()) walk(s, d);
            else fs.copyFileSync(s, d);
          } catch {
            // Skip unreadable files silently (e.g. transient filesystem entries).
          }
        }
      };
      walk(src, dest);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  publicDir: false,
  plugins: [react(), safePublicCopy()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['buffer', '@solana/web3.js'],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
});
