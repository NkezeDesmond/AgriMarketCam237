import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useAuthStore } from "../store/authStore";
import { envValid } from "../lib/env";
import { debugEvent } from "../lib/debug";
import { PageHero } from "../components/PageHero";
import { AUTH_HERO_IMAGE, AUTH_HERO_IMAGE_SM } from "../lib/constants";
import { Page } from "../components/Page";
import { LogoLockup } from "../components/Logo";
import { cn } from "../lib/cn";

const phoneSchema = z.object({
  nationalNumber: z
    .string()
    .min(8)
    .max(12)
    .regex(/^\d+$/, "Digits only")
});

const otpSchema = z.object({
  token: z.string().min(4).max(8).regex(/^\d+$/, "Digits only")
});

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email")
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;

export function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestEmailOtp = useAuthStore((s) => s.requestEmailOtp);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);

  const [method, setMethod] = useState<"email" | "phone">("phone");
  const [phoneStep, setPhoneStep] = useState<"request" | "verify">("request");
  const [phoneE164, setPhoneE164] = useState<string>("");
  const [emailSentTo, setEmailSentTo] = useState<string>("");

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { nationalNumber: "" }
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: "" }
  });

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" }
  });

  const computedPhone = useMemo(() => {
    const digits = phoneForm.watch("nationalNumber").trim();
    return digits.length ? `+237${digits}` : "";
  }, [phoneForm]);

  const redirectTo = useMemo(() => {
    const raw = params.get("redirect");
    if (!raw) return null;
    const decoded = raw.startsWith("%2F") ? decodeURIComponent(raw) : raw;
    if (!decoded.startsWith("/")) return null;
    if (decoded.startsWith("/auth")) return null;
    return decoded;
  }, [params]);

  useEffect(() => {
    if (!initialized) return;
    if (!user) return;
    if (!profile) return;
    if (!profile.onboarded) {
      navigate(`/onboarding${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`, { replace: true });
      return;
    }
    navigate(redirectTo ?? "/dashboard", { replace: true });
  }, [initialized, navigate, profile, redirectTo, user]);

  return (
    <Page width="wide">
      <PageHero
        imageUrl={AUTH_HERO_IMAGE}
        imageUrlSm={AUTH_HERO_IMAGE_SM}
        title={t("signIn")}
        subtitle="Continue with Google, email, or phone verification. New users complete a quick profile setup once."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-4">
            <LogoLockup subtitle="Secure sign-in to continue" />
            <div className="space-y-1">
              <CardTitle>{t("signIn")}</CardTitle>
              <CardDescription>Choose Google, email, or phone verification to create an account and continue.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!envValid ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and reload.
              </div>
            ) : null}

            <Button
              className="h-11 w-full rounded-full border border-border bg-background text-foreground hover:border-accent/40 hover:bg-accent/15 hover:text-primary"
              variant="outline"
              onClick={() => {
                debugEvent({
                  sessionId: "google-oauth-login",
                  runId: "pre-fix",
                  hypothesisId: "A",
                  location: "src/pages/AuthPage.tsx:googleButton",
                  msg: "[DEBUG] User clicked Continue with Google",
                  data: {}
                });
                void signInWithGoogle(redirectTo).catch((e) => {
                  debugEvent({
                    sessionId: "google-oauth-login",
                    runId: "pre-fix",
                    hypothesisId: "A",
                    location: "src/pages/AuthPage.tsx:googleButton",
                    msg: "[DEBUG] signInWithGoogle threw",
                    data: { message: e instanceof Error ? e.message : String(e) }
                  });
                });
              }}
              disabled={loading || !envValid}
            >
              {t("continueWithGoogle")}
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <div className="text-xs text-muted-foreground">{t("or")}</div>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="inline-flex w-full items-center justify-between gap-1 rounded-full border border-border bg-muted/30 p-1 text-xs">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-full px-3 py-2 font-medium transition-colors",
                  method === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-primary"
                )}
                onClick={() => {
                  otpForm.reset();
                  phoneForm.reset();
                  setPhoneE164("");
                  setPhoneStep("request");
                  setMethod("email");
                  setEmailSentTo("");
                  emailForm.reset();
                }}
                disabled={loading || !envValid}
              >
                Email
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-full px-3 py-2 font-medium transition-colors",
                  method === "phone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-primary"
                )}
                onClick={() => {
                  setMethod("phone");
                  otpForm.reset();
                  setEmailSentTo("");
                }}
                disabled={loading || !envValid}
              >
                Phone
              </button>
            </div>

            {method === "email" ? (
              <form
                className="space-y-3"
                onSubmit={emailForm.handleSubmit(async ({ email }) => {
                  const normalized = email.trim();
                  await requestEmailOtp(normalized, redirectTo);
                  setEmailSentTo(normalized);
                })}
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">Email</div>
                  <Input inputMode="email" autoComplete="email" placeholder="name@example.com" {...emailForm.register("email")} />
                  {emailForm.formState.errors.email ? (
                    <div className="text-sm text-destructive">{emailForm.formState.errors.email.message}</div>
                  ) : null}
                </div>

                {error ? (
                  <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <Button className="h-11 w-full" type="submit" disabled={loading || !envValid}>
                  Send link
                </Button>

                {emailSentTo ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      Link sent to <span className="font-medium text-foreground">{emailSentTo}</span>. Open your email and click the link
                      to finish signing in.
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-11"
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={async () => {
                          if (!emailSentTo) return;
                          await requestEmailOtp(emailSentTo, redirectTo);
                        }}
                      >
                        Resend link
                      </Button>
                      <Button
                        className="h-11"
                        type="button"
                        variant="secondary"
                        disabled={loading}
                        onClick={() => {
                          setEmailSentTo("");
                          emailForm.reset();
                        }}
                      >
                        Change email
                      </Button>
                    </div>
                  </div>
                ) : null}
              </form>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex w-full items-center justify-between gap-1 rounded-full border border-border bg-muted/30 p-1 text-xs">
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-full px-3 py-2 font-medium transition-colors",
                      phoneStep === "request"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => {
                      otpForm.reset();
                      setPhoneStep("request");
                    }}
                    disabled={loading || !envValid}
                  >
                    Phone
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-full px-3 py-2 font-medium transition-colors",
                      phoneStep === "verify"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => {
                      if (!phoneE164) return;
                      setPhoneStep("verify");
                    }}
                    disabled={loading || !envValid || !phoneE164}
                  >
                    Code
                  </button>
                </div>

                {phoneStep === "request" ? (
                  <form
                    className="space-y-3"
                    onSubmit={phoneForm.handleSubmit(async ({ nationalNumber }) => {
                      const phone = `+237${nationalNumber.trim()}`;
                      await requestOtp(phone);
                      setPhoneE164(phone);
                      setPhoneStep("verify");
                    })}
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{t("phoneNumber")}</div>
                      <div className="flex items-center gap-2">
                        <div className="h-10 rounded-md border border-border bg-muted px-3 text-sm leading-10 text-muted-foreground">
                          +237
                        </div>
                        <Input
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="6xxxxxxxx"
                          {...phoneForm.register("nationalNumber")}
                        />
                      </div>
                      {phoneForm.formState.errors.nationalNumber ? (
                        <div className="text-sm text-destructive">{phoneForm.formState.errors.nationalNumber.message}</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">{computedPhone}</div>
                      )}
                    </div>

                    {error ? (
                      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                        {error === "Unsupported phone provider"
                          ? "Phone sign-in is not configured for this project yet. Use Google or email for now, or configure an SMS provider in Supabase."
                          : error}
                      </div>
                    ) : null}

                    <Button className="h-11 w-full" type="submit" disabled={loading || !envValid}>
                      {t("sendOtp")}
                    </Button>
                  </form>
                ) : (
                  <form
                    className="space-y-3"
                    onSubmit={otpForm.handleSubmit(async ({ token }) => {
                      await verifyOtp(phoneE164, token.trim());
                      navigate(`/onboarding${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`, {
                        replace: true
                      });
                    })}
                  >
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      Code sent to <span className="font-medium text-foreground">{phoneE164}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{t("otpCode")}</div>
                      <Input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        {...otpForm.register("token")}
                      />
                      {otpForm.formState.errors.token ? (
                        <div className="text-sm text-destructive">{otpForm.formState.errors.token.message}</div>
                      ) : null}
                    </div>

                    {error ? (
                      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                        {error}
                      </div>
                    ) : null}

                    <Button className="h-11 w-full" type="submit" disabled={loading || !envValid}>
                      {t("verifyOtp")}
                    </Button>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-11"
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={async () => {
                          if (!phoneE164) return;
                          await requestOtp(phoneE164);
                        }}
                      >
                        Resend code
                      </Button>
                      <Button
                        className="h-11"
                        type="button"
                        variant="secondary"
                        disabled={loading}
                        onClick={() => {
                          otpForm.reset();
                          phoneForm.reset();
                          setPhoneE164("");
                          setPhoneStep("request");
                        }}
                      >
                        Change phone
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hidden overflow-hidden md:block">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Why sign in?</CardTitle>
            <CardDescription>Your account keeps your activity synced across devices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="font-medium text-foreground">Trade with confidence</div>
              <div className="mt-1">Create listings, place orders, and follow the full status timeline.</div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="font-medium text-foreground">Direct messaging</div>
              <div className="mt-1">Chat with buyers and sellers to confirm details before delivery.</div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="font-medium text-foreground">Offline-friendly</div>
              <div className="mt-1">When the network is weak, you can still browse and sync actions later.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
