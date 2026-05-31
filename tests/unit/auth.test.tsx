import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthPage } from "../../src/pages/AuthPage";
import "../../src/lib/i18n";

type AuthStoreShape = {
  requestOtp: (phoneE164: string) => Promise<void>;
  verifyOtp: (phoneE164: string, token: string) => Promise<void>;
  loading: boolean;
  error: string | null;
};

vi.mock("../../src/store/authStore", () => ({
  useAuthStore: <T,>(selector: (s: AuthStoreShape) => T) =>
    selector({
      requestOtp: vi.fn().mockResolvedValue(undefined),
      verifyOtp: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: null
    })
}));

describe("AuthPage", () => {
  it("shows cameroon country code prefix", () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    expect(screen.getByText("+237")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send otp/i })).toBeInTheDocument();
  });
});
