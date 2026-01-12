import { OpalSvg } from "@/components/OpalSvg";
import { Github } from "lucide-react";
import { memo } from "react";

export const MadeByMe = memo(() => {
  return (
    <span className="justify-center items-center gap-2 font-mono text-xs flex">
      <OpalSvg variant="round" className="w-5" /> made by
      <a
        href="https://github.com/rbbydotdev"
        title="rbbydotdev's github"
        className="inline text-ring hover:text-ring/80"
        tabIndex={-1}
      >
        @rbbydotdev
      </a>
      /
      <a
        href="https://github.com/rbbydotdev/opal"
        title="Opal Github Repo"
        className="inline text-ring hover:text-ring/80"
        tabIndex={-1}
      >
        <Github className="h-3.5" />
      </a>
    </span>
  );
});

// Optional: to lock it down even further
MadeByMe.displayName = "MadeByMe";
