# Free Trial System Audit – DevLynx AI

**Trial limit:** 20 uses  
**Storage key:** `trialUsesRemaining`  
**Scope:** Explain Element, Error Explainer (PRO features). Pro users (valid license) have unlimited use.

---

## 1. ensureTrialInitialized() runs on startup

**Requirement:** Run when the extension / panel starts.

**Implementation:**
- **Panel load:** `DOMContentLoaded` handler starts with `await ensureTrialInitialized()` (panel.js ~491).
- **Before gate:** `canUseProTrialFeature()` calls `await ensureTrialInitialized()` before reading remaining (panel.js ~351).
- **Before trial UI:** `updateTrialUI()` calls `await ensureTrialInitialized()` (panel.js ~475).

**Verdict:** ✅ **Pass.** Trial is initialized when the sidepanel opens and again when checking the gate or updating trial UI. Idempotent.

**Note:** Trial logic lives only in the sidepanel. If the user never opens the panel, initialization runs the first time they do. Background/service worker does not run `ensureTrialInitialized()`.

---

## 2. trialUsesRemaining is created if missing

**Requirement:** Ensure `trialUsesRemaining` exists in storage.

**Implementation in `ensureTrialInitialized()` (panel.js ~312–329):**
1. **No installId:** First run. Sets `trialInstallId` (new UUID) and `trialUsesRemaining = TRIAL_LIMIT` (20).
2. **InstallId present, remaining === null:** Reset detection (e.g. user deleted only `trialUsesRemaining`). Sets `trialUsesRemaining = 0` via `setTrialUsesRemaining(0)`.
3. **InstallId present, remaining a number:** No change.

**`getTrialUsesRemaining()`** (panel.js ~282–289): Returns `v` only when `typeof v === 'number' && v >= 0`; otherwise `null`. So missing or invalid value is treated as `null`, and the next `ensureTrialInitialized()` will create or fix it.

**Verdict:** ✅ **Pass.** New users get 20; reset (same installId, missing remaining) gets 0.

---

## 3. Trial never goes below 0

**Requirement:** Persisted value must not be negative.

**Implementation:**
- **Write path:** `setTrialUsesRemaining(n)` uses `Math.max(0, n)` (panel.js ~293). Only non‑negative values are stored.
- **Read path:** `getTrialUsesRemaining()` returns `null` if `v` is not a number or `v < 0` (panel.js ~286). So negative or invalid values are never “used” as a number.
- **Decrement:** `decrementTrialUse()` (panel.js ~332–336):
  - Reads `current = await getTrialUsesRemaining()`.
  - If `current === null || current <= 0`, returns without writing.
  - Otherwise calls `setTrialUsesRemaining(current - 1)` (so result is ≥ 0 when current ≥ 1).

**Verdict:** ✅ **Pass.** Storage never holds a negative value; logic never treats remaining as negative.

---

## 4. Trial UI updates correctly

**Requirement:** UI reflects current remaining and “trial ended” when 0.

**Implementation:**
- **`updateTrialUI()`** (panel.js ~461–488):
  - Pro: hides trial line, clears text, updates status bar.
  - Free: ensures trial initialized, reads `remaining`.
  - `remaining !== null && remaining > 0`: shows “Free trial: X use(s) remaining”, applies `.low-uses` when `< 5`, sets Go Pro button text.
  - Else: shows “Trial ended – Go Pro to continue using AI features.”, adds `.trial-ended`, sets button to “Upgrade to DevLynx Pro”.
- **When it runs:**
  - On panel load: `applyPlanUI(plan)` → `updateTrialUI()` (panel.js ~458, 495).
  - On plan change: `chrome.storage.onChanged` (PLAN_STORAGE_KEY) → `applyPlanUI()` → `updateTrialUI()` (panel.js ~506–511).
  - On trial change: `chrome.storage.onChanged` (TRIAL_STORAGE_KEY) → `updateTrialUI()` (panel.js ~512–514).
  - After decrement: Explain Element and Error Explainer both call `updateTrialUI()` after a successful use (panel.js ~770, 1133).

**Status bar:** `updateStatusBar()` is called from `updateTrialUI()` (panel.js ~487), so “Plan: Free (X trial uses)” / “Plan: Free (trial ended)” stays in sync.

