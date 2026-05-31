# Debug Session: google-oauth-login
- **Status**: [OPEN]
- **Issue**: Google sign-in cannot complete (“Continue with Google” does not result in a logged-in session).
- **Debug Server**: http://127.0.0.1:7779/event
- **Log File**: .dbg/trae-debug-log-google-oauth-login.ndjson

## Reproduction Steps
1. Open the app and go to `/auth`.
2. Click “Continue with Google”.
3. Select a Google account.
4. Observe whether you land on `/auth/callback` and whether you end up in `/onboarding` with a valid session.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Supabase OAuth returns an error or missing `data.url` so redirect never starts. | Med | Low | Rejected (signInWithOAuth returned a URL) |
| B | Redirect happens but callback URL is not allowed in Supabase/Google settings, so the flow bounces back to `/auth` or errors. | High | Low | Pending |
| C | Callback receives no `code` and no session, so `exchangeCodeForSession` never runs successfully. | High | Low | Pending |
| D | Callback exchanges code successfully but session/profile refresh fails and app navigates incorrectly (state mismatch). | Med | Med | Pending |

## Log Evidence
- `signInWithOAuth` returned `data.url` and redirect started (hypothesis A rejected).

## Verification Conclusion
[Pre-fix vs post-fix comparison will be added here.]
