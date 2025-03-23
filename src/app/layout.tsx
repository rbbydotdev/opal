"use client";
import { SidebarProvider, useSidebarState } from "@/components/ui/sidebar";
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
  const [defaultOpen] = useSidebarState();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* <FPSStats /> */}
        <WorkspaceProvider>
          <JotaiProvider>
            <SidebarProvider defaultOpen={defaultOpen}>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <div className="w-full flex h-screen overflow-hidden">
                  <WrkSpcButtonBar />
                  <AsyncWindowErrorBoundary>{children}</AsyncWindowErrorBoundary>
                </div>
              </ThemeProvider>
            </SidebarProvider>
          </JotaiProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
