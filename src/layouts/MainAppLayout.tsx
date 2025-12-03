import { MDX_TREE_HIGHLIGHT_NAME } from "@/app/editor/highlightMdxElement";
import { MDX_FOCUS_SEARCH_NAME, MDX_SEARCH_NAME } from "@/app/editor/searchPlugin";
import { usePreserveViewModeURL } from "@/app/editor/view-mode/usePreserveViewModeURL";
import { WindowContextProviderComponent } from "@/app/IframeContextProvider";
import { WorkspaceButtonBar } from "@/app/WorkspaceButtonBar";
import { BuildCreationProvider } from "@/components/build-modal/BuildModalContextProvider";
import { ConfirmProvider } from "@/components/Confirm";
import { DestinationManagerProvider } from "@/components/DestinationManagerContext";
import { AsyncWindowErrorBoundary } from "@/components/errors/AsyncWindowErrorBoundary";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ErrorMiniPlaque, ErrorPlaque } from "@/components/errors/ErrorPlaque";
import { GitStatusProvider } from "@/components/GitStatusModal";
import { PromptProvider } from "@/components/Prompt";
import { PublicationModalProvider } from "@/components/publish-modal/PubicationModalCmd";
import { ErrorPopper } from "@/components/ui/error-popup";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WS_BUTTON_BAR_ID } from "@/constants/layout";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { useZoom } from "@/hooks/useZoom";
import { ThemeProvider } from "@/layouts/ThemeProvider";
import { WorkspaceErrorBoundaryFallback } from "@/layouts/WorkspaceErrorBoundaryFallback";
import { ServiceWorker } from "@/lib/service-worker/SwSetup";
import { cn } from "@/lib/utils";
import { RemoteMDXEditorRealmProvider } from "@mdxeditor/editor";
import { Toaster } from "sonner";

interface MainAppLayoutProps {
  children: React.ReactNode;
}

export function MainAppLayout({ children }: MainAppLayoutProps) {
  usePreserveViewModeURL();
  useZoom();
  return (
    <ThemeProvider>
      <div className="font-sans antialiased">
        <div
          style={{
            backgroundImage: "url('/opal-lite.svg')",
            backgroundRepeat: "repeat",
            backgroundSize: "600px 600px",
            position: "relative",
          }}
          className="w-full h-full flex items-center justify-center bg-background"
        >
          <ServiceWorker>
            <Toaster />

            <AsyncWindowErrorBoundary>
              <ErrorPopper>
                <ErrorBoundary fallback={WorkspaceErrorBoundaryFallback}>
                  <WorkspaceProvider>
                    <TooltipProvider delayDuration={1000}>
                      <WindowContextProviderComponent>
                        <GitStatusProvider>
                          <PublicationModalProvider>
                            <SidebarProvider>
                              <DestinationManagerProvider>
                                <BuildCreationProvider>
                                  <PromptProvider>
                                    <ConfirmProvider>
                                      <RemoteMDXEditorRealmProvider>
                                        <div className="w-full flex">
                                          <ErrorBoundary fallback={ErrorPlaque}>
                                            <div
                                              id={WS_BUTTON_BAR_ID}
                                              className={cn(
                                                "flex flex-col flex-shrink-0 bg-muted overflow-clip flex-grow-0 max-h-screen"
                                              )}
                                            >
                                              <ErrorBoundary fallback={ErrorMiniPlaque}>
                                                <WorkspaceButtonBar />
                                              </ErrorBoundary>
                                            </div>
                                            <ErrorBoundary fallback={ErrorPlaque}>{children}</ErrorBoundary>
                                          </ErrorBoundary>
                                        </div>
                                      </RemoteMDXEditorRealmProvider>
                                    </ConfirmProvider>
                                  </PromptProvider>
                                </BuildCreationProvider>
                              </DestinationManagerProvider>
                            </SidebarProvider>
                          </PublicationModalProvider>
                        </GitStatusProvider>
                      </WindowContextProviderComponent>
                    </TooltipProvider>
                  </WorkspaceProvider>
                </ErrorBoundary>
              </ErrorPopper>
            </AsyncWindowErrorBoundary>
          </ServiceWorker>
        </div>
      </div>
      <style>{`
        ::highlight(${MDX_SEARCH_NAME}) {
          background-color: oklch(var(--highlight));
          color: oklch(var(--highlight-foreground));
        }
        ::highlight(${MDX_FOCUS_SEARCH_NAME}) {
          background-color: oklch(var(--highlight-focus));
          color: oklch(var(--highlight-focus-foreground));
        }
        ::highlight(${MDX_TREE_HIGHLIGHT_NAME}) {
          background-color: oklch(var(--highlight-focus));
          color: oklch(var(--highlight-focus-foreground));
        }
      `}</style>
    </ThemeProvider>
  );
}
