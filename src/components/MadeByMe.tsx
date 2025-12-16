import { OpalSvg } from "@/components/OpalSvg";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
export const MadeByMe = () => (
  <span className="justify-center items-center gap-2 font-mono text-xs flex">
    <OpalSvg variant="round" className="w-5" /> made by
    <a href="https://github.com/rbbydotdev" className="inline text-ring hover:text-ring/80" tabIndex={-1}>
      @rbbydotdev
    </a>
    <Button variant="ghost" size="icon" asChild>
      <Github className="w-4 h-4 text-ring" />
    </Button>
  </span>
);
