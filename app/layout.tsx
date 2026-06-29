import type { ReactNode } from "react";
import "./globals.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="km">
      <head>
        <title>ប្រព័ន្ធចុះឈ្មោះសិស្ស</title>
        <meta
          name="description"
          content="គេហទំព័រចុះឈ្មោះ និងគ្រប់គ្រងបញ្ជីសិស្សជាភាសាខ្មែរ"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
