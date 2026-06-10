import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qualisaúde",
  description: "Sistema QualiSaúde Hospitalar para auditoria e qualidade assistencial",
  icons: {
    icon: "/qualisaude-logo.png",
    shortcut: "/qualisaude-logo.png",
    apple: "/qualisaude-logo.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
