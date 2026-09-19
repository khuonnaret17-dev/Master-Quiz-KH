import type { Metadata } from "next";
import "./globals.css";
import { FirebaseProvider } from "@/lib/FirebaseProvider";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "កម្មវិធីត្រៀមប្រឡងក្របខ័ណ្ឌ",
  description: "An application providing information and quizzes about various Cambodian ministries, including logos and descriptions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <body className="antialiased">
        <Suspense fallback={null}>
          <FirebaseProvider>
            {children}
          </FirebaseProvider>
        </Suspense>
      </body>
    </html>
  );
}
