"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { useI18n } from "@/providers";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  isLoading?: boolean;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "bg-[#c1c7ff] text-[#1a1a2e] shadow-sm ring-1 ring-[#a8b0e8]/80 hover:brightness-95 active:brightness-90 disabled:opacity-50 dark:bg-[#3a3f5c] dark:text-[#f1f3f9] dark:ring-[#4a5070]/80",
  secondary:
    "bg-[#e5e7eb] text-[#1a1a2e] shadow-sm ring-1 ring-gray-300/80 hover:brightness-95 active:brightness-90 disabled:opacity-50 dark:bg-[#2a2d3e] dark:text-[#f1f3f9] dark:ring-[#3a3d52]",
  danger:
    "bg-[#ffc1c1] text-[#1a1a2e] shadow-sm ring-1 ring-red-200/50 hover:brightness-95 active:brightness-90 disabled:opacity-50 dark:bg-[#4a2c2c] dark:text-[#f1f3f9] dark:ring-red-900/30",
};

export function Button({
  children,
  className = "",
  disabled,
  isLoading = false,
  type = "button",
  variant = "primary",
  ...rest
}: ButtonProps) {
  const { t } = useI18n();

  return (
    <button
      type={type}
      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c1c7ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-page)] disabled:cursor-not-allowed dark:focus-visible:ring-[#4a5070] dark:focus-visible:ring-offset-[#0f1117] ${variantClassMap[variant]} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? t("common.loading") : children}
    </button>
  );
}
