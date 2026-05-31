import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { advisoryChat } from "../api/ai";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHero } from "../components/PageHero";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { ADVISORY_HERO_IMAGE, ADVISORY_HERO_IMAGE_SM } from "../lib/constants";
import { i18n } from "../lib/i18n";
import { Page } from "../components/Page";

type Msg = { role: "user" | "assistant"; text: string; at: string };

function nowIso(): string {
  return new Date().toISOString();
}

function mapLang(lang: string): "en" | "fr" | "pcm" {
  if (lang === "fr") return "fr";
  if (lang === "pcm") return "pcm";
  return "en";
}

export function AdvisoryChatPage() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  const [question, setQuestion] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const context = useMemo(() => {
    const tail = messages.slice(-8);
    return tail.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n");
  }, [messages]);

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const lang = mapLang(i18n.language);
      return context ? advisoryChat({ lang, question: q, context }) : advisoryChat({ lang, question: q });
    },
    onSuccess: (answer, q) => {
      setMessages((prev) => [...prev, { role: "user", text: q, at: nowIso() }, { role: "assistant", text: answer, at: nowIso() }]);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  });

  return (
    <Page>
      <PageHero imageUrl={ADVISORY_HERO_IMAGE} imageUrlSm={ADVISORY_HERO_IMAGE_SM} title={t("advisoryTitle")} subtitle={t("advisorySubtitle")} />
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>{t("advisoryTitle")}</CardTitle>
          <div className="text-sm text-muted-foreground">{t("advisorySubtitle")}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!online ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {t("offlineAdvisory")}
            </div>
          ) : null}

          <div ref={listRef} className="h-[420px] overflow-auto rounded-xl border border-border bg-background p-3">
            {messages.length === 0 ? <div className="text-sm text-muted-foreground">{t("askAdvisory")}</div> : null}
            <div className="space-y-3">
              {messages.map((m, idx) => (
                <div key={`${m.at}-${idx}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className={`mt-1 text-[10px] opacity-70 ${m.role === "user" ? "text-primary-foreground" : ""}`}>
                      {new Date(m.at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {askMutation.isError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {(askMutation.error as Error).message}
            </div>
          ) : null}

          <div className="grid gap-2">
            <div className="text-sm font-medium">{t("typeQuestion")}</div>
            <textarea
              className="min-h-[96px] w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("questionPlaceholder")}
              disabled={askMutation.isPending}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  const q = question.trim();
                  if (!q.length) return;
                  if (!online) return;
                  setQuestion("");
                  askMutation.mutate(q);
                }}
                disabled={askMutation.isPending || !question.trim().length || !online}
              >
                {askMutation.isPending ? t("thinking") : t("send")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setMessages([]);
                  askMutation.reset();
                }}
                disabled={askMutation.isPending}
              >
                {t("clearChat")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}
