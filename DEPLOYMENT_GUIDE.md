# Deployment Guide: E2B to Cloudflare Sandbox SDK

## Overview

This guide walks you through deploying the migrated open-lovable project with the new hybrid architecture (Next.js frontend + Cloudflare Worker for sandbox operations).

## Prerequisites

- Docker installed and running (for local worker development)
- Cloudflare account
- Node.js 18+ installed

## Step 1: Deploy the Cloudflare Worker

### 1.1 Install Worker Dependencies
```bash
cd worker
npm install
```

### 1.2 Authenticate with Cloudflare
```bash
npx wrangler login
```
This will open your browser to authenticate with Cloudflare.

### 1.3 Deploy the Worker
```bash
npx wrangler deploy
```

This will:
- Build and upload your worker code
- Create the necessary Durable Objects
- Set up the container environment
- Return your worker URL (e.g., `https://open-lovable-sandbox.your-subdomain.workers.dev`)

### 1.4 Note Your Worker URL
Save the worker URL from the deployment output - you'll need it for the Next.js configuration.

## Step 2: Configure the Next.js Application

### 2.1 Set Environment Variable
Create or update your `.env.local` file:
```env
CLOUDFLARE_WORKER_URL=https://open-lovable-sandbox.your-subdomain.workers.dev

# Keep your existing variables
FIRECRAWL_API_KEY=your_firecrawl_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
# ... other AI provider keys
```

### 2.2 Test Locally
```bash
# In the root directory
npm run dev
```

The Next.js app should start and proxy sandbox requests to your deployed Cloudflare Worker.

## Step 3: Deploy the Next.js Application

### 3.1 Vercel Deployment (Recommended)
```bash
# If not already connected to Vercel
npx vercel

# For subsequent deployments
npx vercel --prod
```

Make sure to set the `CLOUDFLARE_WORKER_URL` environment variable in your Vercel dashboard.

### 3.2 Other Platforms
The Next.js app can be deployed to any platform that supports Node.js:
- Netlify
- Railway
- Render
- Your own server

Just ensure the `CLOUDFLARE_WORKER_URL` environment variable is set.

## Step 4: Test the Integration

### 4.1 Frontend Testing
1. Open your deployed Next.js app
2. Try creating a new sandbox
3. Verify the sandbox creation works and shows the Vite preview URL
4. Test code generation and application
5. Test package installation

### 4.2 Worker Logs
Monitor worker logs in the Cloudflare dashboard:
1. Go to Workers & Pages in Cloudflare dashboard
2. Click on your worker
3. Check the "Logs" tab for any errors

## Troubleshooting

### Common Issues

**1. Worker deployment fails**
- Ensure Docker is running
- Check that your Cloudflare account has Workers enabled
- Verify authentication with `npx wrangler whoami`

**2. Next.js can't reach worker**
- Verify `CLOUDFLARE_WORKER_URL` is set correctly
- Check worker URL is accessible (visit it in browser)
- Ensure worker is deployed and not in draft mode

**3. Sandbox creation fails**
- Check Cloudflare Worker logs for errors
- Verify container and Durable Object setup
- Ensure all required packages are installed in worker

**4. CORS issues**
- Worker includes CORS headers, but verify they match your frontend domain
- Check browser network tab for CORS errors

### Development Tips

**Local Development with Both Services:**
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start Worker locally
cd worker
npx wrangler dev --port 8787
```

Then set `CLOUDFLARE_WORKER_URL=http://localhost:8787` in your `.env.local` for local testing.

## Rollback Plan

If issues arise, you can quickly rollback:

1. **Revert API routes** to original E2B implementation
2. **Restore environment variables** (E2B_API_KEY)
3. **Redeploy** the Next.js app

The original E2B implementation files are preserved in git history.

## Monitoring

### Cloudflare Analytics
- Worker requests and response times
- Error rates and debugging info
- Geographic distribution of requests

### Next.js Monitoring
- Continue using your existing monitoring solution
- Monitor proxy endpoint performance
- Track frontend error rates

## Cost Considerations

### Cloudflare Workers
- Free tier: 100,000 requests/day
- Paid tier: $5/month for 10M requests
- Durable Objects: Usage-based pricing

### E2B Comparison
- Potentially lower costs for high-usage scenarios
- No per-sandbox pricing
- Pay only for actual compute time

## Security

### Environment Variables
- Keep `CLOUDFLARE_WORKER_URL` as environment variable only
- Never commit actual worker URLs to code
- Use different workers for staging/production

### Cloudflare Security
- Workers run in isolated environments
- No persistent file system access outside sandbox
- Built-in DDoS protection

---

🎉 **Migration Complete!**

Your open-lovable project now runs on Cloudflare's edge infrastructure while maintaining all existing functionality. The hybrid architecture ensures minimal disruption while gaining the benefits of edge computing.