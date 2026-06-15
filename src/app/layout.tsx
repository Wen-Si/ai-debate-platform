import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智辩台 - AI智能辩论平台",
  description: "每日精选经济、社会、人文话题，AI辩手激烈交锋",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
