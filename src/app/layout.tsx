import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRUCORE - Speak Freely. Report Safely.",
  description: "Enterprise-grade internal communication, survey, anonymous reporting, and whistleblowing platform.",
  keywords: ["surveys", "anonymous reporting", "whistleblowing", "enterprise", "feedback"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Providers>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderRadius: "12px",
                  padding: "16px",
                },
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
