import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Voting Platform",
  description: "Online voting platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
