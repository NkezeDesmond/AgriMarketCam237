import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHero } from "../components/PageHero";
import { NOT_FOUND_HERO_IMAGE, NOT_FOUND_HERO_IMAGE_SM } from "../lib/constants";
import { Page } from "../components/Page";

export function NotFoundPage() {
  const error = useRouteError();
  const message =
    error && isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : "The page you requested does not exist.";

  return (
    <Page className="py-10">
      <PageHero imageUrl={NOT_FOUND_HERO_IMAGE} imageUrlSm={NOT_FOUND_HERO_IMAGE_SM} title="Not found" subtitle={message} priority="low" />
      <Card>
        <CardHeader>
          <CardTitle>Not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{message}</p>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </CardContent>
      </Card>
    </Page>
  );
}
