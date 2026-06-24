import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智辩台 - AI智能辩论平台",
  description: "每日精选经济、社会、人文话题，AI辩手激烈交锋",
  referrer: "strict-origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Content Security Policy - 基本安全策略 */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://open.bigmodel.cn https://*.netlify.app https://*.github.io; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        />
        {/* X-Content-Type-Options */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        {/* X-Frame-Options */}
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        {/* Referrer Policy */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        {/* Permissions Policy - 限制不必要的权限 */}
        <meta
          httpEquiv="Permissions-Policy"
          content="camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()"
        />
      </head>
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
