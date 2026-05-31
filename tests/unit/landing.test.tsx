import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LandingPage } from "../../src/pages/LandingPage";
import "../../src/lib/i18n";

describe("LandingPage", () => {
  it("renders app name", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/AgriMarket/i)).toBeInTheDocument();
  });
});

