# Debug Session: create-listing-save
- **Status**: [OPEN]
- **Issue**: Create Listing shows “Saving…” then returns to “Publish” without creating a listing.
- **Debug Server**: http://127.0.0.1:7779/event
- **Log File**: .dbg/trae-debug-log-create-listing-save.ndjson

## Reproduction Steps
1. Sign in.
2. Go to `/listings/new`.
3. Fill required fields.
4. Click “Publish”.
5. Observe whether listing is created and you are redirected (or the UI returns to “Publish”).

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Supabase insert fails (RLS / role / missing required column) and UI swallows error. | High | Low | Pending |
| B | Image upload fails (Storage policy / file too large) and UI resets. | Med | Med | Pending |
| C | Offline queue path is taken unexpectedly and UI does not reflect success. | Med | Low | Pending |
| D | Navigation after success fails (route error) and the form remounts, appearing as “Publish” again. | Low | Low | Pending |

## Log Evidence
- **Confirmed**: Storage upload blocked by RLS on `storage.objects` for bucket `listing-images`.
- Error observed: `new row violates row-level security policy` during image upload, followed by rollback delete of listing.
- **Confirmed**: Listing detail route was showing the global NotFound error boundary due to a React hook order violation in `ListingDetailPage` (`Rendered more hooks than during the previous render.`).

## Verification Conclusion
[Awaiting post-fix reproduction: create listing with image should redirect to listing detail without NotFound.]
