import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirror Deployer — pump.fun reputation feed",
  description:
    "Paste any pump.fun deployer wallet. Get a reputation score, full launch history, and AI-generated thesis on every coin they ship.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
