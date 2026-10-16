# Trading App Runbook (Android)

*Standard operating procedure for building, testing and releasing the Dual-Mode Mock Trading Platform on Android. Draft v0.5, 2026-10-13. Not investment advice.*

**Status.** Draft for owner review. It adapts the EasyCTET `EXPO_ANDROID_PRODUCTION_RUNBOOK.md` and adds rules the trading app needs and EasyCTET did not (determinism, network allowlist, identifiers, rule-book signing, store policy, AI synthesis boundary). Nothing here has been run against a real build yet.

**Tags.** **[E]** inherited from EasyCTET · **[N]** new for this app · **[V]** verify against the current vendor or store documentation before relying · **[D]** open owner decision (see §14, all closed).

**Companion documents.** `Study-docs/Dual_Mode_Mock_Trading_Platform_Concept_Note_and_Architecture_v2.md` (cited as **CN**), `Study-docs/research/CLASSICAL_SOURCES_RESEARCH_REPORT.md` (cited as **SA**).

---

## 0. How to use this runbook

- Rules are numbered **R1 to R17**. Each has a *Rule*, a *Why* and a *Check* (something a person or script can verify).
- A release candidate may be promoted only when every **Release gate** item in §12 passes and the evidence is stored (§11.3).
- A rule may be changed only by editing this file and recording the change in §15. Silent exceptions are not allowed.

---

## 1. Scope and assumptions

| Item | Assumption | Tag |
|---|---|---|
| Framework | Expo (managed workflow) + React Native, New Architecture, Hermes | [E] [D] |
| Language | TypeScript, strict mode (CN §11.5 names TypeScript) | [N] |
| Local storage | SQLite for ledger, decisions and experiments; a key-value store for small settings | [E] |
| Network | The app requires a network for live-paper, event data and AI synthesis, all through an allowlist (R5). Replay makes no network calls; that is a test property that proves replay has no hidden inputs (R6), not an offline product promise | [N] |
| AI | AI is used only to synthesise readable text from a code-built, verified fact pack (R15 to R17). All collection, parsing, analysis and computation is code. The app works with AI off | [N] |
| Money | Virtual money only. No real orders, no broker credentials, no custody | [N] |
| Distribution | Private research use; sideloaded APK. No store release planned | [D] |

If the framework decision [D] changes, R1 to R4 and R10 change; R5 to R9 and R11 to R14 do not.

---

## 2. Binary, ABI and SDK rules

### R1. Build profiles decide ABI and debug features, never a static file **[E]**

- **Rule.** Use `app.config.js`, not a static `app.json`. Gate ABI and debug-only features on `process.env.EAS_BUILD_PROFILE`.
  - `preview` (sideload APK): `arm64-v8a` only.
  - `production` (AAB): no `buildArchs` restriction. Play delivers the right slice per device.
- **Why.** In EasyCTET a static `buildArchs: ["arm64-v8a"]` silently applied to every profile, narrowing the real install base without any build error.
- **Check.** CI prints the resolved config for each profile (`npx expo config --type public`, per profile) and a script asserts `buildArchs` is absent in `production`.

```js
// app.config.js (sketch)
const isProd = process.env.EAS_BUILD_PROFILE === 'production';
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ['expo-build-properties', { android: {
      minSdkVersion: 24,
      compileSdkVersion: 36,
      targetSdkVersion: 36,
      buildArchs: isProd ? undefined : ['arm64-v8a'],
    }}],
  ],
  extra: { buildProfile: process.env.EAS_BUILD_PROFILE ?? 'local' },
});
```

### R2. SDK levels are single-sourced and re-verified each release **[E] [V]**

- **Rule.** `compileSdkVersion` and `targetSdkVersion` are set in one place (the block above). Before each store submission, re-check Google Play's current target-API requirement and the device-coverage figure for `minSdkVersion`.
- **Why.** EasyCTET's runbook is internally inconsistent: its checklist says `targetSdkVersion: 35` while its rules say `36`. The "2026 mandate" and "99.8% coverage" figures were never sourced.
- **Check.** A script compares the three values in config against a `docs/sdk-levels.json` file that records the date and source of the last verification.

