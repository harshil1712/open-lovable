import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[run-command] Proxying to Cloudflare Worker...');
    
    // Get the request body
    const body = await request.json();
    
    // Get the Cloudflare Worker URL from environment
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL || 'https://open-lovable-sandbox.your-subdomain.workers.dev';
    
    // Proxy the request to the Cloudflare Worker
    const response = await fetch(`${workerUrl}/sandbox/run-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Worker response not ok: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[run-command] Received response from worker');
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('[run-command] Proxy error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to run command',
        details: 'Error communicating with Cloudflare Worker'
      },
      { status: 500 }
    );
  }
}