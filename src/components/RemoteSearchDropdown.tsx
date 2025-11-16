import { Input } from "@/components/ui/input";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthGithubAgent } from "@/data/RemoteAuthAgent";
import { AgentFromRemoteAuth } from "@/data/RemoteAuthToAgent";
import { Ban, Loader } from "lucide-react";
import { useEffectEvent, useMemo, useState } from "react";

// const { msg, request, isValid, name, setName } = useAccountItem({ remoteAuth, defaultName: workspaceName });
type RemoteRequestType = {
  error: string | null;
  isLoading: boolean;
  create: (name: string, onCreate: (url: string) => void) => Promise<void>;
};
type RemoteRequestMsgType = {
  creating: string;
  askToEnter: string;
  valid: string;
  error: string | null;
};
type RemoteRequestIdentType = {
  isValid: boolean;
  name: string;
  setName: (name: string) => void;
};
namespace RemoteItemType {
  export type Request = RemoteRequestType;
  export type Msg = RemoteRequestMsgType;
  export type Ident = RemoteRequestIdentType;
}

function RemoteItemCreateInput({
  onClose,
  onCreated,
  request,
  msg,
  ident,
}: {
  onClose: () => void;
  onCreated: (repoUrl: string) => void;
  request: RemoteItemType.Request;
  msg: RemoteItemType.Msg;
  ident: RemoteItemType.Ident;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && ident.isValid) {
      e.preventDefault();
      return request.create(ident.name, onCreated);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="w-full relative">
      <div className="w-full p-0 relative">
        <Input
          autoFocus
          value={ident.name}
          onChange={(e) => ident.setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"my-new-repo"}
          className="w-full"
          disabled={request.isLoading}
        />

        {request.error && (
          <div className="absolute z-20 w-full top-10 bg-sidebar border border-destructive rounded-b-lg shadow-lg">
            <div className="flex items-center px-3 py-2 text-sm text-destructive">
              <Ban className="h-4 w-4 mr-2" />
              {request.error}
            </div>
          </div>
        )}

        {request.isLoading && (
          <div className="absolute z-20 w-full top-10 bg-sidebar border rounded-b-lg shadow-lg">
            <div className="flex items-center px-3 py-2 text-sm text-muted-foreground">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              {msg.creating}
            </div>
          </div>
        )}

        {!ident.isValid && (
          <div className="absolute z-20 w-full top-10 bg-sidebar border rounded-b-lg shadow-lg">
            <div className="px-3 py-2 text-sm text-muted-foreground">{msg.valid}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function useGithubRemoteItem({ remoteAuth, defaultName }: { remoteAuth: null | RemoteAuthDAO; defaultName?: string }) {
  const [name, setName] = useState(defaultName || "");
  const agent = useMemo(() => AgentFromRemoteAuth(remoteAuth) as RemoteAuthGithubAgent, [remoteAuth]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCreateRepo = useEffectEvent(async (repoName: string, onCreate: (url: string) => void) => {
    const finalRepoName = repoName.trim();
    if (!agent) {
      return console.warn("No agent available for creating repository");
    }
    if (!finalRepoName) return;
    setIsLoading(true);
    setError(null);
    try {
      const repoUrl = (await agent.createRepo(finalRepoName))?.data?.html_url;
      setError(null);
      return onCreate(repoUrl);
    } catch (err: any) {
      setError(err.message || "Failed to create repository");
    } finally {
      setIsLoading(false);
    }
  });
  return {
    request: {
      error,
      isLoading,
      reset: () => {
        setError(null);
        setIsLoading(true);
      },
      create: handleCreateRepo,
    },
    ident: {
      isValid: !error && !isLoading && name.trim(),
      setName,
      name,
    },
    msg: {
      creating: "Creating repository...",
      askToEnter: "Enter a name to create a new repository",
      valid: `Press Enter to create repository "${name.trim()}"`,
      error,
    },
  };
}

function useNetlifyRemoteItem() {
  // Placeholder for Netlify remote item logic
}
