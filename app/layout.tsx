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
      <body>
        <div className="apixis-badge">
          <a href="https://www.apixis.dev" target="_blank" rel="noopener noreferrer">
            A Apixis Company
          </a>
        </div>
        {children}
      </body>
    </html>
  );
}
