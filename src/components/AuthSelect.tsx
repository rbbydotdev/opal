import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RemoteAuthType } from "@/Db/RemoteAuth";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { Github, Key, Plus, Shield } from "lucide-react";

interface AuthSelectProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  onAddAuth: () => void;
}

const AuthIcon = ({ type }: { type: RemoteAuthType }) => {
  const simpleType = type.split("/")[0];
  switch (simpleType) {
    case "api":
      return <Key className="w-4 h-4" />;
    case "oauth":
      return <Github className="w-4 h-4" />;
    default:
      return <Shield className="w-4 h-4" />;
  }
};

export function AuthSelect({
  value,
  onValueChange,
  onAddAuth,
  placeholder = "Select authentication",
}: AuthSelectProps) {
  const { remoteAuths } = useRemoteAuths();

  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === "none") {
      onValueChange(undefined);
    } else {
      onValueChange(selectedValue);
    }
  };

  const currentSelectValue = remoteAuths.find((auth) => auth.guid === value)?.guid || "none";
  return (
    <div className="flex items-center gap-2">
      <Select value={currentSelectValue} onValueChange={handleValueChange}>
        <SelectTrigger className="min-w-0 ">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span>No authentication</span>
            </div>
          </SelectItem>
          {remoteAuths.map((auth) => (
            <SelectItem key={auth.guid} value={auth.guid}>
              <div className="flex items-center gap-2 flex-grow">
                <AuthIcon type={auth.type} />
                <div className="flex w-full justify-center items-center gap-2 font-mono truncate ">
                  <div className="truncate ">
                    <span className="text-sm font-medium">{auth.name}</span>
                    <span>/</span>
                    <span className="text-xs text-muted-foreground capitalize">{auth.type}</span>
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          onAddAuth();
        }}
      >
        <Plus />
      </Button>
    </div>
  );
}
