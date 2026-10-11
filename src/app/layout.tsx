import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";

// Force per-request rendering of the app shell. The / route is a client-rendered
// SPA shell, but Next.js was statically prerendering it (Cache-Control: s-maxage=31536000),
// which let the preview proxy serve STALE HTML (referencing old chunk hashes) after
// each rebuild → 404 → recurring "client-side exception". force-dynamic sets
// Cache-Control: no-store so every request gets fresh HTML referencing current chunks.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "STRIDES ONE — Employee Experience Portal",
  description:
    "Unified enterprise employee experience & workforce management platform for Strides Software. One portal for attendance, leave, tasks, performance, requests and AI assistance.",
  keywords: ["Strides One", "Employee Portal", "HRMS", "Workforce", "Aurangabad"],
  authors: [{ name: "Strides Software" }],
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230f766e'/%3E%3Ctext x='16' y='22' font-family='Arial' font-size='18' font-weight='bold' fill='white' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <QueryProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster />
              <SonnerToaster richColors position="top-right" />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
