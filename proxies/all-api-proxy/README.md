# All API Proxy

A unified Cloudflare Worker that proxies requests to GitHub, Netlify, Vercel, and Cloudflare APIs with intelligent service detection, CORS headers, and automatic OAuth client secret injection.

## Features

- **Multi-Service Support**: Handles GitHub, Netlify, Vercel, and Cloudflare APIs in one proxy
- **Intelligent Routing**: Automatically detects which service to proxy to based on the host
- **CORS Support**: Adds proper CORS headers for browser requests
- **OAuth Token Exchange**: Automatically injects client secrets for OAuth token exchange on all services
- **Security**: Validates origins and allowed hosts
- **Error Handling**: Proper error responses with appropriate status codes

## Supported Services

### GitHub
- **Hosts**: `github.com`, `api.github.com`, `*.github.com`  
- **OAuth Endpoint**: `/login/oauth/access_token`
- **Secret**: `GITHUB_CLIENT_SECRET`

### Netlify  
- **Hosts**: `api.netlify.com`
- **OAuth Endpoint**: `/oauth/token`
- **Secret**: `NETLIFY_CLIENT_SECRET`

### Vercel
- **Hosts**: `api.vercel.com`
- **OAuth Endpoint**: `/oauth/access_token`  
- **Secret**: `VERCEL_CLIENT_SECRET`

### Cloudflare
- **Hosts**: `api.cloudflare.com`
- **OAuth Endpoint**: `/client/v4/oauth2/token` (for future OAuth support)
- **Secret**: `CLOUDFLARE_CLIENT_SECRET`

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Secrets

Set the client secrets for OAuth token exchange:

```bash
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put NETLIFY_CLIENT_SECRET
wrangler secret put VERCEL_CLIENT_SECRET
wrangler secret put CLOUDFLARE_CLIENT_SECRET
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
https://your-worker-domain.workers.dev/<host>/<path>
```

### Examples

**GitHub API:**
```
https://your-worker-domain.workers.dev/api.github.com/user
```

**Netlify API:**
```
https://your-worker-domain.workers.dev/api.netlify.com/api/v1/user
```

**Vercel API:**
```
https://your-worker-domain.workers.dev/api.vercel.com/v2/user
```

**Cloudflare API:**
```
https://your-worker-domain.workers.dev/api.cloudflare.com/client/v4/user
```

### OAuth Token Exchange

For OAuth token exchange, make POST requests to the respective OAuth endpoints:

- **GitHub**: `https://your-worker-domain.workers.dev/github.com/login/oauth/access_token`
- **Netlify**: `https://your-worker-domain.workers.dev/api.netlify.com/oauth/token`
- **Vercel**: `https://your-worker-domain.workers.dev/api.vercel.com/oauth/access_token`

The proxy will automatically inject the appropriate `client_secret` parameter.

## Configuration

### Environment Variables

Set via `wrangler secret put`:
- `GITHUB_CLIENT_SECRET`: GitHub OAuth application client secret
- `NETLIFY_CLIENT_SECRET`: Netlify OAuth application client secret
- `VERCEL_CLIENT_SECRET`: Vercel OAuth application client secret
- `CLOUDFLARE_CLIENT_SECRET`: Cloudflare OAuth application client secret (future)

### Allowed Origins

The proxy only accepts requests from:
- `https://opaledx.com`
- `http://localhost:3000`

### Service Detection

The proxy automatically detects which service to route to based on the hostname in the request path.

## Migration from Individual Proxies

To migrate from individual service proxies:

1. Deploy this unified proxy
2. Update your application's environment variables:
   - Set `GITHUB_CORS_PROXY` to your new worker URL
   - Set `NETLIFY_CORS_PROXY` to your new worker URL  
   - Set `VERCEL_CORS_PROXY` to your new worker URL
   - Set `CLOUDFLARE_CORS_PROXY` to your new worker URL
3. Set all the client secrets as shown above
4. Test each service integration
5. Retire the individual proxy workers

## Security

- Origin/referer validation
- Per-service host allowlists
- Header filtering
- No sensitive information in logs
- Automatic client secret injection for OAuth flows

## Deployment

```bash
# Set all required secrets
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put NETLIFY_CLIENT_SECRET
wrangler secret put VERCEL_CLIENT_SECRET
wrangler secret put CLOUDFLARE_CLIENT_SECRET

# Deploy
npm run deploy
```