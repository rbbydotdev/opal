import { JotaiProvider } from "@/app/JotaiProvider";
import { WorkspaceButtonBar } from "@/app/WorkSpaceButtonBar";
import { AsyncWindowErrorBoundary } from "@/components/AsyncWindowErrorBoundary";
import { ConfirmProvider } from "@/components/Confirm";
import { MDX_TREE_HIGHLIGHT_NAME } from "@/components/Editor/highlightMdxElement";
import { MDX_FOCUS_SEARCH_NAME, MDX_SEARCH_NAME } from "@/components/Editor/searchPlugin";
import { ThemeProvider } from "@/components/Editor/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorPlaque } from "@/components/ErrorPlaque";
import { ErrorPopper } from "@/components/ui/error-popup";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { ServiceWorker } from "@/lib/ServiceWorker/SwSetup";
import { RemoteMDXEditorRealmProvider } from "@mdxeditor/editor";
import { useEffect } from "react";

interface MainAppLayoutProps {
  children: React.ReactNode;
}

export function MainAppLayout({ children }: MainAppLayoutProps) {
  useEffect(() => {
    // return RequestSignalsInstance.initAndWatch((_count) => {});
  }, []);

  return (
    <>
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
                      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                        <ConfirmProvider>
                          <RemoteMDXEditorRealmProvider>
                            <div className="w-full flex">
                              <ErrorBoundary fallback={ErrorPlaque}>
                                <div className="w-20 flex flex-col flex-shrink-0 bg-secondary-foreground overflow-clip  flex-grow-0 max-h-screen">
                                  <WorkspaceButtonBar />
                                </div>
                                <ErrorBoundary fallback={ErrorPlaque}>{children}</ErrorBoundary>
                              </ErrorBoundary>
                            </div>
                          </RemoteMDXEditorRealmProvider>
                        </ConfirmProvider>
                      </ThemeProvider>
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
          background-color: hsl(var(--highlight));
          color: hsl(var(--background));
        }
        ::highlight(${MDX_FOCUS_SEARCH_NAME}) {
          background-color: hsl(var(--highlight-focus));
          color: hsl(var(--background));
        }
        ::highlight(${MDX_TREE_HIGHLIGHT_NAME}) {
          background-color: hsl(var(--highlight-focus));
          color: hsl(var(--background));
        }
      `}</style>
    </>
  );
}
