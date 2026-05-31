import { openDB, type DBSchema } from "idb";
import type { Database, OrderStatus, PaymentMethod } from "../../types/database";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

export type OfflineCreateListingPayload = Omit<
  Database["public"]["Tables"]["listings"]["Insert"],
  "image_urls" | "status"
> & {
  localImageBlobs: Blob[];
};

export type OfflinePlaceOrderPayload = {
  listing_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  price_xaf: number;
  payment_method?: PaymentMethod | null;
};

export type OfflineUpdateOrderStatusPayload = {
  orderId: string;
  status: OrderStatus;
};

export type OfflineUpdateOrderPaymentPayload = {
  orderId: string;
  method: PaymentMethod;
};

export type OfflineSendMessagePayload = {
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
};

export type OfflineCreateReviewPayload = {
  orderId: string;
  rating: number;
  comment: string | null;
};

export type OfflineAction =
  | {
      id: string;
      type: "create_listing";
      payload: OfflineCreateListingPayload;
      createdAt: number;
      attempts?: number;
      lastTriedAt?: number;
      lastError?: string;
    }
  | {
      id: string;
      type: "place_order";
      payload: OfflinePlaceOrderPayload;
      createdAt: number;
      attempts?: number;
      lastTriedAt?: number;
      lastError?: string;
    }
  | {
      id: string;
      type: "update_order_status";
      payload: OfflineUpdateOrderStatusPayload;
      createdAt: number;
      attempts?: number;
      lastTriedAt?: number;
      lastError?: string;
    }
  | {
      id: string;
      type: "update_order_payment";
      payload: OfflineUpdateOrderPaymentPayload;
      createdAt: number;
      attempts?: number;
      lastTriedAt?: number;
      lastError?: string;
    }
  | {
      id: string;
      type: "send_message";
      payload: OfflineSendMessagePayload;
      createdAt: number;
      attempts?: number;
      lastTriedAt?: number;
      lastError?: string;
    }
  | {
      id: string;
      type: "create_review";
      payload: OfflineCreateReviewPayload;
      createdAt: number;
      attempts?: number;
      lastTriedAt?: number;
      lastError?: string;
    };

export type CachedListings = {
  key: string;
  listings: Listing[];
  updatedAt: number;
};

interface AgriMarketDB extends DBSchema {
  action_queue: {
    key: string;
    value: OfflineAction;
    indexes: { "by-createdAt": number };
  };
  listings_cache: {
    key: string;
    value: CachedListings;
  };
}

export const dbPromise = openDB<AgriMarketDB>("agrimarket", 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const store = db.createObjectStore("action_queue", { keyPath: "id" });
      store.createIndex("by-createdAt", "createdAt");
    }
    if (oldVersion < 2) {
      db.createObjectStore("listings_cache", { keyPath: "key" });
    }
  }
});

export async function enqueueAction(action: OfflineAction): Promise<void> {
  const db = await dbPromise;
  await db.put("action_queue", action);
}

export async function listQueuedActions(): Promise<OfflineAction[]> {
  const db = await dbPromise;
  return db.getAllFromIndex("action_queue", "by-createdAt");
}

export async function removeQueuedAction(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete("action_queue", id);
}

export async function cacheListings(key: string, listings: Listing[]): Promise<void> {
  const db = await dbPromise;
  await db.put("listings_cache", { key, listings, updatedAt: Date.now() });
}

export async function getCachedListings(key: string): Promise<CachedListings | null> {
  const db = await dbPromise;
  return (await db.get("listings_cache", key)) ?? null;
}

export const ACTIVE_LISTINGS_CACHE_KEY = "active_listings_v1";

export async function cacheActiveListings(listings: Listing[]): Promise<void> {
  await cacheListings(ACTIVE_LISTINGS_CACHE_KEY, listings);
}

export async function getActiveListingsCache(): Promise<Listing[] | null> {
  const cached = await getCachedListings(ACTIVE_LISTINGS_CACHE_KEY);
  return cached?.listings ?? null;
}

export async function findCachedListingById(id: string): Promise<Listing | null> {
  const listings = await getActiveListingsCache();
  return listings?.find((l) => l.id === id) ?? null;
}
