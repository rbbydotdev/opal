# Vercel API Proxy

A Cloudflare Worker that proxies requests to the Vercel API with CORS headers and automatic OAuth client secret injection.

## Features

- **CORS Support**: Adds proper CORS headers for browser requests
- **OAuth Token Exchange**: Automatically injects client secret for Vercel OAuth token exchange
- **Security**: Validates origins and allowed hosts
- **Error Handling**: Proper error responses with appropriate status codes

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Secrets

Set the Vercel client secret (required for OAuth token exchange):

```bash
wrangler secret put VERCEL_CLIENT_SECRET
```

### 3. Deploy

```bash
npm run deploy
```

## Development

```bash
npm run dev
```

## Usage

The proxy accepts requests in the format:
```
https://your-worker-domain.workers.dev/api.vercel.com/v2/user
```

### OAuth Token Exchange

For OAuth token exchange, make a POST request to:
```
https://your-worker-domain.workers.dev/api.vercel.com/oauth/access_token
```

The proxy will automatically inject the `client_secret` parameter.

## Configuration

### Environment Variables

- `VERCEL_CLIENT_SECRET`: Your Vercel OAuth application client secret (set via `wrangler secret put`)

### Allowed Origins

The proxy only accepts requests from:
- `https://opaledx.com`
- `http://localhost:3000`

### Allowed Hosts

The proxy only forwards requests to:
- `api.vercel.com`

## Security

- Origin/referer validation
- Host allowlist
- Header filtering
- No sensitive information in logs

## Deployment

The worker is configured to deploy to Cloudflare Workers. Make sure to:

1. Set the `VERCEL_CLIENT_SECRET` secret
2. Deploy using `wrangler deploy`
3. Update your application's `VERCEL_CORS_PROXY` environment variable to point to your worker URL