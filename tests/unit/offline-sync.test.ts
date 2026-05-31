import { beforeEach, describe, expect, it, vi } from "vitest";

const createListing = vi.fn();
const placeOrder = vi.fn();
const updateOrderStatus = vi.fn();
const sendMessage = vi.fn();
const createReviewForOrder = vi.fn();
const listQueuedActions = vi.fn();
const removeQueuedAction = vi.fn();
const enqueueAction = vi.fn();

vi.mock("../../src/api/createListing", () => ({
  createListing
}));

vi.mock("../../src/api/orders", () => ({
  placeOrder,
  updateOrderStatus
}));

vi.mock("../../src/api/chat", () => ({
  sendMessage
}));

vi.mock("../../src/api/reviews", () => ({
  createReviewForOrder
}));

vi.mock("../../src/lib/offline/db", () => ({
  listQueuedActions,
  removeQueuedAction,
  enqueueAction
}));

describe("syncQueuedActions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("dispatches all supported queued action types", async () => {
    listQueuedActions.mockResolvedValue([
      {
        id: "a1",
        type: "create_listing",
        createdAt: 1,
        payload: {
          farmer_id: "farmer-1",
          title: "Fresh maize",
          crop_type: "maize",
          description: null,
          quantity: 40,
          unit: "kg",
          price_xaf: 15000,
          harvest_date: null,
          expiry_date: null,
          region: "Northwest",
          commune: "Bamenda I",
          location: null,
          localImageBlobs: []
        }
      },
      {
        id: "a2",
        type: "place_order",
        createdAt: 2,
        payload: {
          listing_id: "listing-1",
          buyer_id: "buyer-1",
          farmer_id: "farmer-1",
          quantity: 2,
          price_xaf: 10000
        }
      },
      {
        id: "a3",
        type: "update_order_status",
        createdAt: 3,
        payload: {
          orderId: "order-1",
          status: "disputed"
        }
      },
      {
        id: "a4",
        type: "send_message",
        createdAt: 4,
        payload: {
          conversation_id: "conv-1",
          sender_id: "buyer-1",
          recipient_id: "farmer-1",
          body: "Hello"
        }
      },
      {
        id: "a5",
        type: "create_review",
        createdAt: 5,
        payload: {
          orderId: "order-2",
          rating: 5,
          comment: "Reliable seller"
        }
      }
    ]);

    const { syncQueuedActions } = await import("../../src/lib/offline/sync");
    await syncQueuedActions();

    expect(createListing).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Fresh maize",
        imageBlobs: []
      })
    );
    expect(placeOrder).toHaveBeenCalledWith({
      listing_id: "listing-1",
      buyer_id: "buyer-1",
      farmer_id: "farmer-1",
      quantity: 2,
      price_xaf: 10000
    });
    expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "disputed");
    expect(sendMessage).toHaveBeenCalledWith({
      conversation_id: "conv-1",
      sender_id: "buyer-1",
      recipient_id: "farmer-1",
      body: "Hello"
    });
    expect(createReviewForOrder).toHaveBeenCalledWith({
      orderId: "order-2",
      rating: 5,
      comment: "Reliable seller"
    });
    expect(removeQueuedAction).toHaveBeenCalledTimes(5);
  });

  it("re-enqueues failed actions with retry metadata", async () => {
    listQueuedActions.mockResolvedValue([
      {
        id: "a1",
        type: "send_message",
        createdAt: 4,
        attempts: 1,
        payload: {
          conversation_id: "conv-1",
          sender_id: "buyer-1",
          recipient_id: "farmer-1",
          body: "Hello"
        }
      }
    ]);
    sendMessage.mockRejectedValue(new Error("Temporary failure"));

    const { syncQueuedActions } = await import("../../src/lib/offline/sync");
    await syncQueuedActions();

    expect(enqueueAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "a1",
        attempts: 2,
        lastError: "Temporary failure"
      })
    );
    expect(removeQueuedAction).not.toHaveBeenCalled();
  });
});

