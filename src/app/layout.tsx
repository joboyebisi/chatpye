import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { DomainVerifier } from "@/components/auth/domain-verifier";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChatPye - AI Video Learning Companion",
  description: "Your personal AI tutor for video learning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <DomainVerifier />
          <main className="min-h-screen bg-background">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
