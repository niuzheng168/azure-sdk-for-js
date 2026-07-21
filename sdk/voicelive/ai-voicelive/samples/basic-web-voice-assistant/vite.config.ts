import { AzureCliCredential } from '@azure/identity';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';

const voiceLiveScope = 'https://ai.azure.com/.default';

function localAzureCredentialPlugin(): Plugin {
  const credential = new AzureCliCredential();

  const tokenEndpoint = async (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void
  ): Promise<void> => {
    if (request.url?.split('?')[0] !== '/api/azure-token') {
      next();
      return;
    }

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');

    if (request.method !== 'GET') {
      response.statusCode = 405;
      response.setHeader('Allow', 'GET');
      response.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const token = await credential.getToken(voiceLiveScope);
      if (!token) {
        throw new Error('AzureCliCredential returned no access token');
      }

      response.statusCode = 200;
      response.end(
        JSON.stringify({
          token: token.token,
          expiresOnTimestamp: token.expiresOnTimestamp
        })
      );
    } catch (error) {
      console.error('Failed to acquire a Voice Live access token:', error);
      response.statusCode = 500;
      response.end(
        JSON.stringify({
          error: 'Unable to acquire an Azure CLI access token. Run "az login" and restart Vite.'
        })
      );
    }
  };

  return {
    name: 'local-azure-credential',
    configureServer(server) {
      server.middlewares.use(tokenEndpoint);
    },
    configurePreviewServer(server) {
      server.middlewares.use(tokenEndpoint);
    }
  };
}

export default defineConfig({
  root: '.',
  plugins: [localAzureCredentialPlugin()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
    strictPort: true,
    // Enable file watching for SDK source changes
    watch: {
      usePolling: true,
      interval: 300
    }
  },
  // Configure to watch node_modules changes
  optimizeDeps: {
    force: true // Force dependency re-optimization on restart
  }
});
