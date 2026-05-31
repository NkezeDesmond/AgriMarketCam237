import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { useInView } from "../hooks/useInView";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  y?: number;
};

export function Reveal({ children, className, delayMs = 0, y = 10 }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15 });

  return (
    <div
      ref={ref}
      className={cn("transition-[transform,opacity] duration-700 will-change-transform", inView ? "opacity-100" : "opacity-0", className)}
      style={{
        transform: inView ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
        transitionDelay: delayMs ? `${delayMs}ms` : undefined
      }}
    >
      {children}
    </div>
  );
}
