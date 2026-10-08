import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GWD Team Rating Platform | Simple, Clean Event Management",
  description: "Official pre-deployment team rating, voting, and showcase platform for GWD events.",
  icons: {
    icon: "/gwd.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-white">
      <body className="h-full flex flex-col bg-white text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
