import { createListing } from "../../api/createListing";
import { placeOrder, updateOrderPaymentMethod, updateOrderStatus } from "../../api/orders";
import { sendMessage } from "../../api/chat";
import { createReviewForOrder } from "../../api/reviews";
import { enqueueAction, listQueuedActions, removeQueuedAction } from "./db";

let syncing = false;

export async function syncQueuedActions(): Promise<void> {
  if (syncing) return;
  if (!navigator.onLine) return;
  syncing = true;
  try {
    const actions = await listQueuedActions();
    for (const action of actions) {
      try {
        if (action.type === "create_listing") {
          await createListing({
            ...action.payload,
            imageBlobs: action.payload.localImageBlobs
          });
          await removeQueuedAction(action.id);
          continue;
        }

        if (action.type === "place_order") {
          await placeOrder(action.payload);
          await removeQueuedAction(action.id);
          continue;
        }

        if (action.type === "update_order_status") {
          await updateOrderStatus(action.payload.orderId, action.payload.status);
          await removeQueuedAction(action.id);
          continue;
        }

        if (action.type === "update_order_payment") {
          await updateOrderPaymentMethod(action.payload.orderId, action.payload.method);
          await removeQueuedAction(action.id);
          continue;
        }

        if (action.type === "send_message") {
          await sendMessage(action.payload);
          await removeQueuedAction(action.id);
          continue;
        }

        if (action.type === "create_review") {
          await createReviewForOrder({
            orderId: action.payload.orderId,
            rating: action.payload.rating,
            comment: action.payload.comment
          });
          await removeQueuedAction(action.id);
          continue;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sync failed";
        await enqueueAction({
          ...action,
          attempts: (action.attempts ?? 0) + 1,
          lastTriedAt: Date.now(),
          lastError: msg
        });
      }
    }
  } finally {
    syncing = false;
  }
}
