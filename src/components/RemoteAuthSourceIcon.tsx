import { RemoteAuthSource } from "@/Db/RemoteAuth";
import { Github } from "lucide-react";

export const RemoteAuthSourceIcon = {
  github: <Github className="h-4 w-4" />,
} satisfies Record<RemoteAuthSource, React.ReactNode>;
