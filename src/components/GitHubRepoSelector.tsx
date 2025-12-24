import { useRemoteGitRepo, useRemoteGitRepoSearch } from "@/components/RemoteConnectionItem";
import {
  RepositoryCreationProvider,
  createGitHubAPICapabilities,
  createGitHubCapabilities,
} from "@/components/repository/RepositoryCreationProvider";
import {
  RepositoryVisibility,
  RepositoryVisibilitySelector,
  getVisibilityIcon,
} from "@/components/repository/RepositoryVisibilitySelector";
import { RemoteAuthGithubAgent, coerceRepoToName } from "@/data/remote-auth/RemoteAuthGithubAgent";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { useRemoteAuthAgent } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { useState } from "react";
import { flushSync } from "react-dom";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  RemoteResourceCreate,
  RemoteResourceInput,
  RemoteResourceRoot,
  RemoteResourceSearch,
} from "@/components/publish-modal/RemoteResourceField";

interface GitHubRepoSelectorProps<T extends FieldValues, K extends FieldPath<T>> {
  control: Control<T>;
  fieldName: K;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  getValue: () => string | undefined;
  remoteAuth: RemoteAuthDAO | null;
  defaultName?: string;
  label?: string;
  placeholder?: string;
  createButtonTitle?: string;
  searchButtonTitle?: string;
  // Additional callback for when repo is created - useful for side effects like clearing cache
  onRepoCreated?: (repo: Awaited<ReturnType<RemoteAuthGithubAgent["createRepo"]>>["data"]) => void;
  // Custom value processing - useful for things like updating related form fields
  onValueProcessing?: (value: string) => void;
}

export function GitHubRepoSelector<T extends FieldValues, K extends FieldPath<T>>({
  control,
  fieldName,
  onValueChange,
  onBlur,
  getValue,
  remoteAuth,
  defaultName,
  label = "Repository",
  placeholder = "my-repo",
  createButtonTitle = "Create Repository",
  searchButtonTitle = "Search Repositories",
  onRepoCreated,
  onValueProcessing,
}: GitHubRepoSelectorProps<T, K>) {
  const agent = useRemoteAuthAgent<RemoteAuthGithubAgent>(remoteAuth);

  // Check if user has private repo permissions based on scope
  // For GitHub OAuth: "repo" = full access, "public_repo" = public only
  const hasScope = !!(remoteAuth?.data && "scope" in remoteAuth.data && remoteAuth.data.scope);
  const scopeValue = hasScope ? (remoteAuth.data as any).scope : null;
  const canCreatePrivate = hasScope && scopeValue && scopeValue.includes("repo") && !scopeValue.includes("public_repo");

  // Default visibility: private if they can create private, otherwise public
  const [visibility, setVisibility] = useState<RepositoryVisibility>(canCreatePrivate ? "private" : "public");

  const {
    isLoading,
    searchValue,
    reset: searchReset,
    updateSearch,
    clearCache,
    searchResults,
    error,
  } = useRemoteGitRepoSearch({
    agent,
    cacheKey: String(remoteAuth?.guid),
  });

  const { ident, msg, request } = useRemoteGitRepo({
    agent,
    defaultName,
    onCreate: (repo) => {
      onRepoCreated?.(repo);
      clearCache();
    },
    visibility,
  });

  // Choose appropriate capability factory based on auth type
  const capabilities = hasScope ? createGitHubCapabilities(canCreatePrivate) : createGitHubAPICapabilities();

  const handleValueChange = (value: string) => {
    onValueChange(value);
    onValueProcessing?.(value);
  };

  const handleBlur = () => {
    if (onValueProcessing) {
      flushSync(() => {
        const repoName = coerceRepoToName(getValue() || "");
        onValueChange(repoName);
        onValueProcessing(repoName);
      });
    }
    onBlur?.();
  };

  return (
    <RepositoryCreationProvider capabilities={capabilities}>
      <RemoteResourceRoot
        control={control}
        fieldName={fieldName}
        onValueChange={handleValueChange}
        onBlur={handleBlur}
        getValue={getValue}
      >
        <RemoteResourceSearch
          label={label}
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={updateSearch}
          searchResults={searchResults}
          error={error}
        />
        <RemoteResourceCreate
          label={label}
          placeholder={placeholder}
          ident={ident}
          msg={msg}
          request={request}
          icon={getVisibilityIcon(visibility)}
        >
          <RepositoryVisibilitySelector value={visibility} onChange={setVisibility} />
        </RemoteResourceCreate>
        <RemoteResourceInput
          label={label}
          placeholder={placeholder}
          createButtonTitle={createButtonTitle}
          searchButtonTitle={searchButtonTitle}
          ident={ident}
          onSearchChange={updateSearch}
          searchReset={searchReset}
          createReset={request.reset}
        />
      </RemoteResourceRoot>
    </RepositoryCreationProvider>
  );
}