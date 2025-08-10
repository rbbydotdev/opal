import { ThemeProvider } from "@/components/Editor/theme-provider";

import { WorkspaceButtonBar } from "@/app/WorkSpaceButtonBar";

import { JotaiProvider } from "@/app/JotaiProvider";
import { AsyncWindowErrorBoundary } from "@/components/AsyncWindowErrorBoundary";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";

import { MDX_TREE_HIGHLIGHT_NAME } from "@/components/Editor/highlightMdxElement";
import { MDX_FOCUS_SEARCH_NAME, MDX_SEARCH_NAME } from "@/components/Editor/searchPlugin";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorPlaque } from "@/components/ErrorPlaque";
import { ErrorPopper } from "@/components/ui/error-popup";
import { SidebarProvider } from "@/components/ui/sidebar";
// import { RequestSignalsInstance } from "@/lib/RequestSignals";
import { ServiceWorker } from "@/lib/ServiceWorker/SwSetup";
import { RemoteMDXEditorRealmProvider } from "@mdxeditor/editor";
import React, { useEffect } from "react";
import "../styles.css";

// Using CSS variables defined in styles.css for font families
// The Geist fonts are loaded via <link> tags in index.html

export default function RootLayout({
  children,
  newWorkspaceModal,
}: Readonly<{
  children: React.ReactNode;
  newWorkspaceModal: React.ReactNode;
}>) {
  useEffect(() => {
    // return RequestSignalsInstance.initAndWatch((_count) => {});
  }, []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      </head>
      <body className="font-sans antialiased">
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
                              dddddddddddddddddddddddddddd
                              <ErrorBoundary fallback={ErrorPlaque}>
                                <>{children}</>
                                <>{newWorkspaceModal}</>
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
      </body>
    </html>
  );
}
