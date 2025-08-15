import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('[create-ai-sandbox] Proxying to Cloudflare Worker...');
    
    // Get the Cloudflare Worker URL from environment
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL || 'https://open-lovable-sandbox.your-subdomain.workers.dev';
    
    // Proxy the request to the Cloudflare Worker
    const response = await fetch(`${workerUrl}/sandbox/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body for sandbox creation
    });
    
    if (!response.ok) {
      throw new Error(`Worker response not ok: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[create-ai-sandbox] Received response from worker:', data);
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('[create-ai-sandbox] Proxy error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create sandbox',
        details: 'Error communicating with Cloudflare Worker'
      },
      { status: 500 }
    );
  }
}