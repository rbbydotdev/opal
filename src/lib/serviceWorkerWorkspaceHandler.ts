// Service worker utilities for workspace context detection
// This code would be used in your service worker

import { getWorkspaceContextFromRequest, getWorkspaceContextFromReferrer } from './workspaceContext';

// Example service worker fetch handler
export function handleWorkspaceRequest(event: FetchEvent) {
  const request = event.request;
  const url = new URL(request.url);
  
  // Get workspace context from URL parameters first, then fallback to referrer
  let workspaceContext = getWorkspaceContextFromRequest(request);
  if (!workspaceContext) {
    workspaceContext = getWorkspaceContextFromReferrer(request);
  }
  
  if (workspaceContext) {
    console.log('Service Worker: Detected workspace:', workspaceContext.workspaceName);
    
    // Handle CSS files from popup windows
    if (url.pathname.endsWith('.css')) {
      console.log('Service Worker: CSS request from workspace:', workspaceContext.workspaceName);
      // Route to correct workspace assets
      return handleWorkspaceAsset(request, workspaceContext.workspaceName);
    }
    
    // Handle image files from popup windows  
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
      console.log('Service Worker: Image request from workspace:', workspaceContext.workspaceName);
      // Route to correct workspace assets
      return handleWorkspaceAsset(request, workspaceContext.workspaceName);
    }
  }
  
  // Fallback to network
  return fetch(request);
}

function handleWorkspaceAsset(request: Request, workspaceName: string): Promise<Response> {
  const url = new URL(request.url);
  
  // Rewrite URL to include workspace context
  const workspaceUrl = new URL(url);
  workspaceUrl.pathname = `/workspace/${workspaceName}${url.pathname}`;
  
  console.log('Service Worker: Rewriting asset URL:', request.url, '->', workspaceUrl.toString());
  
  return fetch(new Request(workspaceUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer
  }));
}

// Alternative: Direct window detection with query parameters
export function handlePopupWindowRequest(event: FetchEvent) {
  const request = event.request;
  const referer = request.headers.get('referer');
  
  // Check if request comes from about:blank (popup window) or has workspace params
  if (!referer || referer === 'about:blank') {
    console.log('Service Worker: Request from popup window detected');
    
    // Get workspace context from URL parameters first, then referrer fallback
    let workspaceContext = getWorkspaceContextFromRequest(request);
    if (!workspaceContext) {
      workspaceContext = getWorkspaceContextFromReferrer(request);
    }
    
    if (workspaceContext) {
      console.log('Service Worker: Using workspace context:', workspaceContext.workspaceName);
      return handleWorkspaceAsset(request, workspaceContext.workspaceName);
    }
  }
  
  return fetch(request);
}