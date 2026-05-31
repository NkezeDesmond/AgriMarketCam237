import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type PageProps = {
  children: ReactNode;
  className?: string;
  width?: "narrow" | "wide" | "xl" | "full";
};

const widthClass: Record<NonNullable<PageProps["width"]>, string> = {
  narrow: "mx-auto w-full max-w-3xl",
  wide: "mx-auto w-full max-w-5xl",
  xl: "mx-auto w-full max-w-6xl",
  full: "w-full"
};

export function Page({ children, className, width = "narrow" }: PageProps) {
  return <div className={cn(widthClass[width], "space-y-8", className)}>{children}</div>;
}
