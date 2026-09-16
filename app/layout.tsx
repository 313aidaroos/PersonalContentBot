import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PersonalContentBot",
  description: "Queue a one-minute social video. Script and storyboard now. Render next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
