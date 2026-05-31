import { useEffect, useMemo, useRef, useState } from "react";
import type { SVGProps } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { i18n } from "../lib/i18n";
import { cn } from "../lib/cn";
import { LogoMark, LogoWordmark } from "./Logo";
import { countUnreadMessages } from "../api/chat";
import { fetchMyOrders } from "../api/orders";
import { supabase } from "../api/supabase";
import {
  PREFETCH_HERO_IMAGES_SIGNED_IN,
  PREFETCH_HERO_IMAGES_SIGNED_IN_SM,
  PREFETCH_HERO_IMAGES_SIGNED_OUT,
  PREFETCH_HERO_IMAGES_SIGNED_OUT_SM
} from "../lib/constants";

const navShell = "rounded-full border border-border bg-muted/40 p-1 shadow-sm";
const navBase =
  "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const navInactive = "text-muted-foreground hover:bg-accent/20 hover:text-primary hover:shadow-sm";
const navActive = "bg-foreground text-background shadow-sm hover:bg-foreground/85 hover:shadow-md";

const mobileNavBase =
  "shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const mobileNavInactive = "text-muted-foreground hover:bg-accent/15 hover:text-primary";
const mobileNavActive = "bg-muted text-foreground";

const shellWidth = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
const footerLinkClass = "text-sm text-muted-foreground transition-colors hover:text-primary hover:underline decoration-accent/80 underline-offset-4";
const onlinePillBase = "hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium";

function IconFacebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 320 512" fill="currentColor" {...props}>
      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.2V288z" />
    </svg>
  );
}

function IconInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 448 512" fill="currentColor" {...props}>
      <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.2 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.5 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.9-26.9 26.9-14.9 0-26.9-12-26.9-26.9s12-26.9 26.9-26.9c14.9 0 26.9 12 26.9 26.9zM398.8 80c-7.8-20.2-23.3-35.7-43.5-43.5C326.1 24 224.1 24 224.1 24S122.1 24 92.9 36.5c-20.2 7.8-35.7 23.3-43.5 43.5C36.9 109.2 36.9 256 36.9 256s0 146.8 12.5 176c7.8 20.2 23.3 35.7 43.5 43.5C122.1 488 224.1 488 224.1 488s102 0 131.2-12.5c20.2-7.8 35.7-23.3 43.5-43.5 12.5-29.2 12.5-176 12.5-176s0-146.8-12.5-176zM224.1 438c-99.8 0-180.1-80.3-180.1-180.1S124.3 77.8 224.1 77.8 404.2 158.1 404.2 257.9 323.9 438 224.1 438z" />
    </svg>
  );
}

function IconMail(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4h16v16H4z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}

