import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Specify the server directory to be ignored in the build
      external: ['./server/**'],
    },
  },
  server: {
    // Remove CSP headers for development
    // headers: {
    //   "Content-Security-Policy": "script-src 'self' https://js.stripe.com 'unsafe-inline' 'unsafe-eval'"
    // },
    proxy: {
      '/api': {
        target: 'http://localhost:6007',
        // target: 'https://workbackend-red.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Must add this api before any route EXP:('/api/your-route)
      }
    }
  }
});







// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   plugins: [react()],
//   build: {
//     rollupOptions: {
//       // Specify the server directory to be ignored in the build
//       external: ['./server/**'],
//     },
//   },
//   server: {
//     headers: {
//       // Comprehensive CSP for Stripe integration
//       "Content-Security-Policy": [
//         "default-src 'self'",
//         "script-src 'self' https://js.stripe.com https://m.stripe.network 'unsafe-inline' 'unsafe-eval'",
//         "script-src-elem 'self' https://js.stripe.com https://m.stripe.network 'unsafe-inline'",
//         "style-src 'self' 'unsafe-inline'",
//         "img-src 'self' data: https:",
//         "connect-src 'self' https://api.stripe.com https://m.stripe.network https://tenetbackend.vercel.app",
//         "frame-src https://js.stripe.com https://hooks.stripe.com",
//         "object-src 'none'",
//         "base-uri 'self'"
//       ].join('; ')
//     },
//     proxy: {
//       '/api': {
//         target: 'http://localhost:6007',
//         // target: 'https://workbackend-red.vercel.app',
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ''), // Must add this api before any route EXP:('/api/your-route)
//       }
//     }
//   }
// });