**Verdict:** ✅ **Pass.** Trial line and status bar update on load, plan change, trial change, and after each successful PRO use.

---

## 5. canUseProTrialFeature() logic

**Requirement:** Pro → allow; trial remaining > 0 → allow; trial = 0 → block with the specified message.

**Implementation (panel.js ~345–360):**
1. If `licenseValid()` (plan === 'pro') → `return { allow: true }`.
2. `await ensureTrialInitialized()`.
3. `remaining = await getTrialUsesRemaining()`.
4. If `remaining !== null && remaining > 0` → `return { allow: true }`.
5. Else → `return { allow: false, message: TRIAL_ENDED_MESSAGE }`.

**Blocked message:**  
`TRIAL_ENDED_MESSAGE = 'Your free trial has ended. Upgrade to DevLynx Pro to continue using AI features.'` (panel.js ~36).

**Usage:** Explain Element and Error Explainer both call `canUseProTrialFeature()` before sending the request; on `!gate.allow` they set status to `gate.message || TRIAL_ENDED_MESSAGE` and show the upgrade modal (panel.js ~709–713, 1093–1097).

**Verdict:** ✅ **Pass.** Logic and message match the required behavior.

---

## 6. Decrement only on success

**Requirement:** Do not consume trial on server/request failure.

**Explain Element (panel.js ~765–770):**  
Decrements only when `message.success === true && !(await licenseValid())`. Success comes from the background after a successful server response. No decrement on failure or when already Pro.

**Error Explainer (panel.js ~1129–1134):**  
Decrements only after a successful `apiPost` path: no `result.error`, no `result.data.error`, and then `!(await licenseValid())`. No decrement in the `catch` or on error response.

**Verdict:** ✅ **Pass.** Trial is decremented only after a successful PRO use; failures do not consume trial.

---

## Summary table

| Check | Result |
|-------|--------|
| ensureTrialInitialized() on startup | ✅ Panel DOMContentLoaded + gate + updateTrialUI |
| trialUsesRemaining created if missing | ✅ New: 20; reset (installId, no remaining): 0 |
| Trial never below 0 | ✅ Math.max(0,n) on write; null/<=0 guarded on decrement |
| Trial UI updates | ✅ On load, plan change, trial change, after decrement |
| canUseProTrialFeature() | ✅ Pro → allow; remaining > 0 → allow; else block |
| Blocked message | ✅ Matches spec |
| Decrement only on success | ✅ Explain Element and Error Explainer both guard on success |

---

## Edge cases and notes

1. **Panel-only initialization**  
   Trial is initialized when the sidepanel is opened, not when the extension is installed. If the user uses Explain Element from the context menu without ever opening the panel, the background does not run trial logic; the panel runs it when it first loads (e.g. when opened by the background). So the first use from the panel will have already run `ensureTrialInitialized()` in that session.

2. **Concurrent use with 1 remaining**  
   If the user triggers Explain Element and Error Explainer at almost the same time with 1 use left, both can pass `canUseProTrialFeature()` (both see remaining === 1). Both may then decrement. Storage uses `Math.max(0, n)`, so you get 0, not -1. Possible outcome: two requests allowed for one “remaining” use. Acceptable for a client-side trial.

3. **Corrupt or invalid storage value**  
   If `trialUsesRemaining` is a string or negative, `getTrialUsesRemaining()` returns `null`. Then `canUseProTrialFeature()` blocks, and `updateTrialUI()` shows “Trial ended”. Next `ensureTrialInitialized()` (e.g. on next panel open): if installId exists and remaining === null, it sets 0. So behavior self-corrects.

4. **Error Explainer: “success” definition**  
   We decrement whenever the request does not return `result.error` or `result.data.error`. If the server returns 200 with an error message in `answer` (e.g. “OpenAI rate limit”), we still decrement. So “success” here means “we got a non-error response body”, not “AI gave a helpful answer”. Optional improvement: only decrement when the response clearly indicates a successful AI reply (e.g. a dedicated flag or status).

5. **No bugs found**  
   No logic errors found that break “trial limit = 20”, “trial never below 0”, or “blocked message as specified”. The only nuance is the “double use with 1 remaining” race and the optional stricter success check for Error Explainer.
