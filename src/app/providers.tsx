"use client";

import { FutureTellerProvider } from "@/context/FutureTellerContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <FutureTellerProvider>{children}</FutureTellerProvider>;
}
