import { useRemoteResourceContext } from "@/components/publish-modal/RemoteResourceMode";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useRepositoryCreation } from "./RepositoryCreationProvider";

export type RepositoryVisibility = "public" | "private";

export function RepositoryVisibilitySelector({
  value,
  onChange,
  disabled = false,
  className = "",
  onSelectionComplete,
  // onOpenChange,
}: {
  value: RepositoryVisibility;
  onChange: (visibility: RepositoryVisibility) => void;
  disabled?: boolean;
  className?: string;
  onSelectionComplete?: () => void;
  // onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState<boolean>(true);
  const repoCapabilities = useRepositoryCreation();

  const { setMode } = useRemoteResourceContext();
  if (!repoCapabilities?.canCreatePrivate) {
    return (
      <>
        <Input
          className="flex-1"
          placeholder={"my-repository"}
          value=""
          readOnly
          onFocus={() => setMode("create")}
          autoFocus={false}
        />
        <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
          {value === "public" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span>Public repository</span>
        </div>
      </>
    );
  }

  const handleSelectItem = (visibility: RepositoryVisibility) => {
    onChange(visibility);
    onSelectionComplete?.();
    setMode("create");
  };

  return (
    <>
      <Input
        className="flex-1"
        placeholder={"my-website-repo"}
        value=""
        readOnly
        onFocus={() => setMode("create")}
        autoFocus={false}
      />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={`flex items-center gap-2 ${className}`} disabled={disabled}>
            {value === "public" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span>{value === "public" ? "Public" : "Private"}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => handleSelectItem("public")} className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <div>
              <div className="font-medium">Public</div>
              <div className="text-xs text-muted-foreground">Anyone can see this repository</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleSelectItem("private")} className="flex items-center gap-2">
            <EyeOff className="h-4 w-4" />
            <div>
              <div className="font-medium">Private</div>
              <div className="text-xs text-muted-foreground">You choose who can see this repository</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function getVisibilityIcon(visibility: RepositoryVisibility) {
  return visibility === "public" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />;
}
