import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDashboardPage } from "../../src/pages/AdminDashboardPage";

const fetchAdminKpis = vi.fn().mockResolvedValue({
  total_users: 12,
  onboarded_users: 9,
  verified_users: 5,
  suspended_users: 1,
  total_listings: 7,
  active_listings: 4,
  hidden_listings: 2,
  total_orders: 8,
  disputed_orders: 1,
  completed_orders: 3,
  completed_gmv_xaf: 125000
});

const fetchProfilesAdmin = vi.fn().mockResolvedValue([]);
const fetchListingsAdmin = vi.fn().mockResolvedValue([]);
const fetchOrdersAdmin = vi.fn().mockResolvedValue([
  {
    id: "11111111-1111-1111-1111-111111111111",
    listing_id: "22222222-2222-2222-2222-222222222222",
    buyer_id: "33333333-3333-3333-3333-333333333333",
    farmer_id: "44444444-4444-4444-4444-444444444444",
    quantity: 3,
    price_xaf: 12000,
    status: "disputed",
    created_at: "2026-05-28T00:00:00.000Z",
    updated_at: "2026-05-28T00:00:00.000Z"
  }
]);
const fetchReviewsAdmin = vi.fn().mockResolvedValue([
  {
    id: "55555555-5555-5555-5555-555555555555",
    order_id: "11111111-1111-1111-1111-111111111111",
    listing_id: "22222222-2222-2222-2222-222222222222",
    reviewer_id: "33333333-3333-3333-3333-333333333333",
    reviewee_id: "44444444-4444-4444-4444-444444444444",
    rating: 4,
    comment: "Fast delivery",
    created_at: "2026-05-28T00:00:00.000Z"
  }
]);
const transitionOrderStatusAdmin = vi.fn().mockResolvedValue(undefined);
const updateListingStatusAdmin = vi.fn().mockResolvedValue(undefined);
const updateProfileAdmin = vi.fn().mockResolvedValue(undefined);
const deleteReviewAdmin = vi.fn().mockResolvedValue(undefined);

vi.mock("../../src/api/admin", () => ({
  fetchAdminKpis,
  fetchProfilesAdmin,
  fetchListingsAdmin,
  fetchOrdersAdmin,
  fetchReviewsAdmin,
  transitionOrderStatusAdmin,
  updateListingStatusAdmin,
  updateProfileAdmin,
  deleteReviewAdmin
}));

describe("AdminDashboardPage", () => {
  it("renders KPI cards and new orders and reviews tabs", async () => {
    const client = new QueryClient();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Users")).toBeInTheDocument();
    expect(await screen.findByText("125,000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Orders" }));
    expect(await screen.findByText("Order management")).toBeInTheDocument();
    expect(screen.getByDisplayValue("disputed")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Optional note")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reviews" }));
    expect(await screen.findByText("Review moderation")).toBeInTheDocument();
    expect(screen.getByText("Fast delivery")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteReviewAdmin).toHaveBeenCalledWith("55555555-5555-5555-5555-555555555555"));
  });
});

