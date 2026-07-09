import { ClerkProvider } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import "./globals.css";

const Scene3D = dynamic(() => import("@/components/Scene3D"), { ssr: false });

export const metadata = {
  title: "StandOut - Your Personalized Ai Job Hunter",
  description: "Resume optimization, job matching, and interview prep — powered by AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
          <Scene3D />
          <div className="relative z-0">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  );
}
