# Network allowlist (runbook R5)

*Every host the app may contact, with what goes out and what comes back. Created 2026-10-26 for MIP v4.1 Stage 1. A host not on this list must never be contacted; the airplane-mode and no-astro browser checks confirm that the web build makes no request beyond this machine today.*

## In use now

| Host | Purpose | Data sent | Data received | Licence tag | Can be disabled |
| ------ | ------ | ------ | ------ | ------ | ------ |
| `127.0.0.1:8787` (laptop only) | Local data helper (`packages/data-service`): health and instrument list on the Data screen | GET requests with no personal data | JSON status and instrument rows | Own service | Yes: do not start the helper; the app works on saved and demo data |
| `nsearchives.nseindia.com` (Android app only) | Daily catch-up: one public file per missing trading day (Stage 2, 2026-10-26) | GET for a dated public file, with a generic user-agent; nothing about the user | The day's equity prices (zip) | Personal learning use; check before any sharing | Yes: offline, the app uses the history shipped inside it |
| `api.anthropic.com` (only when AI mode is On and a key is saved) | AI tutor (Stage 5, 2026-10-28), through the official `@anthropic-ai/sdk`, from the web build and the Android app | POST `/v1/messages` with the owner's own API key: the feature's context (lesson text, screen hint, your question, practice-account figures shown under the answer, journal text with profile names removed); never PINs, backups or names. The SDK also sends its version and platform headers (`anthropic-version`, `X-Stainless-*`, `anthropic-dangerous-direct-browser-access` on the web) | The answer text and token counts | Pay per use under the owner's Console account | Yes: mode Off or Preview, or remove the key. Preview and Off make no request |

Preview and Off contact nothing. The web build otherwise contacts only the laptop's data helper, and the AI host above when the owner turns AI On. Build-time only (never from the app): `api.mfapi.in` and `portal.amfiindia.com` are read by `pnpm funds:build` on the laptop to make the fund NAV file, which is then shipped inside the app.

## Planned, not yet contacted

| Host | Stage | Purpose | Data sent | Data received | Licence tag | Can be disabled |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| NSE archives, other files (index closes, corporate actions, status) | 2+ | Index closes, corporate actions, status files | GET for a dated public file | Public market files | Personal learning use; check before any sharing | Yes |
| Yahoo Finance (`query1.finance.yahoo.com`) | 2 | Fallback daily prices when an NSE file is missing | GET for a symbol and date range | Chart JSON | Personal use; check terms before any sharing | Yes |
| Free-tier provider (Google Gemini, `generativelanguage.googleapis.com`) | 5 | **Not adopted.** Re-checked 2026-10-28 for Stage 5: the free tier may use submitted prompts to improve the provider's products and allows human review, and it is not offered to people under 18, which rules it out for a family app that sends journal text. Revisit if the terms change | | | | |

Each planned row moves to "In use now" in the change that first contacts the host.
