import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Key, Github } from "lucide-react";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";

interface AuthSelectProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
}

export function AuthSelect({ value, onValueChange, placeholder = "Select authentication" }: AuthSelectProps) {
  const { remoteAuths, loading, error } = useRemoteAuths();

  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === "none") {
      onValueChange(undefined);
    } else {
      onValueChange(selectedValue);
    }
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading auths..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Error loading auths" />
        </SelectTrigger>
      </Select>
    );
  }

  const getAuthIcon = (authType: "api" | "oauth") => {
    switch (authType) {
      case "api":
        return <Key className="w-4 h-4" />;
      case "oauth":
        return <Github className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <Select value={value || "none"} onValueChange={handleValueChange}>
      <SelectTrigger>
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
          <SelectItem key={auth.id} value={auth.id}>
            <div className="flex items-center gap-2">
              {getAuthIcon(auth.authType)}
              <div>
                <p className="text-sm font-medium">{auth.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{auth.authType}</p>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}