import { RemoteAuthSource, RemoteAuthType } from "@/data/RemoteAuthTypes";
import AWS from "@/icons/aws.svg?react";
import Cloudflare from "@/icons/cloudflare.svg?react";
import Github from "@/icons/github.svg?react";
import Netlify from "@/icons/netlify.svg?react";
import Vercel from "@/icons/vercel.svg?react";
import { LucideProps, Zap } from "lucide-react";
import React from "react";

const WH = "16px";
const RemoteAuthSourceIcon = {
  github: <Github style={{ width: WH, height: WH }} />,
  netlify: <Netlify style={{ width: WH, height: WH }} />,
  cloudflare: <Cloudflare style={{ width: WH, height: WH }} />,
  vercel: <Vercel style={{ width: WH, height: WH }} />,
  aws: <AWS style={{ width: WH, height: WH }} />,
  custom: <Zap style={{ width: WH, height: WH }} />,
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
    <div className="dark:bg-black bg-white dark:text-white text-black p-0.5 rounded-md w-5 h-5 flex items-center justify-center">
      {React.cloneElement(Icon as React.ReactElement, { className, ...rest } as any)}
    </div>
  );
}
