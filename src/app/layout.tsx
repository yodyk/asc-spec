import "./globals.css";
import type { Metadata } from "next";
import { Chrome } from "@/components/Chrome";
import { getSidebarData } from "@/lib/queries";

export const metadata: Metadata = {
  title: "ASC Spec Explorer",
  description:
    "The Automotive Standards Council standard — search every event and parameter, and see what's new in each release.",
};

// Reads Supabase per request (data changes daily; no build-time DB access needed).
export const dynamic = "force-dynamic";

// Set the saved theme before paint to avoid a flash.
const themeInit = `(function(){try{var t=localStorage.getItem('ascTheme');if(t&&t!=='system')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { navEvents, counts } = await getSidebarData();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <Chrome navEvents={navEvents} counts={counts}>
          {children}
        </Chrome>
      </body>
    </html>
  );
}
