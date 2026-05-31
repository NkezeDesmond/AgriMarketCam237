import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { MarketplacePage } from "../../src/pages/MarketplacePage";

vi.mock("../../src/api/listings", async () => {
  const actual = (await vi.importActual<typeof import("../../src/api/listings")>("../../src/api/listings")) as typeof import("../../src/api/listings");
  return {
    ...actual,
    fetchListings: vi.fn().mockResolvedValue([
      {
        id: "1",
        farmer_id: "f1",
        title: "Fresh maize (50kg)",
        crop_type: "maize",
        description: null,
        quantity: 50,
        unit: "kg",
        price_xaf: 25000,
        harvest_date: null,
        expiry_date: null,
        region: "Northwest",
        commune: "Bamenda I",
        location: null,
        image_urls: [],
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
  };
});

describe("MarketplacePage", () => {
  it("renders a listing card", async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MarketplacePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText(/Fresh maize/i)).toBeInTheDocument();
  });
});

