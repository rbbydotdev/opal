import { JotaiProvider } from "@/app/JotaiProvider";
import { WorkspaceButtonBar } from "@/app/WorkspaceButtonBar";
import { AsyncWindowErrorBoundary } from "@/components/AsyncWindowErrorBoundary";
import { ConfirmProvider } from "@/components/Confirm";
import { MDX_TREE_HIGHLIGHT_NAME } from "@/components/Editor/highlightMdxElement";
import { MDX_FOCUS_SEARCH_NAME, MDX_SEARCH_NAME } from "@/components/Editor/searchPlugin";
import { usePreserveViewModeURL } from "@/components/Editor/view-mode/usePreserveViewModeURL";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorMiniPlaque, ErrorPlaque } from "@/components/ErrorPlaque";
import { PromptProvider } from "@/components/Prompt";
import { ErrorPopper } from "@/components/ui/error-popup";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { ThemeProvider } from "@/layouts/ThemeProvider";
import { ServiceWorker } from "@/lib/ServiceWorker/SwSetup";
import { cn } from "@/lib/utils";
import { RemoteMDXEditorRealmProvider } from "@mdxeditor/editor";

interface MainAppLayoutProps {
  children: React.ReactNode;
}

export function MainAppLayout({ children }: MainAppLayoutProps) {
  usePreserveViewModeURL();
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
            <AsyncWindowErrorBoundary>
              <ErrorPopper>
                <WorkspaceProvider>
                  <JotaiProvider>
                    <SidebarProvider>
                      <PromptProvider>
                        <ConfirmProvider>
                          {/* <FileTreeGitFileAttributesProvider> */}
                          <RemoteMDXEditorRealmProvider>
                            <div className="w-full flex">
                              <ErrorBoundary fallback={ErrorPlaque}>
                                <div
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
                          {/* </FileTreeGitFileAttributesProvider> */}
                        </ConfirmProvider>
                      </PromptProvider>
                    </SidebarProvider>
                  </JotaiProvider>
                </WorkspaceProvider>
              </ErrorPopper>
            </AsyncWindowErrorBoundary>
          </ServiceWorker>
        </div>
      </div>
      <style>{`
        ::highlight(${MDX_SEARCH_NAME}) {
          background-color: var(--highlight);
          color: var(--highlight-foreground);
        }
        ::highlight(${MDX_FOCUS_SEARCH_NAME}) {
          background-color: var(--highlight-focus);
          color: var(--highlight-focus-foreground);
        }
        ::highlight(${MDX_TREE_HIGHLIGHT_NAME}) {
          background-color: var(--highlight-focus);
          color: var(--highlight-focus-foreground);
        }
      `}</style>
    </ThemeProvider>
  );
}
