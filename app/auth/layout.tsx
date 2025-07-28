// app/auth/layout.tsx
import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider"; // pastikan path sesuai

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
    </ThemeProvider>
  );
}