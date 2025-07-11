"use client";
import { ThemeProvider } from "next-themes";

import { WorkSpaceButtonBar } from "@/app/WorkSpaceButtonBar";

import { JotaiProvider } from "@/app/JotaiProvider";
import { AsyncWindowErrorBoundary } from "@/components/AsyncWindowErrorBoundary";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { Geist, Geist_Mono } from "next/font/google";

import { MDX_FOCUS_SEARCH_NAME, MDX_SEARCH_NAME } from "@/components/Editor/searchPlugin";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorPlaque } from "@/components/ErrorPlaque";
import { ErrorPopper } from "@/components/ui/error-popup";
import { SidebarProvider } from "@/components/ui/sidebar";
import { RequestSignalsInstance } from "@/lib/RequestSignals";
import { RemoteMDXEditorRealmProvider } from "@mdxeditor/editor";
import React, { useEffect } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    return RequestSignalsInstance.initAndWatch((_count) => {});
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
        `}</style>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div
          style={{
            backgroundImage: "url('/opal-lite.svg')",
            backgroundRepeat: "repeat",
            backgroundSize: "600px 600px",
            position: "relative",
          }}
          className="w-full h-full flex items-center justify-center bg-background"
        >
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
                              <WorkSpaceButtonBar />
                            </div>
                            <ErrorBoundary fallback={ErrorPlaque}>
                              <>{children}</>
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
        </div>
      </body>
    </html>
  );
}
