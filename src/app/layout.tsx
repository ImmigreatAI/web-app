import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Immigreat - Immigration Course Platform",
  description: "Master your immigration petition with expert-guided courses for EB1A, EB2-NIW and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        elements: {
          formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
          card: "bg-background border border-border shadow-lg",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton: "border border-border bg-background hover:bg-accent text-foreground",
          socialButtonsBlockButtonText: "text-foreground",
          formFieldInput: "bg-background border border-input",
          footerActionLink: "text-primary hover:text-primary/80",
        },
        variables: {
          colorPrimary: "hsl(var(--primary))",
          colorBackground: "hsl(var(--background))",
          colorInputBackground: "hsl(var(--background))",
          colorInputText: "hsl(var(--foreground))",
          colorText: "hsl(var(--foreground))",
          colorTextSecondary: "hsl(var(--muted-foreground))",
          colorTextOnPrimaryBackground: "hsl(var(--primary-foreground))",
          colorDanger: "hsl(var(--destructive))",
          borderRadius: "0.5rem",
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Toaster 
            position="top-right" 
            expand={true}
            richColors
            closeButton
          />
        </body>
      </html>
    </ClerkProvider>
  );
}