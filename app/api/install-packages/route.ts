import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[install-packages] Proxying to Cloudflare Worker...');
    
    // Get the request body
    const body = await request.json();
    
    // Get the Cloudflare Worker URL from environment
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL || 'https://open-lovable-sandbox.your-subdomain.workers.dev';
    
    // Proxy the request to the Cloudflare Worker
    const response = await fetch(`${workerUrl}/sandbox/install-packages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Worker response not ok: ${response.status}`);
    }
    
    // For streaming responses, we need to handle them properly
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      // Return the streaming response directly
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    const data = await response.json();
    console.log('[install-packages] Received response from worker');
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('[install-packages] Proxy error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to install packages',
        details: 'Error communicating with Cloudflare Worker'
      },
      { status: 500 }
    );
  }
}