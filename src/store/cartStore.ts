import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  listing_id: string;
  farmer_id: string;
  title: string;
  crop_type: string;
  unit: string;
  price_xaf: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (listingId: string) => void;
  setQuantity: (listingId: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const qty = Math.max(1, Math.floor(item.quantity ?? 1));
        const existing = get().items.find((i) => i.listing_id === item.listing_id);
        if (existing) {
          set({
            items: get().items.map((i) => (i.listing_id === item.listing_id ? { ...i, quantity: i.quantity + qty } : i))
          });
          return;
        }
        set({ items: [...get().items, { ...item, quantity: qty }] });
      },
      removeItem: (listingId) => set({ items: get().items.filter((i) => i.listing_id !== listingId) }),
      setQuantity: (listingId, quantity) => {
        const next = Math.max(1, Math.floor(quantity));
        set({ items: get().items.map((i) => (i.listing_id === listingId ? { ...i, quantity: next } : i)) });
      },
      clear: () => set({ items: [] })
    }),
    { name: "agrimarket-cart-v1" }
  )
);

