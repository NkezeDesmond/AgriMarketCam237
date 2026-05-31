import { cn } from "../lib/cn";

type LogoMarkProps = {
  className?: string;
  sizeClassName?: string;
};

export function LogoMark({ className, sizeClassName = "size-9" }: LogoMarkProps) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-2xl border border-border bg-background/75 shadow-md backdrop-blur-sm",
        sizeClassName,
        className
      )}
      aria-hidden="true"
    >
      <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent shadow-sm" />
      <svg viewBox="0 0 48 48" className="size-7" fill="none" aria-hidden="true">
        <path
          className="text-accent"
          d="M9.5 18.5 24 10l14.5 8.5"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="text-primary"
          d="M14 20.5v13.8c0 1.6 1.3 2.8 2.9 2.8h14.2c1.6 0 2.9-1.2 2.9-2.8V20.5"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.92"
        />
        <path
          className="text-primary"
          d="M19 29.8c3.4-6.1 9.8-8.7 10.6-9-.5 4.4-2.2 13.7-10.6 16.4.3-2.2.3-5.1 0-7.4Z"
          fill="currentColor"
          opacity="0.92"
        />
        <path
          className="text-accent"
          d="M22.7 28.6c2.4 1.2 5.2 1.3 8.5.4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}

type LogoLockupProps = {
  className?: string;
  subtitle?: string;
};

type LogoWordmarkProps = {
  className?: string;
  subtitle?: string;
  compact?: boolean;
  showMark?: boolean;
};

export function LogoWordmark({ className, subtitle, compact = false, showMark = true }: LogoWordmarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showMark ? <LogoMark sizeClassName={compact ? "size-9 rounded-xl" : "size-10 rounded-2xl"} /> : null}
      <div className="leading-tight">
        <div className={cn("flex items-baseline gap-2", compact ? "text-base" : "text-lg sm:text-xl")}>
          <span className="font-semibold tracking-tight text-foreground [letter-spacing:-0.03em]">AgriMarket Cameroon</span>
        </div>
        {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export function LogoLockup({ className, subtitle }: LogoLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className="font-semibold tracking-tight">AgriMarket Cameroon</div>
        {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
    </div>
  );
}
