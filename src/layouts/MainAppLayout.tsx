import { BuildCreationProvider } from "@/components/build-modal/BuildModalContextProvider";
import { ConfirmProvider } from "@/components/ConfirmContext";
import { CustomQueryClientProvider } from "@/components/CustomQueryClientProvider";
import { DestinationManagerProvider } from "@/components/DestinationManagerContext";
import { AsyncWindowErrorBoundary } from "@/components/errors/AsyncWindowErrorBoundary";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ErrorMiniPlaque, ErrorPlaque } from "@/components/errors/ErrorPlaque";
import { WorkspaceErrorBoundaryFallback } from "@/components/errors/WorkspaceErrorBoundaryFallback";
import { GitStatusProvider } from "@/components/GitStatusModal";
import { LivePreviewDialogProvider } from "@/components/LivePreviewProvider";
import { PromptProvider } from "@/components/Prompt";
import { PublicationModalProvider } from "@/components/publish-modal/PubicationModalCmd";
import { ErrorPopper } from "@/components/ui/error-popup";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePreserveViewModeURL } from "@/editor/view-mode/usePreserveViewModeURL";
import { CompatibilityAlert } from "@/features/CompatibilityAlert";
import { WindowContextProviderComponent } from "@/features/live-preview/WindowContext";
import { useZoom } from "@/hooks/useZoom";
import { WS_BUTTON_BAR_ID } from "@/layouts/layout";
import { ThemeProvider } from "@/layouts/ThemeProvider";
import { WorkspaceButtonBar } from "@/layouts/WorkspaceButtonBar";
import { ServiceWorker } from "@/lib/service-worker/SwSetup";
import { WorkspaceProvider } from "@/workspace/WorkspaceContext";
import { RemoteMDXEditorRealmProvider } from "@mdxeditor/editor";
import { Toaster } from "sonner";
import { useThemeContext } from "./ThemeContext";

interface MainAppLayoutProps {
  children: React.ReactNode;
}

const Background = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useThemeContext();
  return (
    <>
      <div
        style={{
          backgroundImage: theme === "dark" ? "url('/opal-blank.svg')" : "url('/opal.svg')",
          backgroundRepeat: "repeat",
          backgroundSize: "600px 600px",
          left: "0px",
          opacity: theme === "dark" ? 0.3 : 0.2,
        }}
        className="h-full flex items-center justify-center absolute inset-0 bg-background -z-[1]"
      />
      {children}
    </>
  );
};

export function MainAppLayout({ children }: MainAppLayoutProps) {
  usePreserveViewModeURL();
  useZoom();
  return (
    <CustomQueryClientProvider>
      <ThemeProvider>
        <Background>
          <ServiceWorker>
            <Toaster />
            <CompatibilityAlert />

            <AsyncWindowErrorBoundary>
              <ErrorPopper>
                <ErrorBoundary fallback={WorkspaceErrorBoundaryFallback}>
                  <WorkspaceProvider>
                    <TooltipProvider delayDuration={1000}>
                      <WindowContextProviderComponent>
                        <LivePreviewDialogProvider>
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
                                              <div id={WS_BUTTON_BAR_ID} className="bg-muted">
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
                        </LivePreviewDialogProvider>
                      </WindowContextProviderComponent>
                    </TooltipProvider>
                  </WorkspaceProvider>
                </ErrorBoundary>
              </ErrorPopper>
            </AsyncWindowErrorBoundary>
          </ServiceWorker>
        </Background>
      </ThemeProvider>
    </CustomQueryClientProvider>
  );
}
