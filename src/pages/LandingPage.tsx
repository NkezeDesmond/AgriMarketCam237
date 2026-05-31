import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PageHero } from "../components/PageHero";
import { LANDING_HERO_IMAGE, LANDING_HERO_IMAGE_SM } from "../lib/constants";
import { Reveal } from "../components/Reveal";
import { useInView } from "../hooks/useInView";
import { cn } from "../lib/cn";

export function LandingPage() {
  const { t } = useTranslation();
  const categories = [
    { key: "maize", label: "Maize", image: "/categories/maize-photo.jpg" },
    { key: "cassava", label: "Cassava", image: "/categories/cassava-photo.jpg" },
    { key: "plantain", label: "Plantain", image: "/categories/plantain-photo.jpg" },
    { key: "cocoa", label: "Cocoa", image: "/categories/cocoa-photo.jpg" },
    { key: "coffee", label: "Coffee", image: "/categories/coffee-photo.jpg" },
    { key: "palm-oil", label: "Palm oil", image: "/categories/palm-oil-photo.jpg" },
    { key: "tomato", label: "Tomato", image: "/categories/tomato-photo.jpg" },
    { key: "groundnut", label: "Groundnut", image: "/categories/groundnut-photo.jpg" }
  ];

  const HeroIcon = ({ children }: { children: ReactNode }) => (
    <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-border bg-card text-primary shadow-sm">
      {children}
    </span>
  );

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function Stat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
    const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
    const [display, setDisplay] = useState(0);

    useEffect(() => {
      if (!inView) return;
      if (prefersReducedMotion) {
        setDisplay(value);
        return;
      }

      const duration = 900;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(eased * value));
        if (t < 1) requestAnimationFrame(tick);
      };
      const id = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(id);
    }, [inView, prefersReducedMotion, value]);

    return (
      <div ref={ref} className="rounded-2xl border border-border bg-card/75 p-5 shadow-sm backdrop-blur-sm">
        <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {display.toLocaleString()}
          {suffix}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      </div>
    );
  }

  function Stars({ value }: { value: number }) {
    return (
      <div className="flex items-center gap-0.5 text-accent" aria-label={`${value} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <svg key={idx} viewBox="0 0 20 20" className={cn("size-4", idx < value ? "opacity-100" : "opacity-25")} aria-hidden="true">
            <path
              d="M10 1.8 12.6 7l5.7.8-4.1 4 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.1-4L7.4 7 10 1.8Z"
              fill="currentColor"
            />
          </svg>
        ))}
      </div>
    );
  }

  function PreviewCard({
    name,
    image,
    price,
    location,
    stock,
    seller,
    verified
  }: {
    name: string;
    image: string;
    price: string;
    location: string;
    stock: string;
    seller: string;
    verified: boolean;
  }) {
    return (
      <Card className="group overflow-hidden rounded-3xl">
        <div className="relative">
          <div className="h-44 w-full bg-gradient-to-br from-primary/15 via-background to-accent/15" />
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <Badge className="bg-background/70 backdrop-blur-sm" variant={verified ? "success" : "default"}>
              {verified ? "Verified seller" : "Seller"}
            </Badge>
          </div>
          <div className="absolute right-4 top-4">
            <button
              type="button"
              aria-label="Save to wishlist"
              className="grid size-10 place-items-center rounded-2xl border border-border bg-background/70 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-accent/40 hover:bg-accent/15 hover:text-primary"
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path
                  d="M12 20s-7-4.4-9.2-8.4C1 8.7 3.2 6 6.3 6c1.7 0 3.2.8 3.9 2c.7-1.2 2.2-2 3.9-2 3.1 0 5.3 2.7 3.5 5.6C19 15.6 12 20 12 20Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-foreground">{name}</div>
              <div className="mt-1 text-xs text-foreground/80">{location}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/75 px-3 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur-md">
              {price}
            </div>
          </div>
        </div>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{seller}</span> • {stock}
            </div>
            <Badge variant="default" className="bg-muted/70">
              In stock
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="h-10 flex-1" size="sm">
              Add to cart
            </Button>
            <Button className="h-10 flex-1" size="sm" variant="outline">
              Contact seller
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-20">
      <Reveal className="-mx-4 sm:-mx-6 lg:-mx-8">
        <PageHero
          imageUrl={LANDING_HERO_IMAGE}
          imageUrlSm={LANDING_HERO_IMAGE_SM}
          size="lg"
          className="shadow-lg"
          title="A premium marketplace for Cameroon agriculture"
          subtitle="Find verified sellers, track orders with clarity, and chat directly. Built to stay usable with weak network connections."
          right={
            <div className="grid gap-3">
              <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <HeroIcon>
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                      <path
                        d="M12 2a5 5 0 0 0-5 5v2H6a3 3 0 0 0-3 3v4a6 6 0 0 0 6 6h6a6 6 0 0 0 6-6v-4a3 3 0 0 0-3-3h-1V7a5 5 0 0 0-5-5Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 9V7a3 3 0 1 1 6 0v2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </HeroIcon>
                  <div>
                    <div className="text-sm font-semibold">Verified trading</div>
                    <div className="mt-1 text-sm text-muted-foreground">Seller badges and clear order milestones to build trust.</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <HeroIcon>
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                      <path d="M4 12a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M6 12a6 6 0 0 1 12 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M12 12l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 12a1 1 0 1 0 0 .01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </HeroIcon>
                  <div>
                    <div className="text-sm font-semibold">Realtime feel</div>
                    <div className="mt-1 text-sm text-muted-foreground">Fast search, instant chat, and clear updates across devices.</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <HeroIcon>
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                      <path d="M7 17h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path
                        d="M8.5 17c-2.5-2-4.5-4.5-4.5-7.5A8 8 0 0 1 20 9.5c0 3-2 5.5-4.5 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </HeroIcon>
                  <div>
                    <div className="text-sm font-semibold">Offline-ready</div>
                    <div className="mt-1 text-sm text-muted-foreground">Cache key screens and sync when connectivity returns.</div>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <Button asChild className="h-11 px-6">
            <Link to="/marketplace">Explore marketplace</Link>
          </Button>
          <Button asChild variant="secondary" className="h-11 px-6">
            <Link to="/info?tab=how">How it works</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-6">
            <Link to="/auth">{t("signIn")}</Link>
          </Button>
        </PageHero>
      </Reveal>

      <Reveal>
        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Impact at a glance</h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Live metrics will come from production data. These counters illustrate the final premium experience.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Verified sellers</Badge>
              <Badge className="bg-background/70 backdrop-blur-sm">Secure transactions</Badge>
              <Badge className="bg-background/70 backdrop-blur-sm">Offline-ready</Badge>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Active farmers" value={12400} suffix="+" />
            <Stat label="Buyers connected" value={5800} suffix="+" />
            <Stat label="Orders completed" value={26400} suffix="+" />
            <Stat label="Regions covered" value={10} />
          </div>
        </section>
      </Reveal>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <Reveal>
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Trust, clarity, and speed</h2>
              <p className="text-sm text-muted-foreground sm:text-base">Every interaction is designed to feel professional, secure, and simple.</p>
            </div>
            <div className="grid gap-3">
              {[
                { title: "Verified sellers", body: "Badges and identity checks help buyers trade with confidence." },
                { title: "Clear order timeline", body: "Milestones and status tracking reduce confusion and disputes." },
                { title: "Secure workflow", body: "Readable pricing, confirmations, and consistent feedback states." },
                { title: "Offline-first design", body: "Cached data and sync indicators when the network is unstable." }
              ].map((x, idx) => (
                <Reveal key={x.title} delayMs={idx * 70}>
                  <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur-sm">
                    <div className="text-sm font-semibold">{x.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{x.body}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal>
          <Card className="overflow-hidden rounded-3xl">
            <div className="relative">
              <img src="/heroes/advisory-hero.jpg" alt="" className="h-52 w-full object-cover" loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/75 via-background/25 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/55" />
              <div className="absolute left-6 top-6 right-6">
                <div className="max-w-md">
                  <div className="text-sm font-semibold text-foreground">Farm advisory assistant</div>
                  <div className="mt-1 text-sm text-foreground/80">Quick answers on crops, pests, and practical next steps.</div>
                </div>
              </div>
            </div>
            <CardContent className="flex flex-wrap items-center gap-3 p-6">
              <Button asChild className="h-11 px-6">
                <Link to="/advisory">Open advisory</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-6">
                <Link to="/prices">View market prices</Link>
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      </section>

      <Reveal>
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Designed like a modern SaaS product</h2>
            <p className="text-sm text-muted-foreground sm:text-base">Clean hierarchy, premium components, and interactions that guide conversion.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Advanced search", body: "Find produce by crop, price, region, and availability in seconds." },
              { title: "Smart filters", body: "Quick chips and clear filter badges keep navigation intuitive." },
              { title: "Fast product cards", body: "Price, stock, seller, and actions are visible at a glance." },
              { title: "Messaging built in", body: "Chat feels familiar, with delivery signals and sync indicators." },
              { title: "Conversion-first UI", body: "Primary actions are clear, with consistent feedback states." },
              { title: "Accessible by default", body: "Better contrast, focus rings, and touch targets across devices." }
            ].map((x, idx) => (
              <Reveal key={x.title} delayMs={idx * 60}>
                <Card className="rounded-3xl">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-base">{x.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{x.body}</CardDescription>
                  </CardHeader>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="relative overflow-hidden rounded-3xl border border-border">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-background to-accent/12" />
            <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_15%_20%,rgba(27,107,58,0.16),transparent_55%),radial-gradient(circle_at_85%_10%,rgba(200,134,10,0.14),transparent_45%),radial-gradient(circle_at_60%_90%,rgba(27,107,58,0.10),transparent_55%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/55" />
          </div>
          <div className="relative p-6 sm:p-10">
            <div className="max-w-2xl">
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">A beautiful, predictable flow for farmers, buyers, and traders.</p>
            </div>
            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {[
                { title: "List or discover produce", body: "Farmers post stock. Buyers browse with filters and live prices." },
                { title: "Chat and confirm", body: "Negotiate quickly, then confirm quantity, pickup, and delivery plan." },
                { title: "Track the timeline", body: "Follow milestones and finalize delivery with clear confirmation." }
              ].map((s, idx) => (
                <Reveal key={s.title} delayMs={idx * 80}>
                  <div className="rounded-3xl border border-border bg-background/75 p-5 shadow-sm backdrop-blur-md">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{s.title}</div>
                        <div className="mt-1 text-sm text-foreground/80">{s.body}</div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-11 px-6">
                <Link to="/auth">Get started</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-6">
                <Link to="/marketplace">Browse marketplace</Link>
              </Button>
            </div>
          </div>
        </section>
      </Reveal>

      <section className="space-y-6">
        <Reveal>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Success stories</h2>
              <p className="text-sm text-muted-foreground sm:text-base">Short testimonials with strong hierarchy and trust signals.</p>
            </div>
            <Button asChild variant="outline" className="h-10">
              <Link to="/info?tab=support">Talk to the team</Link>
            </Button>
          </div>
        </Reveal>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { name: "Marie • Farmer", quote: "I publish stock fast and buyers can see pricing clearly. The order timeline keeps everything organized.", stars: 5 },
            { name: "David • Buyer", quote: "Messaging feels familiar. I can verify sellers and confirm delivery without phone calls.", stars: 5 },
            { name: "Jean • Trader", quote: "Filters and live prices save time. I track multiple orders with confidence.", stars: 4 }
          ].map((x, idx) => (
            <Reveal key={x.name} delayMs={idx * 70}>
              <Card className="rounded-3xl">
                <CardHeader className="space-y-3">
                  <Stars value={x.stars} />
                  <div>
                    <CardTitle className="text-base">{x.name}</CardTitle>
                    <CardDescription className="mt-2 text-sm leading-relaxed">{x.quote}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <Reveal>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Marketplace preview</h2>
              <p className="text-sm text-muted-foreground sm:text-base">Premium product cards with fast actions and verification badges.</p>
            </div>
            <Button asChild className="h-10">
              <Link to="/marketplace">Open marketplace</Link>
            </Button>
          </div>
        </Reveal>
        <div className="grid gap-5 lg:grid-cols-3">
          <Reveal>
            <PreviewCard
              name="Premium cocoa beans"
              image={categories[3]?.image ?? "/categories/cocoa-photo.jpg"}
              price="XAF 1,200 / kg"
              location="Centre • Yaoundé"
              stock="120 kg available"
              seller="Mboa Cooperative"
              verified
            />
          </Reveal>
          <Reveal delayMs={80}>
            <PreviewCard
              name="Fresh plantain bunches"
              image={categories[2]?.image ?? "/categories/plantain-photo.jpg"}
              price="XAF 8,000 / bunch"
              location="Littoral • Douala"
              stock="42 bunches"
              seller="Nkongo Farms"
              verified
            />
          </Reveal>
          <Reveal delayMs={160}>
            <PreviewCard
              name="Cassava tubers"
              image={categories[1]?.image ?? "/categories/cassava-photo.jpg"}
              price="XAF 15,000 / bag"
              location="West • Bafoussam"
              stock="18 bags"
              seller="Afoh Traders"
              verified={false}
            />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
