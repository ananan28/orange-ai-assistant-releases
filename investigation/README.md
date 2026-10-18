# Common webpage overhead investigation (2026-10-18)

Status: investigation and unshipped draft, not a release and not a verified fix for the reported 70% system-memory usage.

Reproduction: extract main.js, site-preload.js and extension-source/ai_reply.js from orange-source-1.0.43.zip into a baseline directory. Apply orange-performance-investigation-overlay.zip onto the source extracted from orange-source-1.0.44-candidate.zip (base archive SHA-256 9eca065ef5a8758ba149cd2eaf49224e74d2ccfa71618549d2a5169a33bd412a). Run node scripts/audit-common-overhead.cjs <baseline-directory>.

Actual source functions were executed in controlled VM fixtures, not live browser memory measurements:

| Scenario | 1.0.43 baseline | Unreleased draft |
| --- | ---: | ---: |
| Password-input queries for 1000 AI UI triggers before timer flush | 1000 | 1 |
| Credential scans for initial load plus 1000 mutation callbacks | 1001 | 2 |
| Writes for 100 identical workspace save requests | 100 | 1 |
| Peak hidden credential windows for 20 simultaneous auth-sync calls | 20 | 1 |

These counts establish unnecessary work and temporary window concurrency, not the magnitude or dominant cause of real Windows memory usage. They do not imply twenty hidden windows permanently exist whenever twenty websites are open. Multiple extension contexts per account, actual page heaps, GPU allocations and renderer retention still require runtime evidence. No memory leak has been established.

Draft changes coalesce credential scans and AI UI scheduling, serialize credential-sync windows, skip identical workspace writes, and avoid area-lookup context extraction without permission. Login data, browser partitions and TN keepalive settings are preserved. The tray menu has an opt-in 30-second performance sampler using app.getAppMetrics and webContents PID mapping. No automatic sampler runs. It excludes cookies, tokens, account names, URL paths and message text. Working-set sums can include shared pages; Windows private bytes are recorded separately.

Tests: node scripts/test-extension-auth-sync.cjs; node scripts/test-performance-snapshot.cjs; npm run check; node scripts/prepare-release-extension.js. Windows executable, actual multi-window usage, notification retention and real memory savings are NOT verified. Core login-recovery changes remain in the parent candidate. Cloud data synchronization and hot updates remain incomplete.

Overlay SHA-256: 4cb64fa39000bb6e0fea8edfb83112980770305553a3d8469b9647f29aeb47e6
