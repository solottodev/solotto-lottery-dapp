import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "./providers";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Solotto Lottery",
  description: "Decentralized lottery dashboard powered by Tailwind CSS",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen overflow-x-hidden bg-night font-sans text-slate-100 antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-body-gradient" />
          <div className="absolute inset-0 bg-night-grid opacity-40 [background-size:60px_60px] animate-grid-float" />
          <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[22rem]" />
          <div className="absolute bottom-[-10rem] right-[-8rem] h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-[18rem]" />
          <div className="absolute left-[-8rem] top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 rounded-full bg-indigo/20 blur-[18rem]" />
        </div>
        <div className="relative flex min-h-screen flex-col overflow-x-hidden pt-40 md:pt-48 lg:pt-52">
          <Providers>
            <SiteHeader />
            <div>{children}</div>
          </Providers>
        </div>
      </body>
    </html>
  );
}
