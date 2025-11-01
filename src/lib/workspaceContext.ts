// Workspace context management for cross-window communication using query parameters

interface WorkspaceContext {
  workspaceName: string;
  sessionId?: string;
  timestamp: number;
}

// URL query parameter names for workspace context
const WORKSPACE_PARAMS = {
  WORKSPACE: 'workspace',
  SESSION: 'session', 
  TIMESTAMP: 'timestamp'
} as const;

// Generate workspace context URL parameters
export function buildWorkspaceUrl(baseUrl: string, workspaceName: string, sessionId?: string): string {
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set(WORKSPACE_PARAMS.WORKSPACE, workspaceName);
  url.searchParams.set(WORKSPACE_PARAMS.TIMESTAMP, Date.now().toString());
  
  if (sessionId) {
    url.searchParams.set(WORKSPACE_PARAMS.SESSION, sessionId);
  }
  
  return url.toString();
}

// Parse workspace context from URL
export function getWorkspaceContextFromUrl(url: string | URL): WorkspaceContext | null {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  
  const workspaceName = urlObj.searchParams.get(WORKSPACE_PARAMS.WORKSPACE);
  const timestampStr = urlObj.searchParams.get(WORKSPACE_PARAMS.TIMESTAMP);
  const sessionId = urlObj.searchParams.get(WORKSPACE_PARAMS.SESSION);
  
  if (!workspaceName || !timestampStr) {
    return null;
  }
  
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return null;
  }
  
  return {
    workspaceName,
    sessionId: sessionId || undefined,
    timestamp
  };
}

// Get workspace context from current page URL
export function getCurrentWorkspaceContext(): WorkspaceContext | null {
  return getWorkspaceContextFromUrl(window.location.href);
}

// Open popup window with workspace context in URL
export function openWorkspaceWindow(
  url: string = "",
  workspaceName: string, 
  sessionId?: string,
  windowFeatures?: string
): Window | null {
  const workspaceUrl = buildWorkspaceUrl(url || window.location.pathname, workspaceName, sessionId);
  const features = windowFeatures || "width=800,height=600,scrollbars=yes,resizable=yes";
  
  return window.open(workspaceUrl, "_blank", features);
}

// Service worker helper - parse workspace context from request URL
export function getWorkspaceContextFromRequest(request: Request): WorkspaceContext | null {
  try {
    const url = new URL(request.url);
    return getWorkspaceContextFromUrl(url);
  } catch (e) {
    console.warn('Service worker: Failed to parse workspace context from URL:', e);
    return null;
  }
}

// Legacy support - get workspace context from referrer URL (fallback)
export function getWorkspaceContextFromReferrer(request: Request): WorkspaceContext | null {
  if (!request.referrer) {
    return null;
  }
  
  try {
    return getWorkspaceContextFromUrl(request.referrer);
  } catch (e) {
    console.warn('Service worker: Failed to parse workspace context from referrer:', e);
    return null;
  }
}