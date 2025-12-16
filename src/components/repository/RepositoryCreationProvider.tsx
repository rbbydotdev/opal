import { createContext, ReactNode, useContext } from "react";

interface RepositoryCreationCapabilities {
  canCreatePrivate: boolean;
  requiresOptions: boolean;
}

const RepositoryCreationContext = createContext<RepositoryCreationCapabilities | null>(null);

export function useRepositoryCreation() {
  return useContext(RepositoryCreationContext);
}

export function RepositoryCreationProvider({
  children,
  capabilities,
}: {
  children: ReactNode;
  capabilities: RepositoryCreationCapabilities;
}) {
  return <RepositoryCreationContext.Provider value={capabilities}>{children}</RepositoryCreationContext.Provider>;
}

// Factory function to create GitHub-specific capabilities
export function createGitHubCapabilities(hasPrivateScope: boolean): RepositoryCreationCapabilities {
  return {
    canCreatePrivate: hasPrivateScope,
    requiresOptions: hasPrivateScope, // Only ask if they can choose
  };
}

// For auth types without scope info (e.g., API keys), assume they can create private
export function createGitHubAPICapabilities(): RepositoryCreationCapabilities {
  return {
    canCreatePrivate: true,
    requiresOptions: true, // Ask user to choose since we don't know their permissions
  };
}

// Other providers can create their own capability patterns
// e.g., GitLab might have different visibility options
export function createGitLabCapabilities(): RepositoryCreationCapabilities {
  return {
    canCreatePrivate: true,
    requiresOptions: false, // Different UX pattern
  };
}
