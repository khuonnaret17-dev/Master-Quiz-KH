import type { Metadata } from "next";
import { Khmer } from "next/font/google";
import "./globals.css";
import { FirebaseProvider } from "@/lib/FirebaseProvider";

const khmer = Khmer({ subsets: ["khmer"], weight: "400", variable: "--font-khmer" });

export const metadata: Metadata = {
  title: "Cambodia Ministry Hub",
  description: "Information and Quizzes about Cambodian Ministries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${khmer.variable}`}>
      <body className="font-khmer">
        <div className="fixed inset-0 z-[-1] min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50 to-amber-50 bg-[length:400%_400%] animate-bg-shift overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200/40 mix-blend-multiply filter blur-[100px] animate-float"></div>
          <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-200/40 mix-blend-multiply filter blur-[120px] animate-float-delayed"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-emerald-200/30 mix-blend-multiply filter blur-[150px] animate-pulse-slow"></div>
        </div>
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  );
}
