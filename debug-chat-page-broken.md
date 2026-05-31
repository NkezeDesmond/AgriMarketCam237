# Debug Session: chat-page-broken
- **Status**: [OPEN]
- **Issue**: Chat page not working (fails to load conversations/messages or errors/crashes).
- **Debug Server**: http://127.0.0.1:7779/event
- **Log File**: .dbg/trae-debug-log-chat-page-broken.ndjson

## Reproduction Steps
1. Sign in.
2. Go to `/chat`.
3. If needed, open a conversation or use `/chat?to=<userId>`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Evidence |
|----|------------|------------|----------|
| A | Chat queries fail due to RLS (messages/conversations select denied). | High | Pending |
| B | Realtime subscription throws due to missing permissions or invalid filter. | Med | Pending |
| C | UI crashes due to hook order / null access / query enabled flags. | Med | Pending |
| D | Route is accessible but app is unauthenticated/onboarding redirect loops. | Low | Pending |

## Evidence
- **Confirmed**: Chat deep link can point to the signed-in user id (self-chat), which violates `conversations_check` (`participant_low <> participant_high`).
- Error: `new row for relation "conversations" violates check constraint "conversations_check"` (Postgres code `23514`).
