import { BuildCreationProvider } from "@/components/build-modal/BuildModalContextProvider";
import { ConfirmProvider } from "@/components/Confirm";
import { DestinationManagerProvider } from "@/components/DestinationManagerContext";
import { AsyncWindowErrorBoundary } from "@/components/errors/AsyncWindowErrorBoundary";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ErrorMiniPlaque, ErrorPlaque } from "@/components/errors/ErrorPlaque";
import { WorkspaceErrorBoundaryFallback } from "@/components/errors/WorkspaceErrorBoundaryFallback";
import { GitStatusProvider } from "@/components/GitStatusModal";
import { PromptProvider } from "@/components/Prompt";
import { PublicationModalProvider } from "@/components/publish-modal/PubicationModalCmd";
import { ErrorPopper } from "@/components/ui/error-popup";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { MDX_TREE_HIGHLIGHT_NAME } from "@/editor/highlightMdxElement";
import { MDX_FOCUS_SEARCH_NAME, MDX_SEARCH_NAME } from "@/editor/searchPlugin";
import { usePreserveViewModeURL } from "@/editor/view-mode/usePreserveViewModeURL";
import { WindowContextProviderComponent } from "@/features/live-preview/IframeContextProvider";
import { useZoom } from "@/hooks/useZoom";
import { WS_BUTTON_BAR_ID } from "@/layouts/layout";
import { ThemeProvider, useThemeSettings } from "@/layouts/ThemeProvider";
import { WorkspaceButtonBar } from "@/layouts/WorkspaceButtonBar";
import { ServiceWorker } from "@/lib/service-worker/SwSetup";
import { cn } from "@/lib/utils";
import { RemoteMDXEditorRealmProvider } from "@mdxeditor/editor";
import { Toaster } from "sonner";

interface MainAppLayoutProps {
  children: React.ReactNode;
}

const Background = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useThemeSettings();
  return (
    <>
      <div
        style={{
          backgroundImage: theme === "dark" ? "url('/opal-blank.svg')" : "url('/opal.svg')",
          backgroundRepeat: "repeat",
          backgroundSize: "600px 600px",
          left: "6rem",
          opacity: theme === "dark" ? 0.3 : 0.2,
        }}
        className="w-full h-full flex items-center justify-center absolute inset-0 bg-background -z-[1]"
      />
      {children}
    </>
  );
};

export function MainAppLayout({ children }: MainAppLayoutProps) {
  usePreserveViewModeURL();
  useZoom();
  return (
    <ThemeProvider>
      <Background>
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
      </Background>
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
