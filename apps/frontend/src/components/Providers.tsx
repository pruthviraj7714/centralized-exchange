"use client";

import queryClient from "@/lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
