"use client";

import type React from "react";

import { Github, ChromeIcon as Google } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ConnectionType = {
  id: string;
  name: string;
  description: string;
  type: "oauth" | "apikey";
  icon: React.ReactNode;
};

const connectionTypes: ConnectionType[] = [
  {
    id: "github-api",
    name: "GitHub API",
    description: "Connect using a GitHub API key",
    type: "apikey",
    icon: <Github className="h-5 w-5" />,
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth",
    description: "Connect using GitHub OAuth",
    type: "oauth",
    icon: <Github className="h-5 w-5" />,
  },
  {
    id: "google-oauth",
    name: "Google OAuth",
    description: "Connect using Google OAuth",
    type: "oauth",
    icon: <Google className="h-5 w-5" />,
  },
];

export function ConnectionsModal({ children }: { children: React.ReactNode }) {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [apiName, setApiName] = useState("");
  const [apiKey, setApiKey] = useState("");

  const selectedConnection = connectionTypes.find((connection) => connection.id === selectedConnectionId);

  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting API connection:", {
      connectionType: selectedConnection,
      name: apiName,
      key: apiKey,
    });
    resetForm();
    setOpen(false);
  };

  const handleOAuthConnect = () => {
    // Handle OAuth flow initiation
    console.log("Initiating OAuth flow for:", selectedConnection);
    // In a real implementation, you would redirect to the OAuth provider here
    // For demonstration purposes, we'll just close the modal
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setSelectedConnectionId("");
    setApiName("");
    setApiKey("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect to API</DialogTitle>
          <DialogDescription>Connect your application to various APIs to extend its functionality.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="connection-type">Connection Type</Label>
            <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
              <SelectTrigger id="connection-type">
                <SelectValue placeholder="Select a connection type" />
              </SelectTrigger>
              <SelectContent>
                {connectionTypes.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    <div className="flex items-center gap-2">
                      {connection.icon}
                      <div>
                        <p className="text-sm font-medium">{connection.name}</p>
                        <p className="text-xs text-muted-foreground">{connection.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedConnection && (
            <div className="pt-2">
              {selectedConnection.type === "apikey" ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-name">Connection Name</Label>
                    <Input
                      id="api-name"
                      value={apiName}
                      onChange={(e) => setApiName(e.target.value)}
                      placeholder="My GitHub API"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      type="password"
                      placeholder="Enter your API key"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Connect</Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md bg-muted p-4">
                    <p className="text-sm">
                      You will be redirected to {selectedConnection.name.split(" ")[0]} to authorize this connection.
                      After authorization, you will be redirected back to this application.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleOAuthConnect} className="flex items-center gap-2">
                      {selectedConnection.icon}
                      Connect with {selectedConnection.name.split(" ")[0]}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
