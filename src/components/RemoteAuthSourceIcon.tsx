import { RemoteAuthSource, RemoteAuthType } from "@/Db/RemoteAuth";
import { Github, LucideProps } from "lucide-react";
import React from "react";

export const RemoteAuthSourceIcon = {
  github: <Github className="h-4 w-4" />,
} satisfies Record<RemoteAuthSource, React.ReactNode>;

// type RemoteAuthSourceIconType = (typeof RemoteAuthSourceIcon)[keyof typeof RemoteAuthSourceIcon];

export function RemoteAuthSourceIconComponent({
  source,
  type,
  className,
  ...rest
}: {
  source: RemoteAuthSource;
  type?: RemoteAuthType;
  className?: string;
} & LucideProps) {
  const Icon = RemoteAuthSourceIcon[source]; /*@ts-ignore*/
  return React.cloneElement(Icon as React.ReactElement, { className, ...rest });
}
