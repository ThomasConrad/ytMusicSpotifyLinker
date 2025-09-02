import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'path';

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Enable source maps for production debugging
    sourcemap: true,
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1600,
    
    rollupOptions: {
      // Code splitting configuration
      output: {
        // Separate vendor chunks for better caching
        manualChunks: {
          // Core framework chunk
          'solid-js': ['solid-js'],
          'solid-router': ['@solidjs/router'],
          
          // API and utilities (only include actual runtime dependencies)
          'utils': []
        },
        
        // Consistent chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop().replace('.tsx', '').replace('.ts', '') 
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          } else if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
            extType = 'fonts';
          }
          
          return `${extType}/[name]-[hash][extname]`;
        },
        entryFileNames: 'js/[name]-[hash].js'
      }
    },
    
    // Minification settings
    minify: 'esbuild',
    
    // Remove console logs in production
    esbuild: {
      drop: ['console', 'debugger'],
    },
    
    // CSS code splitting
    cssCodeSplit: true,
  },
  
  // Performance optimizations
  optimizeDeps: {
    // Include dependencies that should be pre-bundled
    include: [
      'solid-js',
      '@solidjs/router'
    ],
    
    // Force optimization of these dependencies
    force: true
  },
  
  // Development server optimizations
  ...(process.env.NODE_ENV === 'development' && {
    server: {
      ...{
        port: 5173,
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          }
        }
      },
      // Enable file watching optimizations
      watch: {
        usePolling: false,
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
      }
    }
  }),
  
  // Environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  }
});