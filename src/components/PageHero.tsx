import { type ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "../lib/cn";

type PageHeroProps = {
  title: string;
  subtitle?: string;
  imageUrl: string;
  imageUrlSm?: string;
  className?: string;
  children?: ReactNode;
  priority?: "high" | "low";
  size?: "md" | "lg";
  right?: ReactNode;
};

export function PageHero({ title, subtitle, imageUrl, imageUrlSm, className, children, priority = "high", size = "md", right }: PageHeroProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const shouldShowImage = useMemo(() => Boolean(imageUrl) && !failed, [failed, imageUrl]);
  const loading = priority === "high" ? "eager" : "lazy";

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [imageUrl, imageUrlSm]);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-background shadow-sm",
        size === "lg" ? "min-h-[300px] sm:min-h-[340px]" : "min-h-[140px] sm:min-h-[170px]",
        className
      )}
    >
      <div className="absolute inset-0">
        {shouldShowImage ? (
          <picture>
            {imageUrlSm ? <source media="(max-width: 640px)" srcSet={imageUrlSm} /> : null}
            <img
              src={imageUrl}
              alt=""
              className={cn(
                "h-full w-full object-cover object-center saturate-110 contrast-105 transition-opacity duration-500",
                loaded ? "opacity-100" : "opacity-0"
              )}
              loading={loading}
              decoding="async"
              {...({ fetchpriority: priority } as any)}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          </picture>
        ) : null}
        <div className="absolute inset-0 bg-black/25" />
        <div className={cn("absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10")} />
        <div className="absolute inset-0 bg-gradient-to-r from-background/75 via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/45" />
        <div className="absolute bottom-0 right-0 h-28 w-64 bg-gradient-to-tl from-background/45 via-background/15 to-transparent" />
        <div className="absolute bottom-0 right-0 h-14 w-56 bg-gradient-to-tl from-background/85 via-background/35 to-transparent backdrop-blur-sm" />
      </div>
      <div className={cn("relative px-4 py-6 sm:px-6 sm:py-8", size === "lg" ? "lg:py-10" : null)}>
        <div className={cn("grid gap-6", right ? "lg:grid-cols-[1.2fr_0.8fr] lg:items-center" : null)}>
          <div className="max-w-2xl">
            <div className="inline-flex max-w-full flex-col rounded-2xl border border-border/60 bg-background/90 px-4 py-3 shadow-lg backdrop-blur-sm sm:px-5 sm:py-4">
              <h1
                className={cn(
                  "text-balance font-semibold tracking-tight text-foreground",
                  size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
                )}
              >
                {title}
              </h1>
              {subtitle ? (
                <p
                  className={cn(
                    "mt-2 text-pretty font-medium leading-relaxed text-foreground/80",
                    size === "lg" ? "text-sm sm:text-base" : "text-sm sm:text-base"
                  )}
                >
                  {subtitle}
                </p>
              ) : null}
              {children ? <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div> : null}
            </div>
          </div>
          {right ? <div className="max-w-xl lg:justify-self-end">{right}</div> : null}
        </div>
      </div>
    </section>
  );
}

