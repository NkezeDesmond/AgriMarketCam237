import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PageHero } from "../components/PageHero";
import { INFO_HERO_IMAGE, INFO_HERO_IMAGE_SM } from "../lib/constants";
import { Page } from "../components/Page";

type InfoTab = "about" | "how" | "support" | "privacy" | "terms" | "pricing";

export function InfoPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as InfoTab | null) ?? "about";

  const active: InfoTab =
    tab === "how" || tab === "support" || tab === "privacy" || tab === "terms" || tab === "pricing" ? tab : "about";

  const setTab = (next: InfoTab) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  const title = useMemo(() => {
    if (active === "how") return "How it works";
    if (active === "support") return "Help & support";
    if (active === "privacy") return "Privacy";
    if (active === "terms") return "Terms";
    if (active === "pricing") return "Pricing";
    return "About";
  }, [active]);

  const subtitle = useMemo(() => {
    if (active === "how") return "A clear step-by-step flow for farmers, buyers, and traders.";
    if (active === "support") return "Common questions and ways to contact the team.";
    if (active === "privacy") return "How we handle account and marketplace data.";
    if (active === "terms") return "Basic terms for using the marketplace.";
    if (active === "pricing") return "Simple pricing to help you validate and scale.";
    return "What AgriMarket Cameroon is and how it works.";
  }, [active]);

  return (
    <Page>
      <PageHero imageUrl={INFO_HERO_IMAGE} imageUrlSm={INFO_HERO_IMAGE_SM} title={title} subtitle={subtitle} />

      <div className="flex flex-wrap gap-2">
        <Button variant={active === "about" ? "default" : "outline"} size="sm" onClick={() => setTab("about")}>
          About
        </Button>
        <Button variant={active === "how" ? "default" : "outline"} size="sm" onClick={() => setTab("how")}>
          How it works
        </Button>
        <Button variant={active === "support" ? "default" : "outline"} size="sm" onClick={() => setTab("support")}>
          Support
        </Button>
        <Button variant={active === "pricing" ? "default" : "outline"} size="sm" onClick={() => setTab("pricing")}>
          Pricing
        </Button>
        <Button variant={active === "privacy" ? "default" : "outline"} size="sm" onClick={() => setTab("privacy")}>
          Privacy
        </Button>
        <Button variant={active === "terms" ? "default" : "outline"} size="sm" onClick={() => setTab("terms")}>
          Terms
        </Button>
      </div>

      {active === "about" ? (
        <Card>
          <CardHeader>
            <CardTitle>AgriMarket Cameroon</CardTitle>
            <CardDescription>A marketplace built for Cameroon’s connectivity realities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Browse listings by crop, region, and price.</div>
            <div>Create listings with images and optional pickup location.</div>
            <div>Place orders and track updates in real time.</div>
            <div>Chat with buyers and sellers inside the app.</div>
          </CardContent>
        </Card>
      ) : null}

      {active === "how" ? (
        <Card>
          <CardHeader>
            <CardTitle>Step-by-step</CardTitle>
            <CardDescription>Simple flow designed to reduce confusion and keep trades organized.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {[
              {
                title: "1) List or discover produce",
                body: "Farmers publish stock with photos. Buyers browse by crop, region, and price."
              },
              {
                title: "2) Chat and confirm details",
                body: "Agree on quantity, price, pickup or delivery plan, and timing directly in chat."
              },
              {
                title: "3) Track progress and complete the order",
                body: "Follow a clear timeline and confirm delivery to close the transaction."
              }
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="font-medium text-foreground">{step.title}</div>
                <div className="mt-1">{step.body}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {active === "support" ? (
        <Card>
          <CardHeader>
            <CardTitle>Common issues</CardTitle>
            <CardDescription>Quick answers to the most frequent questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <div className="font-medium text-foreground">I can’t receive an OTP</div>
              <div className="mt-1">Check network, confirm the phone number is correct, then try again. On trial SMS setups, only verified numbers can receive OTP.</div>
            </div>
            <div>
              <div className="font-medium text-foreground">I created a listing but can’t see images</div>
              <div className="mt-1">Confirm the listing-images bucket exists in Supabase Storage and the policies are applied.</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Orders or chat don’t update</div>
              <div className="mt-1">Confirm Realtime is enabled for orders/messages and you are online.</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {active === "support" ? (
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Reach the team for help and account support.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              Email:{" "}
              <a className="underline-offset-4 hover:text-primary hover:underline decoration-accent/80" href="mailto:agrimarketcameroon@gmail.com">
                agrimarketcameroon@gmail.com
              </a>
            </div>
            <div>
              Phone / WhatsApp:{" "}
              <a className="underline-offset-4 hover:text-primary hover:underline decoration-accent/80" href="tel:+237674099036">
                +237 674 099 036
              </a>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {active === "privacy" ? (
        <Card>
          <CardHeader>
            <CardTitle>Privacy summary</CardTitle>
            <CardDescription>This is a short summary for MVP and should be expanded before production.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>We store account details, profile, listings, orders, and messages to run the service.</div>
            <div>We do not sell personal data.</div>
            <div>Admins may review content to enforce platform rules.</div>
            <div>You can request account deletion by contacting support.</div>
          </CardContent>
        </Card>
      ) : null}

      {active === "terms" ? (
        <Card>
          <CardHeader>
            <CardTitle>Terms summary</CardTitle>
            <CardDescription>This is a short summary for MVP and should be expanded before production.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>You are responsible for the accuracy of listings, pricing, and availability.</div>
            <div>Buyers and sellers should confirm delivery and payment details directly.</div>
            <div>Do not post illegal products or content.</div>
            <div>We may suspend accounts that abuse the platform.</div>
          </CardContent>
        </Card>
      ) : null}

      {active === "pricing" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { name: "Starter", price: "Free", body: "Browse listings, chat, and place orders. Designed for early adoption." },
            { name: "Seller Plus", price: "XAF 2,500 / month", body: "Verified seller badge, priority support, and richer listing analytics." },
            { name: "Business", price: "Custom", body: "Multi-user teams, invoicing, and integrations for cooperatives and traders." }
          ].map((tier) => (
            <Card key={tier.name}>
              <CardHeader className="space-y-1">
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription className="text-base font-semibold text-foreground">{tier.price}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{tier.body}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </Page>
  );
}

