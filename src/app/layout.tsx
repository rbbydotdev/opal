"use client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";

import { WorkSpaceButtonBar } from "@/app/WorkSpaceButtonBar";

import { JotaiProvider } from "@/app/JotaiProvider";
import { AsyncWindowErrorBoundary } from "@/components/AsyncWindowErrorBoundary";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { Geist, Geist_Mono } from "next/font/google";

import { ErrorPopper } from "@/components/ui/error-popup";
import { RequestSignalsInstance } from "@/lib/RequestSignals";
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
          ::highlight(search) {
            background-color: yellow;
            color: black;
          }
        `}</style>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* <FPSStats /> */}
        {/* <Inspector /> */}
        <div
          style={{
            backgroundImage: "url('/opal-lite.svg')",
            backgroundRepeat: "repeat",
            backgroundSize: "600px 600px",
            position: "relative",
          }}
          className="w-full h-full flex items-center justify-center"
        >
          <AsyncWindowErrorBoundary>
            <ErrorPopper>
              <WorkspaceProvider>
                <JotaiProvider>
                  <SidebarProvider>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                      <div className="w-full flex">
                        <div className="h-screen w-20 flex flex-col flex-shrink-0 bg-secondary-foreground">
                          <WorkSpaceButtonBar />
                        </div>
                        {children}
                      </div>
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
