# Orange cloud test backend

Project: wqyzdzxixpvxeeiwuney (existing Supabase project). No VM or new paid project was provisioned. Existing quotas and billing still apply; this is not a guarantee of unlimited free usage.

Deployed function: cloud-bootstrap v1.

- GET https://wqyzdzxixpvxeeiwuney.supabase.co/functions/v1/cloud-bootstrap/health: public connectivity and database probe, no user data returned.
- GET /bootstrap: validates the supplied user JWT through Auth getUser and checks the caller's profile status. No data synchronization or executable release is served yet.
- POST: rejected. GET responses use no-store.

Run tests with `node --test cloud-server/tests/bootstrap.test.mjs`.

Verification on 2026-10-18: 8 local handler tests passed. Live GET health returned 200; missing and invalid bearer on bootstrap returned 401; POST health returned 405. A live signed-in user's bootstrap request was not tested. This establishes connectivity and basic denial behavior, not long-term stability or regional performance.

JWT gateway verification is disabled only for this new function because health is public; the private handler verifies JWTs itself. Existing functions and auth settings were not changed. Service credentials remain server-only. No tables, policies, user data, client versions, or releases were modified.

Next implementation gates: enforce the existing full membership/device/session-revocation checks on protected data operations; create owner-isolated cloud data records with conflict detection; implement encrypted browser profile backup/runtime migration; signed immutable web bundles, approval, rollout, automatic rollback and client loader; Windows and macOS shell verification. Browser cookies and credentials are not uploaded by this starter.

LinkedIn is explicitly deferred. Future scope is an independent login window with a separately configured network.

Security advisor review also found existing RPC execute-permission and leaked-password-protection warnings in the original project. No blanket privilege changes were made: each legacy function's internal authorization needs review before changing permissions.
