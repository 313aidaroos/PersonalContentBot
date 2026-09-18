import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
