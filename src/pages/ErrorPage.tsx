import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Page } from "../components/Page";

function getErrorText(error: unknown) {
  if (!error) return { title: "Something went wrong", message: "An unexpected error occurred. Please refresh and try again." };
  if (isRouteErrorResponse(error)) {
    const title = `${error.status} ${error.statusText}`;
    const message =
      typeof error.data === "string" && error.data.trim().length > 0 ? error.data : "The server returned an error. Please try again.";
    return { title, message };
  }
  if (error instanceof Error) {
    return { title: "Something went wrong", message: error.message || "An unexpected error occurred. Please try again." };
  }
  return { title: "Something went wrong", message: "An unexpected error occurred. Please try again." };
}

export function ErrorPage() {
  const error = useRouteError();
  const { title, message } = getErrorText(error);
  const details = import.meta.env.DEV
    ? typeof error === "string"
      ? error
      : error instanceof Error
        ? error.stack ?? error.message
        : JSON.stringify(error, null, 2)
    : null;

  return (
    <Page className="py-10">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{message}</p>
          {details ? <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-xs text-foreground">{details}</pre> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button asChild variant="outline">
              <Link to="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}

