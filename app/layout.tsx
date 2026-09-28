import type { Metadata } from "next";
import "./globals.css";
import { ApixisWalletChip } from "@/components/ApixisWalletChip";

export const metadata: Metadata = {
  title: "PersonalContentBot",
  description: "Queue a one-minute social video. Script and storyboard now. Render next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="apixis-badge" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <a href="https://www.apixis.dev" target="_blank" rel="noopener noreferrer">
            A Apixis Company
          </a>
          <ApixisWalletChip />
        </div>
        {children}
      </body>
    </html>
  );
}
