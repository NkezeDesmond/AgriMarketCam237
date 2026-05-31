import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHero } from "../components/PageHero";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { SYNC_HERO_IMAGE, SYNC_HERO_IMAGE_SM } from "../lib/constants";
import type { OfflineAction } from "../lib/offline/db";
import { listQueuedActions, removeQueuedAction } from "../lib/offline/db";
import { syncQueuedActions } from "../lib/offline/sync";
import { Page } from "../components/Page";

function formatWhen(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export function OfflineSyncPage() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  const [actions, setActions] = useState<OfflineAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  async function refresh(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const items = await listQueuedActions();
      setActions(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sync queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const failedCount = useMemo(() => actions.filter((a) => (a.attempts ?? 0) > 0).length, [actions]);

  return (
    <Page width="wide">
      <PageHero imageUrl={SYNC_HERO_IMAGE} imageUrlSm={SYNC_HERO_IMAGE_SM} title={t("offlineSyncTitle")} subtitle={t("offlineSyncSubtitle")} />
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>{t("offlineSyncTitle")}</CardTitle>
          <div className="text-sm text-muted-foreground">{t("offlineSyncSubtitle")}</div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!online ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {t("offlineSyncNeedsOnline")}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                void refresh();
              }}
              variant="secondary"
              disabled={busy}
            >
              {t("refresh")}
            </Button>
            <Button
              onClick={async () => {
                if (!online) return;
                setBusy(true);
                setError(null);
                try {
                  await syncQueuedActions();
                  await refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Sync failed");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy || !online || actions.length === 0}
            >
              {busy ? t("syncing") : t("syncNow")}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setBusy(true);
                try {
                  for (const a of actions) await removeQueuedAction(a.id);
                  await refresh();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy || actions.length === 0}
            >
              {t("clearAll")}
            </Button>

            <div className="ml-auto text-sm text-muted-foreground">
              {t("queuedCount", { count: actions.length })} • {t("failedCount", { count: failedCount })}
            </div>
          </div>

          {loading ? <div className="text-sm text-muted-foreground">{t("loading")}</div> : null}

          {!loading && actions.length === 0 ? <div className="text-sm text-muted-foreground">{t("queueEmpty")}</div> : null}

          {!loading && actions.length ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 font-medium">{t("type")}</th>
                    <th className="px-3 py-2 font-medium">{t("created")}</th>
                    <th className="px-3 py-2 font-medium">{t("attempts")}</th>
                    <th className="px-3 py-2 font-medium">{t("lastTried")}</th>
                    <th className="px-3 py-2 font-medium">{t("lastError")}</th>
                    <th className="px-3 py-2 font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a) => (
                    <tr key={a.id} className="border-b border-border">
                      <td className="px-3 py-2 font-mono text-xs">{a.type}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatWhen(a.createdAt)}</td>
                      <td className="px-3 py-2">{a.attempts ?? 0}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.lastTriedAt ? formatWhen(a.lastTriedAt) : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.lastError ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              if (!online) return;
                              setBusy(true);
                              try {
                                await syncQueuedActions();
                                await refresh();
                              } finally {
                                setBusy(false);
                              }
                            }}
                            disabled={busy || !online}
                          >
                            {t("retry")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await removeQueuedAction(a.id);
                                await refresh();
                              } finally {
                                setBusy(false);
                              }
                            }}
                            disabled={busy}
                          >
                            {t("remove")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Page>
  );
}
