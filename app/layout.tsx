import type { Metadata } from "next";
import "./globals.css";
import ThemeInit from "./components/ThemeInit";

export const metadata: Metadata = {
  title: "stacksnumbers — numbers on demand for verification",
  description:
    "Buy a real, working phone line for the minute it takes to receive an SMS code. No contract, no SIM card, no number tied to your name.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Runs before paint to avoid a flash of the wrong theme on load.
            ThemeInit (in body) still handles live system-theme changes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'system';
                  var resolved = theme === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : theme;
                  document.documentElement.setAttribute('data-theme', resolved);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}