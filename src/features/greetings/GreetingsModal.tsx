import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/tooltip-toast";
import { useIsMobileAgent } from "@/features/compat-checker/CompatChecker";
import { BookOpen, Briefcase, Github, HardDrive, Image, Monitor, Rocket, Share2, Zap } from "lucide-react";
import { useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";

export const useGreetingsModal = () => {
  const [refParam, setRefParam] = useQueryState("ref");

  const openAsAbout = useCallback(() => setRefParam("0"), [setRefParam]);
  return { refParam, setRefParam, openAsAbout };
};
export function GreetingsModal() {
  const { refParam, setRefParam } = useGreetingsModal();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobileAgent();

  const quickZoomStyleHack = useMemo(
    () =>
      isMobile
        ? {
            zoom: 0.85,
          }
        : {},
    [isMobile]
  );

  const { show: showToast, cmdRef: toastRef } = useTooltipToastCmd();

  if (refParam && !open) {
    setOpen(true);
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);

    if (!newOpen && refParam) {
      // Remove the ref param when modal closes
      void setRefParam(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Opal - Local-first Markdown Editor",
          text: "Check out Opal, a local-first markdown editor and static publisher!",
          url: window.location.origin,
        })
        .catch(console.error);
    } else {
      await navigator.clipboard
        .writeText(window.location.origin)
        .then(() => showToast("Link copied to clipboard!", "success"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        style={quickZoomStyleHack}
        className="left-0 top-0 right-0 w-full h-[100dvh] max-w-none max-h-none rounded-none translate-x-0 translate-y-0 p-4 pt-8 sm:[transform:translateX(-50%)] sm:left-[50%] sm:top-[10vh] sm:right-auto sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[80vh] sm:rounded-lg sm:p-6 flex flex-col overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {refParam === "0" ? (
              "About"
            ) : (
              <>
                Greetings, <span className="capitalize">{refParam}</span> 👋
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-base pt-2 space-y-2">
            <p>Welcome to Opal, a local-first markdown editor built for complete self-custody</p>
            <p className="text-sm">
              Opal is <span className="font-semibold text-foreground">free and open source</span> and is looking for
              contributors like you!
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto h-full">
          <h3 className="font-bold italic">Why Opal?</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Browser-native:</span> Zero backend dependencies, works entirely in your
                browser
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Image className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Drag & drop images:</span> Paste or drop images with automatic WebP
                conversion
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Live preview:</span> Split-screen editing with real-time markdown
                rendering
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Rocket className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">One-click publishing:</span> Deploy to Netlify, Vercel, Cloudflare, and
                more
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HardDrive className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Flexible storage:</span> In-browser virtual files or local files{" "}
                <span className="text-muted-foreground">(Chrome only)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              className="flex h-auto py-3 gap-2"
              asChild
              onClick={() => handleOpenChange(false)}
            >
              <a href="https://github.com/rbbydotdev/opal" target="_blank" rel="noopener noreferrer">
                <Github className="w-5 h-5" />
                <span className="text-xs">Star Repo</span>
              </a>
            </Button>

            <Button variant="outline" className="flex h-auto py-3 gap-2" asChild>
              <a href="/docs/" onClick={() => handleOpenChange(false)}>
                <BookOpen className="w-5 h-5" />
                <span className="text-xs">Read Docs</span>
              </a>
            </Button>

            <TooltipToast cmdRef={toastRef} message="Link copied to clipboard!" durationMs={2000}>
              <Button variant="outline" onClick={handleShare} className="h-full flex py-3 gap-2">
                <Share2 className="w-5 h-5" />
                <span className="text-xs">Share</span>
              </Button>
            </TooltipToast>

            <Button variant="default" className="flex h-auto py-3 gap-2" asChild>
              <a href="https://rbby.dev" target="_blank" rel="noopener noreferrer">
                <Briefcase className="w-5 h-5" />
                <span className="text-xs">Hire Me</span>
                <span className="">👋</span>
              </a>
            </Button>
          </div>
          <Separator />
          <Button variant="outline" className="flex h-auto py-3 gap-2 w-full" onClick={() => handleOpenChange(false)}>
            <span className="text-xs">COOL</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
