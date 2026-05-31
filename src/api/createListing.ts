import { supabase } from "./supabase";
import type { Database } from "../types/database";
import { debugEvent } from "../lib/debug";

export type CreateListingInput = Omit<
  Database["public"]["Tables"]["listings"]["Insert"],
  "id" | "created_at" | "updated_at" | "image_urls" | "status"
> & {
  imageBlobs: Blob[];
  onUploadProgress?: (done: number, total: number) => void;
};

export async function createListing(input: CreateListingInput): Promise<string> {
  const { imageBlobs, onUploadProgress, ...rest } = input;
  // #region debug-point A:create-listing-insert-start
  debugEvent({
    sessionId: "create-listing-save",
    runId: "pre-fix",
    hypothesisId: "A",
    location: "src/api/createListing.ts:createListing",
    msg: "[DEBUG] Inserting listing row",
    data: { farmer_id: (rest as any).farmer_id ?? null, imageCount: imageBlobs.length }
  });
  // #endregion

  const { data: inserted, error: insertError } = await supabase
    .from("listings")
    .insert({
      ...rest,
      image_urls: [],
      status: "active"
    })
    .select("id")
    .single();

  // #region debug-point A:create-listing-insert-result
  debugEvent({
    sessionId: "create-listing-save",
    runId: "pre-fix",
    hypothesisId: "A",
    location: "src/api/createListing.ts:createListing",
    msg: "[DEBUG] Insert listing result",
    data: {
      ok: !insertError,
      listingId: inserted?.id ?? null,
      error: insertError
        ? { message: insertError.message, code: (insertError as any).code, details: (insertError as any).details, hint: (insertError as any).hint }
        : null
    }
  });
  // #endregion
  if (insertError) throw insertError;

  const listingId = inserted.id;
  const uploadedUrls: string[] = [];
  const uploadedPaths: string[] = [];

  try {
    for (const [i, blob] of imageBlobs.entries()) {
      if (!blob) throw new Error("Missing image blob");
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const id =
        typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `${listingId}/${id}.${ext}`;

      // #region debug-point B:create-listing-upload-start
      debugEvent({
        sessionId: "create-listing-save",
        runId: "pre-fix",
        hypothesisId: "B",
        location: "src/api/createListing.ts:createListing",
        msg: "[DEBUG] Uploading listing image",
        data: { index: i, total: imageBlobs.length, contentType: blob.type, size: (blob as any).size ?? null }
      });
      // #endregion
      const { error: uploadError } = await supabase.storage.from("listing-images").upload(path, blob, {
        upsert: false,
        contentType: blob.type
      });
      if (uploadError) throw uploadError;

      uploadedPaths.push(path);
      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
      onUploadProgress?.(i + 1, imageBlobs.length);
    }

    if (uploadedUrls.length) {
      const { error: updateError } = await supabase
        .from("listings")
        .update({ image_urls: uploadedUrls })
        .eq("id", listingId);
      if (updateError) throw updateError;
    }
  } catch (e) {
    // #region debug-point B:create-listing-upload-error
    debugEvent({
      sessionId: "create-listing-save",
      runId: "pre-fix",
      hypothesisId: "B",
      location: "src/api/createListing.ts:createListing",
      msg: "[DEBUG] Upload/update failed; rolling back listing",
      data: {
        message: e instanceof Error ? e.message : String(e),
        code: (e as any)?.code ?? null,
        details: (e as any)?.details ?? null,
        uploadedCount: uploadedPaths.length
      }
    });
    // #endregion
    if (uploadedPaths.length) {
      await supabase.storage.from("listing-images").remove(uploadedPaths);
    }
    await supabase.from("listings").delete().eq("id", listingId);
    throw e;
  }

  // #region debug-point D:create-listing-finished
  debugEvent({
    sessionId: "create-listing-save",
    runId: "pre-fix",
    hypothesisId: "D",
    location: "src/api/createListing.ts:createListing",
    msg: "[DEBUG] createListing finished",
    data: { listingId, uploadedCount: uploadedUrls.length }
  });
  // #endregion
  return listingId;
}
