"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { AppSidebar } from "@/components/admin/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient()

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect ke login jika tidak terautentikasi atau bukan admin
    if (status === "unauthenticated" || (session && session.user.role !== "admin")) {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  // Tampilkan loading state hanya saat status masih loading
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Memuat...
      </div>
    );
  }

  // Jika tidak terautentikasi atau bukan admin, jangan render layout
  if (!session || session.user.role !== "admin") {
    return null;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
} 