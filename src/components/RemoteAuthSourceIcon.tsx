import { RemoteAuthSource, RemoteAuthType } from "@/data/RemoteAuthTypes";
import Cloudflare from "@/icons/cloudflare.svg?react";
import Github from "@/icons/github.svg?react";
import Netlify from "@/icons/netlify.svg?react";
import { LucideProps, Zap } from "lucide-react";
import React from "react";

export const RemoteAuthSourceIcon = {
  github: <Github style={{ width: "18px", height: "18px" }} />,
  netlify: <Netlify style={{ width: "18px", height: "18px" }} />,
  cloudflare: <Cloudflare style={{ width: "18px", height: "18px" }} />,
  custom: <Zap style={{ width: "18px", height: "18px" }} />,
};

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
  const Icon = RemoteAuthSourceIcon[source] || <Zap className="h-4 w-4" />; /*@ts-ignore*/
  return (
    <div className="bg-black p-0.5 rounded-md text-white">
      {React.cloneElement(Icon as React.ReactElement, { className, ...rest })}
    </div>
  );
}