function LanguageSwitcher() {
  const { t } = useTranslation();
  const current = i18n.language;
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="hidden sm:inline">{t("language")}</span>
      <select
        value={current}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        aria-label={t("language")}
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="pcm">Pidgin</option>
      </select>
    </label>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  const location = useLocation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success">("idle");
  const [messageAlert, setMessageAlert] = useState<{ fromId: string; fromName: string; body: string } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const run = () => {
      const connection = typeof navigator !== "undefined" ? ((navigator as any).connection as any) : null;
      const saveData = Boolean(connection?.saveData);
      const effectiveType = typeof connection?.effectiveType === "string" ? (connection.effectiveType as string) : "";

      if (saveData) return;
      if (effectiveType === "slow-2g" || effectiveType === "2g") return;

      const isSm =
        typeof window !== "undefined" && typeof window.matchMedia === "function"
          ? window.matchMedia("(max-width: 640px)").matches
          : false;
      const list = profile
        ? isSm
          ? PREFETCH_HERO_IMAGES_SIGNED_IN_SM
          : PREFETCH_HERO_IMAGES_SIGNED_IN
        : isSm
          ? PREFETCH_HERO_IMAGES_SIGNED_OUT_SM
          : PREFETCH_HERO_IMAGES_SIGNED_OUT;
      const max = effectiveType === "3g" ? 3 : 5;

      for (const url of list.slice(0, max)) {
        const img = new Image();
        img.decoding = "async";
        img.loading = "lazy";
        (img as any).fetchPriority = "low";
        img.src = url;
      }
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(run, { timeout: 1500 });
      return;
    }
    const id = window.setTimeout(run, 800);
    return () => window.clearTimeout(id);
  }, [profile]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const msg = payload.new as { sender_id: string; body: string };
          const senderId = String(msg.sender_id);
          const body = String(msg.body ?? "");
          void (async () => {
            const { data } = await supabase.from("profiles").select("display_name").eq("id", senderId).maybeSingle();
            const name = (data?.display_name ?? "").trim() || `User ${senderId.slice(0, 6)}`;
            setMessageAlert({ fromId: senderId, fromName: name, body });
            window.setTimeout(() => setMessageAlert(null), 7000);
          })();
          void qc.invalidateQueries({ queryKey: ["unread-messages-count", user.id] });
          void qc.invalidateQueries({ queryKey: ["conversations", user.id] });
          void qc.invalidateQueries({ queryKey: ["recent-messages"] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, user?.id]);

  const unreadQuery = useQuery({
    queryKey: ["unread-messages-count", user?.id ?? "none"],
    queryFn: () => countUnreadMessages(user!.id),
    enabled: Boolean(user?.id)
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", user?.id ?? "none"],
    queryFn: () => fetchMyOrders(user!.id),
    enabled: Boolean(user?.id)
  });

  const actionOrdersCount = useMemo(() => {
    if (!user) return 0;
    const list = ordersQuery.data ?? [];
    const role = profile?.role ?? null;
    return list.filter((o) => {
      if (role === "farmer" && o.farmer_id === user.id) return o.status === "pending" || o.status === "confirmed";
      if (o.buyer_id === user.id) return o.status === "pending" || o.status === "in_transit" || o.status === "delivered";
      return false;
    }).length;
  }, [ordersQuery.data, profile?.role, user]);

  const unreadCount = unreadQuery.data ?? 0;
  const alertsCount = unreadCount + actionOrdersCount;
  const cartCount = useCartStore((s) => s.items.length);
  const useSidebarLayout = Boolean(profile?.onboarded);

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/40">
      {messageAlert ? (
        <div className="fixed left-0 right-0 top-16 z-50 px-4 sm:top-20">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">New message</div>
              <div className="truncate text-sm text-muted-foreground">
                {messageAlert.fromName}: {messageAlert.body}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild size="sm">
                <Link to={`/chat?to=${encodeURIComponent(messageAlert.fromId)}`}>Open</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMessageAlert(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {useSidebarLayout ? (
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/70 backdrop-blur">
          <div className={`${shellWidth} flex h-16 items-center justify-between gap-3`}>
            <Link to="/dashboard" className="flex items-center gap-3">
              <LogoWordmark className="leading-tight" />
            </Link>

            <nav className={cn("hidden items-center gap-1 md:flex", navShell)}>
              <NavLink to="/dashboard" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
                {t("dashboard")}
              </NavLink>
              <NavLink to="/marketplace" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
                {t("marketplace")}
              </NavLink>
              {!profile || profile.role === "buyer" ? (
                <NavLink to="/cart" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
                  <span className="inline-flex items-center gap-2">
                    <span>{t("cart")}</span>
                    {cartCount ? (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        {cartCount}
                      </span>
                    ) : null}
                  </span>
                </NavLink>
              ) : null}
              <NavLink to="/orders" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
                {t("orders")}
              </NavLink>
              <NavLink to="/chat" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
                {t("chat")}
              </NavLink>
              <NavLink to="/prices" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
                {t("prices")}
              </NavLink>
              <NavLink to="/advisory" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
                {t("advisory")}
              </NavLink>
            </nav>

            <div className="flex items-center gap-2">
              <div className={cn(onlinePillBase, online ? "text-foreground" : "text-muted-foreground")}>
                <span className={cn("size-2 rounded-full", online ? "bg-emerald-500" : "bg-amber-500")} />
                <span>{online ? t("online") : t("offline")}</span>
              </div>
              {profile?.role === "farmer" ? (
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link to="/listings/new">{t("createListing")}</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link to="/notifications" className="inline-flex items-center gap-2">
                  <span>{t("notifications")}</span>
                  {alertsCount ? (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                      {alertsCount}
                    </span>
                  ) : null}
                </Link>
              </Button>

              <div className="relative" ref={menuRef}>
                <Button variant="outline" size="sm" className="rounded-full bg-background/60" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
                  <span className="inline-flex items-center gap-1">
                    <span>Menu</span>
                    <svg viewBox="0 0 20 20" className={cn("size-4 transition-transform", menuOpen ? "rotate-180" : "rotate-0")} aria-hidden="true">
                      <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Button>
                {menuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] w-72 rounded-2xl border border-border bg-card p-2 shadow-lg">
                    <div className="px-2 pb-2 pt-1">
                      <LanguageSwitcher />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="py-1">
                      <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                        <Link to="/dashboard">{t("dashboard")}</Link>
                      </Button>
                      {!profile || profile.role === "buyer" ? (
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/cart">{t("cart")}</Link>
                        </Button>
                      ) : null}
                      <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                        <Link to="/advisory">{t("advisory")}</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                        <Link to="/prices">{t("prices")}</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                        <Link to="/sync">{t("sync")}</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                        <Link to="/account">{t("account")}</Link>
                      </Button>
                      {profile?.role === "admin" ? (
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/admin">{t("admin")}</Link>
                        </Button>
                      ) : (
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/admin-setup">{t("adminSetup")}</Link>
                        </Button>
                      )}
                      <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                        <Link to="/info">{t("info")}</Link>
                      </Button>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setMenuOpen(false);
                          void signOut();
                        }}
                      >
                        {t("logout")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>
      ) : (
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur">
        <div className={`${shellWidth} flex h-16 items-center justify-between gap-3`}>
          <Link to="/" className="flex items-center gap-3">
            <LogoWordmark className="leading-tight" />
          </Link>

          <nav className={cn("hidden items-center gap-1 md:flex", navShell)}>
            <NavLink
              to="/marketplace"
              className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}
            >
              {t("marketplace")}
            </NavLink>
            <NavLink to="/cart" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
              <span className="inline-flex items-center gap-2">
                <span>{t("cart")}</span>
                {cartCount ? (
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    {cartCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
              {t("orders")}
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
              {t("chat")}
            </NavLink>
            <NavLink to="/prices" className={({ isActive }) => cn(navBase, isActive ? navActive : navInactive)}>
              {t("prices")}
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            {profile ? (
              <div className="flex items-center gap-2">
                <div className={cn(onlinePillBase, online ? "text-foreground" : "text-muted-foreground")}>
                  <span className={cn("size-2 rounded-full", online ? "bg-emerald-500" : "bg-amber-500")} />
                  <span>{online ? t("online") : t("offline")}</span>
                </div>
                {profile.role === "farmer" ? (
                  <Button asChild size="sm" className="hidden sm:inline-flex">
                    <Link to="/listings/new">{t("createListing")}</Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link to="/notifications" className="inline-flex items-center gap-2">
                    <span>{t("notifications")}</span>
                    {alertsCount ? (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        {alertsCount}
                      </span>
                    ) : null}
                  </Link>
                </Button>

                <div className="relative" ref={menuRef}>
                  <Button variant="outline" size="sm" className="rounded-full bg-background/60" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
                    <span className="inline-flex items-center gap-1">
                      <span>Menu</span>
                      <svg
                        viewBox="0 0 20 20"
                        className={cn("size-4 transition-transform", menuOpen ? "rotate-180" : "rotate-0")}
                        aria-hidden="true"
                      >
                        <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </Button>
                  {menuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] w-72 rounded-2xl border border-border bg-card p-2 shadow-lg">
                      <div className="px-2 pb-2 pt-1">
                        <LanguageSwitcher />
                      </div>
                      <div className="h-px bg-border" />
                      <div className="py-1">
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/cart">{t("cart")}</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/advisory">{t("advisory")}</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/sync">{t("sync")}</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/account">{t("account")}</Link>
                        </Button>
                        {profile.role === "admin" ? (
                          <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                            <Link to="/admin">{t("admin")}</Link>
                          </Button>
                        ) : (
                          <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                            <Link to="/admin-setup">{t("adminSetup")}</Link>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/info">{t("info")}</Link>
                        </Button>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            setMenuOpen(false);
                            void signOut();
                          }}
                        >
                          {t("logout")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link to="/auth">{t("signIn")}</Link>
                </Button>
                <div className="relative" ref={menuRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-background/60"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-expanded={menuOpen}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>Menu</span>
                      <svg
                        viewBox="0 0 20 20"
                        className={cn("size-4 transition-transform", menuOpen ? "rotate-180" : "rotate-0")}
                        aria-hidden="true"
                      >
                        <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </Button>
                  {menuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] w-72 rounded-2xl border border-border bg-card p-2 shadow-lg">
                      <div className="px-2 pb-2 pt-1">
                        <LanguageSwitcher />
                      </div>
                      <div className="h-px bg-border" />
                      <div className="py-1">
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/dashboard">{t("dashboard")}</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/advisory">{t("advisory")}</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/prices">{t("prices")}</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={() => setMenuOpen(false)}>
                          <Link to="/info">{t("info")}</Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      )}

      {useSidebarLayout ? (
        <main className={`${shellWidth} pb-40 pt-8 md:py-8 md:pb-0`}>
          <Outlet />
        </main>
      ) : (
        <main className={`${shellWidth} pb-40 pt-8 md:py-10 md:pb-10`}>
          <Outlet />
        </main>
      )}

      <footer className="border-t border-border bg-background/70 pb-36 md:pb-0">
        <div className={`${shellWidth} py-12`}>
          <div className="rounded-3xl border border-border bg-card/75 p-7 shadow-md backdrop-blur-sm sm:p-10">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-4">
                <div className="flex items-start gap-3">
                  <LogoMark sizeClassName="size-11 rounded-2xl" />
                  <div className="space-y-2">
                    <LogoWordmark compact showMark={false} />
                    <div className="text-sm text-muted-foreground">
                      Premium marketplace for Cameroon agriculture with clear pricing, verified workflows, and offline-ready performance.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" className="h-10">
                    <Link to="/marketplace">{t("marketplace")}</Link>
                  </Button>
                  {!profile || profile.role === "farmer" ? (
                    <Button asChild variant="outline" size="sm" className="h-10">
                      <Link to={profile ? "/listings/new" : "/auth?redirect=%2Flistings%2Fnew"}>{t("createListing")}</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="secondary" size="sm" className="h-10">
                    <Link to="/info?tab=support">Contact</Link>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
                <div className="space-y-3">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground">About</div>
                  <div className="grid gap-2">
                    <Link className={footerLinkClass} to="/info?tab=about">
                      About us
                    </Link>
                    <Link className={footerLinkClass} to="/info?tab=how">
                      How it works
                    </Link>
                    <Link className={footerLinkClass} to="/info?tab=support">
                      Support
                    </Link>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground">Marketplace</div>
                  <div className="grid gap-2">
                    <Link className={footerLinkClass} to="/marketplace">
                      Browse listings
                    </Link>
                    <Link className={footerLinkClass} to="/prices">
                      Live prices
                    </Link>
                    <Link className={footerLinkClass} to="/advisory">
                      Advisory
                    </Link>
                    <Link className={footerLinkClass} to="/orders">
                      Order tracking
                    </Link>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground">Legal</div>
                  <div className="grid gap-2">
                    <Link className={footerLinkClass} to="/info?tab=privacy">
                      Privacy policy
                    </Link>
                    <Link className={footerLinkClass} to="/info?tab=terms">
                      Terms
                    </Link>
                    <Link className={footerLinkClass} to="/info?tab=pricing">
                      Pricing
                    </Link>
                  </div>
                </div>
              </div>

              <div className="space-y-5 lg:col-span-3">
                <div className="space-y-3">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground">Newsletter</div>
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newsletterEmail.trim()) return;
                      setNewsletterStatus("success");
                      setNewsletterEmail("");
                      window.setTimeout(() => setNewsletterStatus("idle"), 2500);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Email address"
                        type="email"
                        autoComplete="email"
                        className="h-10 bg-background/70"
                      />
                      <Button size="sm" className="h-10 shrink-0" type="submit">
                        Subscribe
                      </Button>
                    </div>
                    {newsletterStatus === "success" ? (
                      <div className="text-xs text-primary">Subscription saved. Add your email provider when ready.</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Low-frequency product updates. No spam.</div>
                    )}
                  </form>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground">Social</div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:bg-accent/15 hover:text-primary"
                      href="https://facebook.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted/60 text-foreground transition-colors group-hover:bg-accent/25 group-hover:text-primary">
                        <IconFacebook className="size-4" aria-hidden="true" focusable="false" />
                      </span>
                      <span className="sr-only">Facebook</span>
                    </a>
                    <a
                      className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:bg-accent/15 hover:text-primary"
                      href="https://instagram.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted/60 text-foreground transition-colors group-hover:bg-accent/25 group-hover:text-primary">
                        <IconInstagram className="size-4" aria-hidden="true" focusable="false" />
                      </span>
                      <span className="sr-only">Instagram</span>
                    </a>
                    <a
                      className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:bg-accent/15 hover:text-primary"
                      href="mailto:agrimarketcameroon@gmail.com"
                    >
                      <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted/60 text-foreground transition-colors group-hover:bg-accent/25 group-hover:text-primary">
                        <IconMail className="size-4" aria-hidden="true" focusable="false" />
                      </span>
                      <span className="sr-only">Email</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-border/60 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div>© {new Date().getFullYear()} AgriMarket Cameroon</div>
              <div className="flex items-center gap-3">
                <Link className="underline-offset-4 hover:text-primary hover:underline decoration-accent/80" to="/info?tab=privacy">
                  Privacy
                </Link>
                <Link className="underline-offset-4 hover:text-primary hover:underline decoration-accent/80" to="/info?tab=terms">
                  Terms
                </Link>
                <Link className="underline-offset-4 hover:text-primary hover:underline decoration-accent/80" to="/info?tab=support">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur md:hidden">
        <div className={shellWidth}>
          <div className="flex items-center gap-2 py-2">
            {profile?.onboarded ? (
              <NavLink to="/dashboard" className={({ isActive }) => cn(mobileNavBase, isActive ? mobileNavActive : mobileNavInactive)}>
                {t("dashboard")}
              </NavLink>
            ) : null}
            <NavLink to="/marketplace" className={({ isActive }) => cn(mobileNavBase, isActive ? mobileNavActive : mobileNavInactive)}>
              {t("marketplace")}
            </NavLink>
            {!profile || profile.role === "buyer" ? (
              <NavLink to="/cart" className={({ isActive }) => cn(mobileNavBase, isActive ? mobileNavActive : mobileNavInactive)}>
                <span className="inline-flex items-center gap-1">
                  <span>{t("cart")}</span>
                  {cartCount ? (
                    <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                      {cartCount}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            ) : null}
            <NavLink to="/orders" className={({ isActive }) => cn(mobileNavBase, isActive ? mobileNavActive : mobileNavInactive)}>
              {t("orders")}
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => cn(mobileNavBase, isActive ? mobileNavActive : mobileNavInactive)}>
              <span className="inline-flex items-center gap-1">
                <span>{t("chat")}</span>
                {unreadCount ? (
                  <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                    {unreadCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
          </div>
        </div>
      </nav>
    </div>
  );
}
