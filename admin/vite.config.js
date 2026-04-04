import { defineConfig, loadEnv } from 'vite';

/**
 * 개발 프록시: VITE_DEV_API_ORIGIN / NW_DEV_API_ORIGIN (예: http://127.0.0.1:3000), 포트 기본 3000.
 * 운영 API: admin/.env.production 에 VITE_API_ORIGIN=https://백엔드호스트 (끝 /api 생략). 비우면 페이지와 동일 origin 의 /api.
 */
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, process.cwd(), '');
  const fromEnv =
    rootEnv.VITE_DEV_API_ORIGIN ||
    rootEnv.NW_DEV_API_ORIGIN ||
    process.env.VITE_DEV_API_ORIGIN ||
    process.env.NW_DEV_API_ORIGIN;
  const port = rootEnv.NW_API_PORT || process.env.NW_API_PORT || '3000';
  const proxyTarget = fromEnv || `http://127.0.0.1:${port}`;

  return {
    base: '/admin/',
    server: {
      port: 5173,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
        '/uploads': { target: proxyTarget, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