### R3. Size budget is declared per artifact, and large assets have a delivery plan **[E] [N]**

- **Rule.** Declare budgets: sideload APK (arm64) and Play AAB base module. Anything that would break a budget (bundled datasets, fonts, historical price files) must name its delivery path in the PR: bundled, Play Asset Delivery, or user download.
- **Why.** EasyCTET's spec promised a < 15 MB AAB while also bundling about 2.8 GB of audio. The two statements could not both be true.
- **Check.** CI fails if the built artifact exceeds its budget. `docs/size-budget.json` holds the numbers.

---

## 3. Startup and native-dependency rules

### R4. Cold-start safety **[E]**

1. `expo-dev-client` must never be a release dependency. CI fails if it appears in a `preview` or `production` install.
2. No native API is called at module top level. Initialise lazily behind a guarded accessor (the EasyCTET `getNotificationsModule()` pattern).
3. The app root is wrapped in a permanent `RootErrorBoundary` that shows a recoverable screen and writes a local diagnostic entry (R11).
4. Native-library policy (stated precisely; EasyCTET's wording was ambiguous):
   - Every native or JSI dependency must be listed in `docs/native-deps.md` with: package, version, maintenance status, last compatibility check against the current React Native version, and why it is needed.
   - A dependency flagged "unmaintained" by `expo-doctor`, or without a release compatible with the current RN version, is rejected.
   - JSI libraries are **permitted** if maintained and listed (the key-value store EasyCTET used is itself a JSI library). The ban applies to *unmaintained* libraries, not to JSI as such.
- **Why.** An `UnsatisfiedLinkError` from a stale `.so` kills the process before any JavaScript runs, so no error boundary can catch it.
- **Check.** Cold-start on two physical devices (§11.1) after every dependency change.

### R5. Network allowlist replaces "zero network" **[N]**

- **Rule.** Replay mode makes no network requests. Live-paper, the event-exposure layer and AI synthesis (R16) may contact only hosts listed in `docs/network-allowlist.md`, each with: purpose, data sent, data received, licence tag, and whether it can be disabled.
  - No analytics, advertising or crash-reporting SDK that sends data off the device.
  - The AI host is an allowlist entry: purpose = synthesis, data sent = the fact pack only (R16), can be disabled = yes. Call it with plain HTTPS requests, not a vendor SDK, so nothing else is sent.
  - Cleartext traffic disabled, and the Android network security config is checked in CI so a dependency's manifest merge cannot re-enable it.
  - Responses are stored as `data_snapshot` rows with a checksum and licence tag (CN §10). Order is fetch, checksum, persist, then hand to the engine. A decision never reads a live response directly.
- **Failure semantics.** The network is required, so its failure modes are specified:
  1. **Missing data is a recorded gap, not a filled one.** If a fetch fails at decision time, the arm records "no decision: data unavailable" with a reason code. No silent stale value, no carry-forward.
  2. **Same snapshot for every arm** at a given `as_of_ts`. One arm must never see a fetch that another missed.
  3. **Timeouts and retries** are bounded and idempotent, using the R10 idempotency keys, so a retry cannot double-post.
  4. **Catch-up policy** for scheduled jobs missed while offline or in Doze: each job type declares post-late, skip, or backfill. Backfill uses data as of the original business date, never later data.
  5. **No silent fallback** to mock or cached data. Any substitution shows a visible banner and writes an audit row.
- **Why.** CN §11 needs market and event data. "100% offline" (EasyCTET) cannot hold, but the privacy posture can, if every outbound flow is declared. The experiment's integrity is decided at failure time, so failure behaviour is a rule, not an implementation detail.
- **Check.** (a) Airplane-mode run of the full replay flow passes (§11.1, T1). (b) An instrumented run records every outbound host, captured with a device-level proxy or VPN-based logger **[V]**; the list must equal the allowlist. (c) Airplane-mode run of live-paper and AI features shows a clear offline state (T1b).

---

## 4. Determinism rules

These are the most important additions. The experiment is only valid if the same inputs give the same decisions, on any device, today or in a year.

### R6. One injected clock **[N]**

- **Rule.** All domain code receives time from a `Clock` interface. Direct use of `Date.now()` or `new Date()` is allowed only inside the clock implementation and the audit writer. A lint rule enforces this.
  - `SimClock`: replay and live-paper decisions.
  - `WallClock`: audit timestamps and UI only.
  - Every stored event carries both `sim_ts_utc` and `wall_ts_utc`; analytics use only `sim_ts_utc`.
  - In live-paper, `sim_ts_utc` (the `as_of_ts`) is the data provider's timestamp on the stored `data_snapshot`, not the device clock.
- **Why.** CN §3 rule 2 (time is an injected dependency) and rule 5 (no look-ahead).
- **Check.** Lint passes. A test replays one day under two different device clocks and time zones and compares decision hashes.

### R7. Quantised inputs, golden vectors, no float in the ledger **[N]**

- **Rule.**
  1. Astronomical longitudes and event times are quantised to the registered precision before any comparison or hash (CN §11.5). The quantisation spec is part of `astro_engine_build`.
  2. A committed set of **golden test vectors** (inputs → expected longitudes, signals, decisions) runs in CI and in the on-device diagnostic (§8).
  3. Money uses integer minor units (or `BigInt`). No floating-point arithmetic touches a ledger line.
  4. Canonical serialisation for hashing is defined once (sorted keys, UTF-8, fixed number formatting) and used everywhere.
- **Why.** Transcendental functions and number formatting can differ across engines or platforms [V]. Quantisation and golden vectors turn that risk into a failing test, not a silent decision flip.
- **Check.** Golden vectors pass on the CI Node runtime **and** on-device under Hermes on each test device. Any mismatch blocks release.

### R8. Randomness is seeded and recorded **[N]**

- **Rule.** Placebo arms (random filter, shuffled ephemeris, random letters or cells; CN §4.1, §6.3) draw from a seeded generator. The seed is derived from `(experiment_id, arm_id, as_of_ts, purpose)` and stored on the decision row. `Math.random()` is forbidden in domain code (lint).
- **Why.** A placebo that cannot be regenerated cannot be audited.
- **Check.** Re-running a stored decision with its seed reproduces the stored decision exactly.

---

## 5. Data, identifiers and integrity

### R9. Storage rules **[E] [N]**

1. SQLite, WAL mode, foreign keys on.
2. Schema version via `PRAGMA user_version`. Migrations are forward-only, each in one transaction, each preceded by a file-level backup of the database. A failed migration leaves the old database untouched and shows a recovery screen.
3. New columns on existing tables carry defaults (SQLite cannot add a NOT NULL column without one).
4. Event and ledger tables are **append-only**: `BEFORE UPDATE` and `BEFORE DELETE` triggers raise an error. Corrections are new compensating rows.
5. Array and object fields are stored as canonical JSON text and validated on write.
6. `ruleset_version`, `experiment` and `overlay_decision` rows are immutable once frozen (CN §10 integrity rules).
7. Android auto-backup is disabled for the database and key-value store (D-5). A restored database from another device must never be silently trusted.
- **Check.** Migration test: open each historical schema fixture, migrate, run integrity queries. Trigger test: attempt UPDATE and DELETE on append-only tables and expect failure.

### R10. Identifier and trace envelope **[N]**

Every domain event, decision and order carries the same envelope:

```
event_id    entity ID, prefixed ULID   e.g. dec_01J9Z...   (opaque; no business meaning)
corr_id     one per originating action (tap, scheduler tick, replay step); copied to every downstream row
cause_id    the event_id of the direct parent
seq         monotonic sequence within the run
sim_ts_utc / wall_ts_utc
actor_type  HUMAN | RULE | SCHEDULER | SYSTEM      actor_ref
device_id   random per install (not hardware-derived)
schema_version, ruleset_id, ruleset_hash, build_hash
```

- **Rules.**
  1. **Replay and experiment IDs are deterministic**: where a natural key exists (`UNIQUE (candidate_id, arm_id)`), that is the identity. Where one is needed, derive it by hashing `(experiment_id, arm_id, subject, as_of_ts, ruleset_hash)`.
  2. **Live and human-action IDs** are prefixed ULIDs built from the injected clock and the seeded generator (R6, R8), so replays are reproducible.
  3. **No arm identity** in any participant-visible ID or prefix (blinding, CN §4.5).
  4. **No personal data** in any ID.
  5. **Idempotency keys** for scheduled postings: `(job_type, instrument, business_date)`.
  6. A short **trace code** (last 8 characters of `corr_id`, Crockford base32) is shown on decision cards and in exported reports, so a user can quote it and a maintainer can find the whole chain.
  7. `audit_event` carries `prev_event_hash`; the chain is verified at app start. A broken chain opens a read-only integrity-warning state, never a silent continue.
- **Check.** Property test: for any order, one query on `corr_id` returns candidate → decision → order → ledger lines. Replay test: two runs produce identical IDs for deterministic classes.

### R11. Diagnostics without telemetry **[N]**

- **Rule.** A local, size-capped diagnostic log (errors, migration results, integrity-check results, trace codes, golden-vector status). It never leaves the device automatically. The user may export it, after seeing what it contains. Play's Android vitals provide crash and ANR statistics without extra SDKs [V].
- **Why.** EasyCTET's zero-telemetry stance left no way to tie a complaint to an action.
- **Check.** Force a crash and a failed migration in a test build; both appear in the exported log with a trace code.

---

## 6. Rule-book and content integrity

### R12. Signed, hashed, effective-dated rule data **[N]**

- **Rule.**
  1. Rule books, exposure maps, hypothesis registry, bundled datasets, **AI prompt templates and the synthesis verifier's rule list (R16)** are shipped as data files with a manifest: file hashes, version, effective date, and a detached signature (Ed25519 [D]-4). The public key is embedded; the private key never enters the repo or the build.
  2. The app verifies the signature and hashes at load. On failure it refuses to run experiment arms and shows which file failed.
  3. A frozen experiment stores the `manifest_hash` it was registered with. A run is valid only if the manifest hash still matches (CN §10).
  4. Content that SA marks *blocked*, *do not encode* or *unverified* (SA §5) cannot be marked active. The loader rejects a rule with evidence tag `[V]` or `[X]` in an active ruleset.
- **Why.** The experiment's credibility rests on "no hidden parameters, no post-hoc edits".
- **Check.** Tamper test: change one byte in each shipped data file; the app must refuse. CI lints rules against the evidence-tag policy.

### R13. Data-integrity tests run in CI, not by eye **[N]**

- **Rule.** Automated checks, failing the build on any error:
  - Every candidate, rule and exposure-map row validates against its schema.
  - Foreign keys resolve (`topic`/`taxonomy`/`instrument` IDs exist).
  - Convention sets are complete (no missing ayanamsa, nakshatra count, hora type, etc.; CN §6.1).
  - Calendar and holiday data have no gaps in the supported range.
  - Hash of each frozen file equals its manifest entry.
- **Why.** EasyCTET's spec mentions no such checks for 1,800 questions; a bad row there is an embarrassment, a bad rule here invalidates an experiment.

---

## 7. Privacy and security

### R14. Privacy and security baseline **[E] [N]**

1. **No login, no advertising ID, no contact, location or microphone permissions.** The manifest permission list is reviewed every release.
2. **Personal chart data** (consent-based, CN §6.6, §12) is computed on-device, stored encrypted, retained for a stated period, and deletable in one action. The **owner's own chart** may always be included in AI fact packs (D-11); each such use is recorded in the audit chain and the allowlist entry (R5) states that chart data may be sent. **Any other person's chart** is excluded from every AI fact pack unless that person's explicit consent is recorded for that use, with the exact payload shown before it is sent. The Data Safety form and privacy policy must match what the app actually does.
3. **No secrets in the binary.** No admin PIN, no override code, no private key. **Data-provider and AI API keys are user-supplied at first run and held in Android Keystore (for example `expo-secure-store`); they never appear in the binary, repo, logs, exports or the diagnostic.** Debug and QA overrides exist only in builds where `extra.buildProfile !== 'production'`, enforced at compile time. They are never a runtime fallback (EasyCTET's "Play Services unreachable → sandbox" pattern is not allowed).
4. **Screen protection.** `FLAG_SECURE` is applied during blinded experiment screens so arm labels are not captured, and is off for reports the user may share.
5. **Exports** (journal, diagnostics, reports) contain no birth data unless the user explicitly includes it.
- **Check.** Manifest diff against the approved permission list. Binary scan for strings matching known override codes **and for API-key patterns**. Review of the Data Safety form against the allowlist (R5). Export and log scan confirms no key material.

---

## 7A. AI synthesis layer

AI is a **synthesiser only**. Code collects, parses, validates and computes. AI turns an already-verified result into readable text. It never supplies a fact, a signal, a decision or a number. These rules make hallucination, context drift and silent summarisation detectable and blocked, rather than merely discouraged.

### R15. AI boundary **[N]**

- **Rule.**
  1. AI is downstream only. Its output never feeds signals, decisions, orders, the ledger, or any experiment arm. A lint or import boundary prevents any decision-path module from importing the AI module.
  2. AI performs no data collection and no analysis. Raw fetched text is parsed by code into typed fields; **raw source text never reaches the model**, which also removes the prompt-injection channel.
  3. The model has no tools, no browsing and no memory.
  4. AI output carries no evidence tag of its own. Evidence tags (`[C] [M] [H] [V] [R]`), reason codes and arm information are attached by code, and AI text must not reveal arm identity (CN §4.5).
  5. The model must not "recall" astrological, classical or market knowledge. Such content appears only when rendered from signed rule-book rows (R12).
- **Why.** The experiment is valid only if decisions are reproducible from code and data (R6 to R8). A model in the decision path would make them neither reproducible nor auditable.
- **Check.** Lint and dependency-graph test: no path from decision modules to the AI module. A run with AI disabled produces identical decisions, orders and ledger lines (hash compare).

### R16. Synthesis contract and verifier **[N]**

- **Rule.**
  1. **Fact pack in.** Code builds a closed, structured fact pack: fact IDs, values, units, `as_of`, source tag, evidence tag. The selection and ranking of facts is done in code by a stated rule; the model never chooses what to include or omit. Personal chart data follows R14.2: the owner's own chart is allowed, any other person's only with recorded consent.
  2. **Placeholders out.** The model emits structured text with placeholders (`{fact:<id>}`); code substitutes values. The model never types a number, date, ticker or name.
  3. **Stateless.** One call per artifact, a fresh prompt from a signed template (R12), no conversation history, no cross-call context. The exact model version is pinned and recorded. Low temperature is used, but is not relied on for determinism.
  4. **Deterministic verifier.** Before display, code checks: every cited fact ID exists in the pack; no digit, date or entity appears outside the pack; no banned phrase (advice, prediction, "will", "should buy/sell") appears; length and format are within bounds. The verifier is code, not another model.
  5. **Fallback.** On any verifier failure, timeout, missing network, missing key, or AI disabled, the app shows a **deterministic template rendering** of the same facts, labelled as such.
  6. **Facts always visible.** The full facts table is shown with the narrative, so an omission cannot hide.
  7. **Stated limit.** The verifier proves that numbers and entities came from the pack. It cannot prove the wording is a fair characterisation (for example "sharply"). **Default (provisional, owner to review later):** the model fills templated sentence frames with limited free text, and qualitative words such as "sharply" or "unusually" are allowed only from a code-defined list tied to a numeric threshold. This trades some fluency for fewer unverifiable claims.
- **Why.** Closed input, substituted values and a code verifier turn "do not hallucinate" into a checkable property.
- **Check.** Golden fixtures (fixed fact packs with expected verifier outcomes). Adversarial-output tests: invented number, wrong ticker, advice phrase, uncited claim, entity outside the pack, all rejected. A number-audit test traces every numeral in a rendered artifact to a fact ID.

### R17. AI provenance and storage **[N]**

- **Rule.** Every AI artifact is stored as an immutable row with: `model_id`, `prompt_template_hash`, `fact_pack_hash`, `output_hash`, verifier result, `corr_id` and trace code (R10), in the audit chain. Replays and reports display the **stored** artifact; they never regenerate it. A regenerated artifact is a new row with a new ID.
- **Why.** Providers retire or change model versions and sampling is not exactly repeatable. The stored artifact, not the model, is the record.
- **Check.** Replay a stored run: artifact bytes and hashes are unchanged and no AI network call occurs. Tamper with a stored artifact: the audit chain fails verification.

---

## 8. On-device diagnostic (first run and Settings)

Carried from EasyCTET's pre-payment diagnostic, extended **[E] [N]**:

| Check | Pass condition |
|---|---|
| Fonts | Devanagari and IAST glyphs render (no missing-glyph boxes) |
| SQLite | Create, write, read, WAL and trigger behaviour (R9) |
| Golden vectors | All R7 vectors match |
| Manifest | Signature and hashes verify (R12) |
| Clock | Time zone and clock-change test; reports current offset |
| Viewport | Layout holds at 140% font scale |
| Audit chain | Chain verifies (R10) |
| Synthesis verifier | Golden verifier fixtures pass on device (R16) |
| Keys and network | Keys present in Keystore (presence only, never shown); allowlisted hosts reachable or reported offline |

The result is stored locally and appears in exported diagnostics (R11).

---

## 9. Build and CI hygiene **[E]**

1. `npm ci` must pass: `package.json` and the lockfile are in sync (never edit versions without `npm install`).
2. `npx expo-doctor` must report no issues. Record the check count it prints at that time rather than assuming "21/21".
3. `.easignore` excludes `android/`, `ios/`, `node_modules/`, `.expo/`, `dist/`, `web-build/`, `*.log`, plus this project's large source datasets and the `Study-docs/` folder.
4. Builds run from a clean checkout in CI. Local-only builds are for development.
5. Release artifacts are signed with the release key held outside the repo. Debug-signed builds are never distributed to testers who might later receive the release build (the `INSTALL_FAILED_UPDATE_INCOMPATIBLE` case).

**Pipeline order:** lint → type-check → unit tests → golden vectors → data-integrity tests (R13) → synthesis verifier and AI-boundary tests (R15, R16) → `expo-doctor` → size budget (R3) → build preview → on-device diagnostic (§8) → manual UAT (§11).

---

## 10. UX defensive rules **[E]**

- **Two-layer layout defence.** Layer 1: concise labels. Layer 2: `flexWrap: 'wrap'`, `gap`, `flexShrink: 0` on fixed labels, `flex: 1` on title blocks beside buttons.
- Test at 140% font scale and at a narrow viewport (about 360 dp).
- Mandatory persistent banner on all trading screens: **"Virtual money. Not investment advice."**
- Reason codes and evidence tags (`[C] [M] [H] [V] [R]`) are visible next to every astro-derived signal, so a user cannot mistake a modern convention for a classical rule.

---

## 11. Verification

### 11.1 Hardware battery (per release candidate)

| ID | Test | Pass criteria |
|---|---|---|
| T1 | Airplane-mode cold start; run a full replay session and view the report | No network error, no infinite spinner, all replay features work |
| T1b | Airplane-mode cold start; open live-paper, event data and an AI-synthesised view | Clear "no network, last data as of X" state; no spinner, no fabricated data; AI views show the template fallback (R5, R16) |
| T2 | Kill the process mid-session (swipe away; also battery-pull equivalent via `adb shell am force-stop`) | Session, ledger and run state restore exactly; audit chain verifies |
| T3 | Clock tampering: change device time and time zone mid-session | No decision changes (R6); a warning is logged |
| T4 | Golden vectors on device (§8) | 100% match on each test device |
| T5 | Migration from each prior schema fixture | Data preserved, integrity checks pass |
| T6 | Two-device matrix: stock Android (Pixel-class) and an OEM skin (One UI / MIUI-class); add one low-RAM device [D] | No startup exception; layout holds at 140% font scale |
| T7 | Soft keyboard and insets on every input screen | No obscured actions, no clipped labels |
| T8 | Reset flow: "Reset local data" | Run history, journal and imported data cleared; consent record and rule books handled as specified |
| T9 | Network instrumented run | Outbound hosts equal the allowlist (R5) |
| T10 | Synthesis verifier, adversarial outputs (invented number, wrong ticker, advice phrase, uncited claim, entity outside the pack) | Every one rejected; template fallback shown; failure logged with trace code (R16) |
| T11 | Install provenance: record `versionCode`, `lastUpdateTime`, signing certificate digest of the installed build before testing | Matches the intended artifact |
| T12 | AI disabled (setting off, key removed, host unreachable) | Full app works; decisions, orders and ledger identical to an AI-on run; template text shown (R15, R16) |
| T13 | Stored-artifact replay | Artifacts and hashes unchanged; no AI network call during replay (R17) |

Before any test, verify binary provenance (EasyCTET's Pixel 8 lesson):

```bash
adb shell dumpsys package <package.id> | grep -E "versionCode|lastUpdateTime"
adb uninstall <package.id>      # before installing a differently signed build
adb logcat -d -b crash          # first stop for a cold-start crash
```

### 11.2 Test-case register

- Use IDs of the form `TC-<AREA>-<nn>` (areas: `DET`, `LEDGER`, `RULES`, `NET`, `PRIV`, `UI`, `MIG`, `STORE`).
- Each test case records: build `versionCode`, device, OS version, tester, date, result, evidence file name.
- "100% passed" in a release note must cite the register and the number of distinct devices.

### 11.3 Evidence retention

Keep for each release: the register export, golden-vector output, `expo-doctor` output, size report, network-allowlist diff, and the signed manifest hash. Store under `docs/releases/<versionCode>/`.

---

## 12. Release gate

A release candidate is promoted only if **all** are true:

- [ ] R1: `production` config has no ABI restriction (script output attached).
- [ ] R2: SDK levels re-verified; `sdk-levels.json` updated.
- [ ] R3: size budgets met; large-asset delivery paths named.
- [ ] R4: no dev-client; native-deps list current; cold start passed on two devices.
- [ ] R5: allowlist diff reviewed; replay passes in airplane mode.
- [ ] R6 to R8: lint clean; golden vectors pass on device; seeded replay reproduces stored decisions.
- [ ] R9: migration and append-only trigger tests pass.
- [ ] R10: trace-chain and replay-ID tests pass; audit chain verifies.
- [ ] R12: manifest signature verifies; tamper test refuses; no `[V]`/`[X]` rule is active.
- [ ] R13: data-integrity tests pass.
- [ ] R14: permission list unchanged or approved; no override code or API key in the binary.
- [ ] R15 to R17: AI-boundary test passes; verifier adversarial tests pass; AI-disabled run matches; stored artifacts replay unchanged.
- [ ] T1, T1b and T2 to T13 recorded in the register.

---

## 13. Regulatory and store policy: out of scope

This app is a **private research tool**, not a distributed product. Store-policy, financial-regulation and privacy-law compliance are deliberately out of scope for this runbook. If the app is ever published or shared beyond the owner, this section must be written first, before any release.

What stays in force regardless, because it protects the experiment, not a regulator:

- The "Virtual money. Not investment advice." banner (§10) and the evidence tags on every astro signal.
- No secrets or override codes in the binary (R14.3).
- Personal chart data, if any is entered, stays on the device and is deletable (R14.2).

## 14. Decisions

D-1 to D-8 closed by the owner on 2026-10-13 ("all recommended"). D-9 to D-11 closed the same day when the owner directed that the network-and-AI requirement overrides conflicting earlier wording. D-12 is a provisional default pending owner review.

| # | Decision | Outcome |
|---|---|---|
| D-1 | Framework | **Expo / React Native**, to reuse this runbook and the TypeScript astro engine (CN §6.7) |
| D-2 | Low-RAM test device in the hardware matrix | **Yes**: one 2-3 GB device |
| D-3 | ID library | **Own small implementation** (seeded RNG and injected clock required, R10) |
| D-4 | Rule-book signing and key custody | **Ed25519**; private key kept offline; rotate by app update |
| D-5 | Auto-backup | **Disabled** for database and key-value store; explicit export offered |
| D-6 | Multi-device participants | **Provide for it**: a random per-install `device_id` (not hardware-derived) is part of the R10 envelope from the first schema, so adding a second device later needs no migration |
| D-7 | Where heavy statistics run | **Desktop** for bootstrap and permutation tests; the device shows results |
| D-8 | Monetisation | **None** (private research use) |
| D-9 | AI role and placement | **Synthesiser only**, run on the device at runtime through an allowlisted host, with deterministic template fallback. Code does all collection and computation. Desktop remains for heavy statistics only (D-7) |
| D-10 | API key custody | **User-supplied, held in Android Keystore.** No keys in the binary, repo, logs or exports; no proxy |
| D-11 | Personal chart data in AI fact packs | **Owner's own chart: always allowed** (each use audited). **Any other person's chart: excluded** unless that person's explicit consent is recorded for the use, with payload preview (R14.2) |
| D-12 | Verifier wording limit (R16.7) | **Provisional default:** templated sentence frames, qualitative words only from a code-defined threshold list. Owner to review later |

---

## 15. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-13 | Initial draft, adapted from EasyCTET runbook and SSD v3 review. Adds R5 to R14. Not yet exercised on a build. |
| 0.2 | 2026-10-13 | Owner decisions: Expo/React Native confirmed (D-1); regulatory and store policy out of scope, §13 replaced; Play pre-launch test and listing checks removed. |
| 0.3 | 2026-10-13 | All open decisions closed with the recommended options (§14); `device_id` added to the R10 envelope. |
| 0.4 | 2026-10-13 | Network and AI declared required. §1 Network row reworded (replay-offline is a test property) and AI row added. R5 gains failure semantics, AI host entry, snapshot ordering and a capture method. R6 defines `as_of_ts` for live-paper. R12 covers prompt templates and verifier rules. R14.2 and R14.3 amended (AI consent, user-supplied Keystore keys). New §7A with R15 (AI boundary), R16 (synthesis contract and verifier), R17 (provenance). §8 diagnostic, §9 pipeline, §11 tests (T1b, T10, T12, T13) and §12 gate extended. D-9 to D-11 added. R9.7 dead "or scoped" text removed; T10 gap filled. |
| 0.5 | 2026-10-13 | D-11 changed by owner: own chart always allowed in AI fact packs (audited); other people's charts still need recorded consent (R14.2, R16.1). R16.7 given a provisional default and recorded as D-12 for later owner review. |

### Items intentionally not inherited from EasyCTET

- Hardcoded admin PIN and runtime "sandbox" fallback (security).
- The `targetSdkVersion: 35` vs. `36` inconsistency (R2).
- The "zero external network requests" absolute (R5).
- Test steps referring to on-device TTS (removed in EasyCTET v2, but the runbook text was not updated).
- "Eliminates 100% of refund requests" style claims; test results are reported with the register and device count (§11.2).
