// Workspace context management for cross-window communication

interface WorkspaceContext {
  workspaceName: string;
  sessionId?: string;
  timestamp: number;
}

// Cookie-based workspace context for service worker communication
export function setActiveWorkspaceContext(workspaceName: string, sessionId?: string) {
  const context: WorkspaceContext = {
    workspaceName,
    sessionId,
    timestamp: Date.now()
  };
  
  // Set cookie that service worker can read
  document.cookie = `activeWorkspace=${encodeURIComponent(JSON.stringify(context))}; path=/; SameSite=Lax; max-age=3600`;
  
  // Also store in sessionStorage for redundancy
  sessionStorage.setItem('workspaceContext', JSON.stringify(context));
}

export function getActiveWorkspaceContext(): WorkspaceContext | null {
  // Try cookie first (available to service worker)
  const cookieMatch = document.cookie.match(/activeWorkspace=([^;]+)/);
  if (cookieMatch) {
    try {
      return JSON.parse(decodeURIComponent(cookieMatch[1]));
    } catch (e) {
      console.warn('Failed to parse workspace context from cookie:', e);
    }
  }
  
  // Fallback to sessionStorage
  const stored = sessionStorage.getItem('workspaceContext');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse workspace context from sessionStorage:', e);
    }
  }
  
  return null;
}

export function clearActiveWorkspaceContext() {
  document.cookie = 'activeWorkspace=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  sessionStorage.removeItem('workspaceContext');
}

// Window-specific context injection for popups
export function injectWorkspaceContextIntoWindow(targetWindow: Window, workspaceName: string, sessionId?: string) {
  // Inject context directly into the popup window
  const contextScript = `
    window.__WORKSPACE_CONTEXT__ = ${JSON.stringify({
      workspaceName,
      sessionId,
      timestamp: Date.now()
    })};
    
    // Also set in the popup's sessionStorage
    try {
      sessionStorage.setItem('workspaceContext', JSON.stringify(window.__WORKSPACE_CONTEXT__));
    } catch (e) {
      console.warn('Could not set workspace context in popup sessionStorage:', e);
    }
  `;
  
  // Execute script in popup window context
  targetWindow.eval(contextScript);
}

// Service worker helper (to be used in service worker)
export function getWorkspaceContextFromRequest(request: Request): WorkspaceContext | null {
  // Parse cookie from request headers
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookieMatch = cookieHeader.match(/activeWorkspace=([^;]+)/);
  if (cookieMatch) {
    try {
      return JSON.parse(decodeURIComponent(cookieMatch[1]));
    } catch (e) {
      console.warn('Service worker: Failed to parse workspace context:', e);
    }
  }
  
  return null;
}