# Session recovery candidate 1.0.44

Based on recovered 1.0.43 source. Candidate only, not a release or installer.

Changes: retain authorized sites and proxy routes during read outages; keep renderer signed in during recovery errors; only explicit revocation codes cause heartbeat logout; follow SDK token rotation; locally scoped sign-out; ignore stale heartbeat results and prevent overlap; refresh loaded independent sessions; skip unchanged extension credentials without opening hidden windows.

Validation: `npm ci` then `npm run check`. Tests include the actual pinned Supabase SDK against local HTTP responses with its real retry cooldown. No production account credentials are used. SDK errors for confirmed refresh-token revocation are classified as INVALID_SESSION by the application; heartbeat tests verify sign-out on that code. The SDK may retain its cache for such an API error, so the application must enforce it.

Automated tests do not establish long-running Windows stability, sleep/wake recovery, full Gmail sign-in, or cloud migration readiness. These remain release gates. No formal release or automatic update is authorized by this candidate checkpoint.

Source SHA-256: 9eca065ef5a8758ba149cd2eaf49224e74d2ccfa71618549d2a5169a33bd412a
