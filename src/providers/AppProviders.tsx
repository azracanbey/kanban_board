"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { GlobalAIAssistantDrawer } from "@/components/ai/GlobalAIAssistantDrawer";
import { LanguageProvider } from "./LanguageContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <LanguageProvider>
        {children}
        <GlobalAIAssistantDrawer />
      </LanguageProvider>
    </ThemeProvider>
  );
}
