import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin", "greek"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FileShareX – Ασφαλής διαχείριση αρχείων",
  description: "Ασφαλής εταιρική κοινοποίηση και διαχείριση αρχείων",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body className={`${roboto.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
