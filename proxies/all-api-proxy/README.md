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
- **OAuth**: ✅ Enabled - `/login/oauth/access_token`
- **Secret**: `GITHUB_CLIENT_SECRET`
- **Auth Types**: API tokens + OAuth

### Netlify  
- **Hosts**: `api.netlify.com`
- **OAuth**: ✅ Enabled - `/oauth/token`
- **Secret**: `NETLIFY_CLIENT_SECRET`
- **Auth Types**: API tokens + OAuth

### Vercel
- **Hosts**: `api.vercel.com`
- **OAuth**: ❌ Disabled (API tokens only)
- **Secret**: Not required for API-only usage
- **Auth Types**: API tokens only

### Cloudflare
- **Hosts**: `api.cloudflare.com`
- **OAuth**: ❌ Disabled (API tokens only)
- **Secret**: Not required for API-only usage  
- **Auth Types**: API tokens only

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Secrets

Set the client secrets for OAuth-enabled services:

```bash
# Required for OAuth-enabled services
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put NETLIFY_CLIENT_SECRET

# Optional - not needed for API-only services (Vercel, Cloudflare)
# wrangler secret put VERCEL_CLIENT_SECRET
# wrangler secret put CLOUDFLARE_CLIENT_SECRET
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

For OAuth-enabled services, make POST requests to the respective OAuth endpoints:

- **GitHub**: `https://your-worker-domain.workers.dev/github.com/login/oauth/access_token`
- **Netlify**: `https://your-worker-domain.workers.dev/api.netlify.com/oauth/token`

The proxy will automatically inject the appropriate `client_secret` parameter.

**Note**: Vercel and Cloudflare are configured for API-only access and do not support OAuth token exchange through the proxy.

## Configuration

### Environment Variables

Set via `wrangler secret put`:
- `GITHUB_CLIENT_SECRET`: GitHub OAuth application client secret (required for OAuth)
- `NETLIFY_CLIENT_SECRET`: Netlify OAuth application client secret (required for OAuth)
- `VERCEL_CLIENT_SECRET`: Not used (API-only service)
- `CLOUDFLARE_CLIENT_SECRET`: Not used (API-only service)

### Service Configuration

Each service can be configured in the `SERVICES` object with:
- `hosts`: Array of allowed hostnames
- `oauthEndpoint`: OAuth token exchange endpoint path
- `clientSecretEnv`: Environment variable name for client secret
- `oauthEnabled`: Boolean flag to enable/disable OAuth support

**Enabling OAuth for API-only services**: Change `oauthEnabled: false` to `true` in the service configuration and set the appropriate client secret.

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