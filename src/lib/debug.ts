export function debugEvent(payload: unknown): void {
  if (!import.meta.env.DEV) return;
  const url = import.meta.env.VITE_DEBUG_EVENT_URL;
  if (!url) return;
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {});
}
