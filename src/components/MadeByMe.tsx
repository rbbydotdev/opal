import { OpalSvg } from "@/components/OpalSvg";

export const MadeByMe = () => (
  <span className="justify-center items-center gap-2 font-mono text-xs flex">
    <OpalSvg variant="round" className="w-5" /> made by
    <a href="https://github.com/rbbydotdev" className="inline text-ring hover:text-ring/80" tabIndex={-1}>
      @rbbydotdev
    </a>
  </span>
);
