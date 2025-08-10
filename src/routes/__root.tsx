import { JotaiProvider } from "@/app/JotaiProvider";
import { WorkspaceButtonBar } from "@/app/WorkSpaceButtonBar";
import { AsyncWindowErrorBoundary } from "@/components/AsyncWindowErrorBoundary";
import { MDX_TREE_HIGHLIGHT_NAME } from "@/components/Editor/highlightMdxElement";
import { MDX_FOCUS_SEARCH_NAME, MDX_SEARCH_NAME } from "@/components/Editor/searchPlugin";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorPlaque } from "@/components/ErrorPlaque";
import { ErrorPopper } from "@/components/ui/error-popup";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { useEffect } from "react";
// import { RequestSignalsInstance } from "@/lib/RequestSignals";
import { ThemeProvider } from "@/components/Editor/theme-provider";
import { ServiceWorker } from "@/lib/ServiceWorker/SwSetup";
import { RemoteMDXEditorRealmProvider } from "@mdxeditor/editor";
import "../app/styles.css";

function RootComponent() {
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
                        <RemoteMDXEditorRealmProvider>
                          <div className="w-full flex">
                            <ErrorBoundary fallback={ErrorPlaque}>
                              <div className="w-20 flex flex-col flex-shrink-0 bg-secondary-foreground overflow-clip  flex-grow-0 max-h-screen">
                                <WorkspaceButtonBar />
                              </div>
                              <ErrorBoundary fallback={ErrorPlaque}>
                                <Outlet />
                              </ErrorBoundary>
                            </ErrorBoundary>
                          </div>
                        </RemoteMDXEditorRealmProvider>
                      </ThemeProvider>
                    </SidebarProvider>
                  </JotaiProvider>
                </WorkspaceProvider>
              </ErrorPopper>
            </AsyncWindowErrorBoundary>
          </ServiceWorker>
        </div>
      </div>
      <TanStackRouterDevtools />
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

export const Route = createRootRoute({
  component: RootComponent,
});
