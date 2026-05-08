import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(() => {
    return {
      // Devtools không bắt buộc pre-bundle — tránh 504 Outdated Optimize Dep khi deps/cache đổi
      optimizeDeps: {
        exclude: ['@tanstack/react-query-devtools'],
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // Loại bỏ console/debugger ở build production để giảm bundle + tránh log nhạy cảm.
      esbuild: {
        drop: ['console', 'debugger'],
      },
      build: {
        chunkSizeWarningLimit: 1000,
        cssCodeSplit: true,
        // Inline asset ≤ 4KB vào CSS/JS, giảm số HTTP request lần đầu.
        assetsInlineLimit: 4096,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              // Tách `framer-motion` ra chunk riêng để Vercel CDN cache lâu (immutable
              // hash) — giảm parsing trên từng route khi nó đã ở SW/HTTP cache.
              if (id.includes('framer-motion')) return 'vendor-framer';
              if (id.includes('@tanstack')) return 'vendor-tanstack';
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('@tiptap') || id.includes('/tiptap/')) return 'vendor-tiptap';
              if (id.includes('jspdf')) return 'vendor-jspdf';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('xlsx')) return 'vendor-xlsx';
              if (id.includes('dompurify')) return 'vendor-dompurify';
              if (id.includes('@supabase')) return 'vendor-supabase';
            },
          },
        },
      },
      plugins: [
        react(),
        // Pre-compress build output: Vercel/CDN sẽ phục vụ `.br`/`.gz` trực tiếp,
        // giảm bandwidth ~70% cho text assets (JS/CSS/HTML).
        viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
        viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.svg'],
          manifest: {
            name: 'MTTQVN',
            short_name: 'MTTQVN',
            description: 'Trang thông tin điện tử',
            theme_color: '#ffffff',
            background_color: '#ffffff',
            display: 'standalone',
            start_url: '/',
            icons: [
              {
                src: '/favicon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
              },
              {
                src: '/favicon.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
                purpose: 'any maskable',
              },
              {
                src: '/favicon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any maskable',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB — file lớn hơn không cache SW nhưng vẫn tải qua network
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                // Chỉ cache object **public** — signed URL (private bucket) có token ngắn hạn, không cache SW.
                urlPattern: ({ url }) =>
                  url.hostname.endsWith('.supabase.co') &&
                  url.pathname.includes('/storage/v1/object/public/'),
                handler: 'CacheFirst',
                options: {
                  cacheName: 'supabase-storage-public-cache',
                  expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
          },
        }),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          buffer: 'buffer',
        }
      }
    };
});
