import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchMarketPrices, createMarketPrice, deleteMarketPrice } from "../api/marketPrices";
import { predictPrices, type PricePredictionResponse } from "../api/ai";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { CAMEROON_REGIONS, COMMON_CROPS, PRICES_HERO_IMAGE, PRICES_HERO_IMAGE_SM } from "../lib/constants";
import { useAuthStore } from "../store/authStore";
import { PageHero } from "../components/PageHero";
import { Page } from "../components/Page";

function formatXaf(amount: number): string {
  return new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(amount);
}

function isoDateOnly(value: string): string {
  if (!value) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

export function MarketPricesPage() {
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === "admin";
  const queryClient = useQueryClient();

  const [cropType, setCropType] = useState<string>(COMMON_CROPS[0] ?? "");
  const [region, setRegion] = useState<string>(CAMEROON_REGIONS[0] ?? "");

  const [newPriceXaf, setNewPriceXaf] = useState<string>("");
  const [newCapturedAt, setNewCapturedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newSource, setNewSource] = useState<string>("");

  const pricesQuery = useQuery({
    queryKey: ["market_prices", { cropType, region }],
    queryFn: () => fetchMarketPrices({ crop_type: cropType, region, limit: 120 })
  });

  const history = useMemo(
    () => (pricesQuery.data ?? []).map((p) => ({ captured_at: p.captured_at, price_xaf: p.price_xaf })),
    [pricesQuery.data]
  );

  const forecastMutation = useMutation({
    mutationFn: async (): Promise<PricePredictionResponse> => {
      return predictPrices({ crop_type: cropType, region, history });
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const price = Number(newPriceXaf);
      if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a valid price in XAF.");
      if (!newCapturedAt.trim().length) throw new Error("Captured date is required.");
      await createMarketPrice({
        crop_type: cropType,
        region,
        price_xaf: price,
        captured_at: new Date(newCapturedAt).toISOString(),
        source: newSource.trim().length ? newSource.trim() : null
      });
    },
    onSuccess: async () => {
      setNewPriceXaf("");
      setNewSource("");
      await queryClient.invalidateQueries({ queryKey: ["market_prices"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteMarketPrice(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["market_prices"] });
    }
  });

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; historical?: number; forecast?: number }>();
    for (const p of pricesQuery.data ?? []) {
      const date = isoDateOnly(p.captured_at);
      map.set(date, { ...(map.get(date) ?? { date }), historical: p.price_xaf });
    }
    for (const f of forecastMutation.data?.forecast ?? []) {
      const date = isoDateOnly(f.week);
      map.set(date, { ...(map.get(date) ?? { date }), forecast: f.price_xaf });
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [forecastMutation.data?.forecast, pricesQuery.data]);

  return (
    <Page width="full">
      <PageHero
        imageUrl={PRICES_HERO_IMAGE}
        imageUrlSm={PRICES_HERO_IMAGE_SM}
        title="Market prices"
        subtitle="Review recent pricing history by crop and region. Generate a forecast to plan sales."
      />

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-12 md:items-end">
          <div className="space-y-1 md:col-span-5">
            <div className="text-sm font-medium">Crop</div>
            <Select value={cropType} onChange={(e) => setCropType(e.target.value)}>
              {COMMON_CROPS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1 md:col-span-5">
            <div className="text-sm font-medium">Region</div>
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              {CAMEROON_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button
              className="h-10 w-full"
              variant="secondary"
              onClick={() => {
                forecastMutation.reset();
              }}
            >
              Reset forecast
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Market price trend</CardTitle>
          <div className="text-sm text-muted-foreground">
            Showing up to {(pricesQuery.data ?? []).length} points. Admins can add official price points; everyone can view.
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pricesQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading prices…</div> : null}
          {pricesQuery.isError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {(pricesQuery.error as Error).message}
            </div>
          ) : null}

          {pricesQuery.data && pricesQuery.data.length ? (
            <div className="h-[280px] w-full rounded-xl border border-border bg-background p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={28} />
                  <YAxis tick={{ fontSize: 12 }} width={56} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip
                    formatter={(value) => formatXaf(Number(value))}
                    labelFormatter={(label) => `Week: ${label}`}
                    contentStyle={{ fontSize: "12px" }}
                  />
                  <Line type="monotone" dataKey="historical" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {pricesQuery.data && pricesQuery.data.length < 4 ? (
            <div className="text-sm text-muted-foreground">Add at least 4 historical points for a useful forecast.</div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => forecastMutation.mutate()}
              disabled={forecastMutation.isPending || pricesQuery.isLoading || (pricesQuery.data?.length ?? 0) < 4}
            >
              {forecastMutation.isPending ? "Generating forecast…" : "Generate forecast"}
            </Button>
            {forecastMutation.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {(forecastMutation.error as Error).message}
              </div>
            ) : null}
          </div>

          {forecastMutation.data?.insights?.length ? (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="text-sm font-medium">Insights</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {forecastMutation.data.insights.map((ins, idx) => (
                  <li key={idx}>{ins}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Add official price point</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1.5">
                <div className="text-xs">Captured date</div>
                <Input type="date" value={newCapturedAt} onChange={(e) => setNewCapturedAt(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <div className="text-xs">Price (XAF)</div>
                <Input inputMode="numeric" value={newPriceXaf} onChange={(e) => setNewPriceXaf(e.target.value)} placeholder="e.g. 25000" />
              </div>
              <div className="grid gap-1.5">
                <div className="text-xs">Source (optional)</div>
                <Input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="e.g. MINADER bulletin" />
              </div>
            </div>

            {createMutation.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(createMutation.error as Error).message}
              </div>
            ) : null}

            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Add price point"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Latest records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Crop</th>
                <th className="py-2 pr-3 font-medium">Region</th>
                <th className="py-2 pr-3 font-medium">Price</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                {isAdmin ? <th className="py-2 pr-3 font-medium">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {(pricesQuery.data ?? [])
                .slice()
                .reverse()
                .slice(0, 25)
                .map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 pr-3">{isoDateOnly(p.captured_at)}</td>
                    <td className="py-2 pr-3">{p.crop_type}</td>
                    <td className="py-2 pr-3">{p.region}</td>
                    <td className="py-2 pr-3 font-medium">{formatXaf(p.price_xaf)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{p.source ?? "—"}</td>
                    {isAdmin ? (
                      <td className="py-2 pr-3">
                        <Button
                          variant="secondary"
                          onClick={() => deleteMutation.mutate(p.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
            </tbody>
          </table>
          {deleteMutation.isError ? (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {(deleteMutation.error as Error).message}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Page>
  );
}
