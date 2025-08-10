"use client";

import type React from "react";

import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { Github, Loader } from "lucide-react";
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
import { Link } from "@tanstack/react-router";

type ConnectionType = {
  id: string;
  name: string;
  description: string;
  type: "oauth" | "apikey" | "device";
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
    id: "github-device",
    name: "GitHub Device Auth",
    description: "Connect using GitHub Device Authentication",
    type: "device",
    icon: <Github className="h-5 w-5" />,
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth",
    description: "Connect using GitHub OAuth",
    type: "oauth",
    icon: <Github className="h-5 w-5" />,
  },
];

export function ConnectionsModal({
  children,
  mode = "add",
  editConnection,
  onSuccess,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  mode?: "add" | "edit";
  editConnection?: {
    id: string;
    name: string;
    type: string;
    authType: "api" | "oauth";
  };
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(editConnection?.type || "");
  const [apiName, setApiName] = useState(editConnection?.name || "");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedConnection = connectionTypes.find((connection) => connection.id === selectedConnectionId);

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnection || !apiName.trim()) return;

    setSubmitting(true);
    try {
      if (selectedConnection.type === "apikey") {
        if (mode === "edit" && editConnection) {
          // Update existing connection
          const dao = RemoteAuthDAO.FromJSON({
            guid: editConnection.id,
            authType: "api",
            tag: apiName,
          });
          dao.record = {
            authType: "api",
            apiKey: apiKey,
            apiSecret: apiSecret || apiKey,
          };
          await dao.save();
        } else {
          // Create new connection
          await RemoteAuthDAO.Create(apiName, {
            authType: "api",
            apiKey: apiKey,
            apiSecret: apiSecret || apiKey,
          });
        }
      }

      onSuccess?.();
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving connection:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthConnect = () => {
    // Handle OAuth flow initiation
    console.log("Initiating OAuth flow for:", selectedConnection);
    // In a real implementation, you would redirect to the OAuth provider here
    // For demonstration purposes, we'll just close the modal
    resetForm();
    setIsOpen(false);
  };

  const resetForm = () => {
    setSelectedConnectionId("");
    setApiName("");
    setApiKey("");
    setApiSecret("");
  };

  // </Dialog>
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[26.5625rem]">
        <ConnectionsModalContent
          mode={mode}
          editConnection={editConnection}
          onSuccess={onSuccess}
          onOpenChange={setIsOpen}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsModalContent({
  mode,
  editConnection,
  onSuccess,
  onOpenChange,
  className,
}: {
  mode: "add" | "edit";
  editConnection?: {
    id: string;
    name: string;
    type: string;
    authType: "api" | "oauth";
  };
  className?: string;
  onSuccess?: (rad?: RemoteAuthDAO) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    editConnection?.type || connectionTypes[0]!.id
  );
  const [apiName, setApiName] = useState(editConnection?.name || "");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedConnection = connectionTypes.find((connection) => connection.id === selectedConnectionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnection || !apiName.trim()) return;

    setSubmitting(true);
    try {
      if (selectedConnection.type === "apikey") {
        if (mode === "edit" && editConnection) {
          // Update existing connection
          const dao = RemoteAuthDAO.FromJSON({
            guid: editConnection.id,
            authType: "api",
            tag: apiName,
          });
          dao.record = {
            authType: "api",
            apiKey: apiKey,
            apiSecret: apiSecret || apiKey,
          };
          await dao.save();
          onSuccess?.(dao);
        } else {
          // Create new connection
          onSuccess?.(
            await RemoteAuthDAO.Create(apiName, {
              authType: "api",
              apiKey: apiKey,
              apiSecret: apiSecret || apiKey,
            })
          );
        }
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving connection:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthConnect = () => {
    // Handle OAuth flow initiation
    console.log("Initiating OAuth flow for:", selectedConnection);
    // In a real implementation, you would redirect to the OAuth provider here
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setSelectedConnectionId("");
    setApiName("");
    setApiKey("");
    setApiSecret("");
  };

  // <DialogContent className="sm:max-w-[26.5625rem]">
  // </DialogContent>
  return (
    <div className={className}>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit Connection" : "Connect to API"}</DialogTitle>
        <DialogDescription>
          {mode === "edit"
            ? "Update your connection details."
            : "Connect your application to various APIs to extend its functionality."}
        </DialogDescription>
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

        {!Boolean(selectedConnection) && (
          <div className="flex w-full justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        )}
        <div className="pt-2">
          {selectedConnection?.type === "apikey" && (
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
              <div className="space-y-2">
                <Label htmlFor="api-secret">API Secret (Optional)</Label>
                <Input
                  id="api-secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  type="password"
                  placeholder="Enter your API secret (if different from key)"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : mode === "edit" ? "Update" : "Connect"}
                </Button>
              </div>
            </form>
          )}
          {selectedConnection?.type === "oauth" && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm">
                  You will be redirected to {selectedConnection.name.split(" ")[0]} to authorize this connection. After
                  authorization, you will be redirected back to this application.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleOAuthConnect} className="flex items-center gap-2">
                  {selectedConnection.icon}
                  Connect with {selectedConnection.name.split(" ")[0]}
                </Button>
              </div>
            </div>
          )}
          {selectedConnection?.type === "device" && (
            <DeviceAuth selectedConnection={selectedConnection} onCancel={() => onOpenChange(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceAuth({ selectedConnection, onCancel }: { selectedConnection: ConnectionType; onCancel: () => void }) {
  const [state, setState] = useState<"idle" | "loading" | "loaded">("idle");
  const [pin, setPin] = useState<string>("");

  return (
    <div className="space-y-4">
      {Boolean(pin) && (
        <div className="rounded-md bg-muted p-4">
          <p className="text-sm mb-2">
            <Link
              className="hover:text-bold underline"
              href="https://github.com/login/device"
              target="_blank"
              rel="noopener noreferrer"
            >
              Navigate to {selectedConnection.name.split(" ")[0]}
            </Link>{" "}
            and enter device PIN below to authenticate.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            {Array.from(pin).map((char, idx) => (
              <span
                key={idx}
                className="inline-flex items-center justify-center rounded-lg bg-background border px-2 py-1 text-xl font-mono font-bold"
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {!Boolean(pin) && (
          <Button
            type="button"
            // variant=""
            onClick={() => {
              setState("loading");
              // Simulate loading the pin
              setTimeout(() => {
                setPin("12345678"); // Replace with actual pin fetching logic
                setState("loaded");
              }, 2000); // Simulate a 2-second loading time
            }}
          >
            {state === "loading" ? (
              <>
                <Loader size={12} className="animate-spin animation-iteration-infinite" />
                Load Device PIN
              </>
            ) : (
              "Load Device PIN"
            )}
          </Button>
        )}
        {Boolean(pin) && (
          <Button asChild type="button" className="flex items-center gap-2">
            <Link href="https://github.com/login/device" target="_blank" rel="noopener noreferrer">
              {selectedConnection.icon}
              Go to {selectedConnection.name.split(" ")[0]}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// function LoadDevicePin({ url, action }: { url: string; action: "post" | "get" }) {
//   // This is a placeholder for the actual implementation of loading the device pin.
//   // In a real application, you would fetch the pin from the server or generate it.

//   if (state === "idle") {
//     return (
//       <Button
//         variant="outline"
//         onClick={() => {
//           setState("loading");
//           // Simulate loading the pin
//           setTimeout(() => {
//             setState("loaded");
//           }, 2000); // Simulate a 2-second loading time
//         }}
//       >
//         Load Device PIN
//       </Button>
//     );
//   }

//   return;
// }
