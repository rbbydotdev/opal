"use client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";

import { WrkSpcButtonBar } from "@/app/WrkSpcButtonBar";

import { JotaiProvider } from "@/app/JotaiProvider";
import { AsyncWindowErrorBoundary } from "@/components/AsyncWindowErrorBoundary";
import { WorkspaceProvider } from "@/context";
import { Geist, Geist_Mono } from "next/font/google";

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* <FPSStats /> */}
        {/* <Inspector /> */}
        <WorkspaceProvider>
          <JotaiProvider>
            <SidebarProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <div className="w-screen overflow-hidden flex ">
                  <div className="h-screen w-20 flex flex-col flex-shrink-0 bg-secondary-foreground">
                    <WrkSpcButtonBar />
                  </div>
                  <div className="flex h-screen w-[calc(100vw-5rem)]">
                    <AsyncWindowErrorBoundary>{children}</AsyncWindowErrorBoundary>
                  </div>
                </div>
              </ThemeProvider>
            </SidebarProvider>
          </JotaiProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
