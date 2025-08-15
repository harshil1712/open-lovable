import { getSandbox } from '@cloudflare/sandbox';

// Export the Sandbox class as required by CF Workers
export { Sandbox } from '@cloudflare/sandbox';

// Environment interface for Cloudflare Worker
interface Env {
  Sandbox: DurableObjectNamespace;
  SESSION_STORAGE?: KVNamespace;
}

// Global sandbox state tracking
let activeSandbox: any = null;
let sandboxData: any = null;
let existingFiles: Set<string> = new Set();

// App configuration for Cloudflare environment
const appConfig = {
  cf: {
    timeoutMinutes: 15,
    get timeoutMs() {
      return this.timeoutMinutes * 60 * 1000;
    },
    vitePort: 5173,
    viteStartupDelay: 7000,
    cssRebuildDelay: 2000,
  },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Add CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Route to different handlers based on path
    if (url.pathname === '/sandbox/create' && request.method === 'POST') {
      const response = await handleCreateSandbox(request, env);
      return addCorsHeaders(response, corsHeaders);
    }
    
    if (url.pathname === '/sandbox/apply-code' && request.method === 'POST') {
      const response = await handleApplyCodeStream(request, env);
      return addCorsHeaders(response, corsHeaders);
    }
    
    if (url.pathname === '/sandbox/install-packages' && request.method === 'POST') {
      const response = await handleInstallPackages(request, env);
      return addCorsHeaders(response, corsHeaders);
    }
    
    if (url.pathname === '/sandbox/run-command' && request.method === 'POST') {
      const response = await handleRunCommand(request, env);
      return addCorsHeaders(response, corsHeaders);
    }
    
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

function addCorsHeaders(response: Response, corsHeaders: Record<string, string>): Response {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

async function handleCreateSandbox(request: Request, env: Env): Promise<Response> {
  try {
    console.log('[create-sandbox] Creating Cloudflare sandbox...');
    
    // Kill existing sandbox if any
    if (activeSandbox) {
      console.log('[create-sandbox] Cleaning up existing sandbox...');
      activeSandbox = null;
    }
    
    // Clear existing files tracking
    existingFiles.clear();
    
    // Create sandbox using Cloudflare SDK
    const sessionId = `sandbox-${Date.now()}`;
    console.log(`[create-sandbox] Creating CF sandbox with session ID: ${sessionId}`);
    
    const sandbox = getSandbox(env.Sandbox, sessionId);
    console.log('[create-sandbox] Sandbox instance created successfully');
    
    console.log('[create-sandbox] Testing basic sandbox functionality...');
    
    // Test basic command execution
    const testResult = await sandbox.exec('echo "Hello from sandbox"');
    console.log('[create-sandbox] Test result:', testResult);
    
    console.log('[create-sandbox] Setting up Vite React app...');
    
    // Create directory structure
    await sandbox.exec('mkdir -p /workspace/src');
    
    // Write package.json
    const packageJson = {
      name: "sandbox-app",
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite --host",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.0.0",
        vite: "^4.3.9",
        tailwindcss: "^3.3.0",
        postcss: "^8.4.31",
        autoprefixer: "^10.4.16"
      }
    };
    
    await sandbox.writeFile('/workspace/package.json', JSON.stringify(packageJson, null, 2));
    console.log('✓ package.json');
    
    // Write all configuration and app files
    await writeProjectFiles(sandbox);
    
    // Install dependencies
    console.log('[create-sandbox] Installing dependencies...');
    await sandbox.exec('cd /workspace && npm install');
    
    // Start Vite dev server as a background process
    console.log('[create-sandbox] Starting Vite dev server...');
    const viteProcess = await sandbox.startProcess('cd /workspace && npm run dev');
    
    // Wait for Vite to be ready
    await new Promise(resolve => setTimeout(resolve, appConfig.cf.viteStartupDelay));
    
    // Expose the Vite dev server port
    const previewUrl = await sandbox.exposePort(5173);
    
    // Store sandbox globally
    activeSandbox = sandbox;
    sandboxData = {
      sandboxId: sessionId,
      url: previewUrl,
      processId: viteProcess.id
    };
    
    // Track initial files
    const initialFiles = ['src/App.jsx', 'src/main.jsx', 'src/index.css', 'index.html', 'package.json', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js'];
    initialFiles.forEach(file => existingFiles.add(file));
    
    console.log('[create-sandbox] Sandbox ready at:', previewUrl);
    
    return new Response(JSON.stringify({
      success: true,
      sandboxId: sessionId,
      url: previewUrl,
      message: 'Cloudflare sandbox created and Vite React app initialized'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[create-sandbox] Error:', error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to create sandbox',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function writeProjectFiles(sandbox: any) {
  // Write Vite config
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: false
  }
})`;
  
  await sandbox.writeFile('/workspace/vite.config.js', viteConfig);
  console.log('✓ vite.config.js');
  
  // Write Tailwind config
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
  
  await sandbox.writeFile('/workspace/tailwind.config.js', tailwindConfig);
  console.log('✓ tailwind.config.js');
  
  // Write PostCSS config
  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
  
  await sandbox.writeFile('/workspace/postcss.config.js', postcssConfig);
  console.log('✓ postcss.config.js');
  
  // Write index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
  
  await sandbox.writeFile('/workspace/index.html', indexHtml);
  console.log('✓ index.html');
  
  // Write main.jsx
  const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
  
  await sandbox.writeFile('/workspace/src/main.jsx', mainJsx);
  console.log('✓ src/main.jsx');
  
  // Write App.jsx
  const appJsx = `function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <p className="text-lg text-gray-400">
          Sandbox Ready<br/>
          Start building your React app with Vite and Tailwind CSS!
        </p>
      </div>
    </div>
  )
}

export default App`;
  
  await sandbox.writeFile('/workspace/src/App.jsx', appJsx);
  console.log('✓ src/App.jsx');
  
  // Write index.css
  const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: rgb(17 24 39);
}`;
  
  await sandbox.writeFile('/workspace/src/index.css', indexCss);
  console.log('✓ src/index.css');
}

// Additional handlers (apply-code, install-packages, run-command) would follow similar pattern
// Simplified for this migration - can be expanded based on the original implementation

async function handleApplyCodeStream(request: Request, env: Env): Promise<Response> {
  return new Response(JSON.stringify({ message: 'Apply code stream handler - TODO' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleInstallPackages(request: Request, env: Env): Promise<Response> {
  return new Response(JSON.stringify({ message: 'Install packages handler - TODO' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleRunCommand(request: Request, env: Env): Promise<Response> {
  return new Response(JSON.stringify({ message: 'Run command handler - TODO' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}