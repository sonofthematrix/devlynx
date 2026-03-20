# DevLynx AI – Upgrade Flow Simulation Report

Simulated the full upgrade path and checked for UI bugs, trial counter issues, storage consistency, and license verification errors.

---

## 1. Flow steps (simulated)

### Step 1: User installs extension

- **Background:** `chrome.runtime.onInstalled` runs; sets `devlens_show_pin_hint`; creates context menu (Explain element, Ask AI, etc.).
- **Panel (first open):** `DOMContentLoaded` → `ensureTrialInitialized()` → `getTrialState()` returns no `installId` → sets `trialInstallId` (UUID) and `trialUsesRemaining: 20` in `chrome.storage.local`.
- **Then:** `getPlan()` → `'free'` (no key yet), `applyPlanUI('free')`, `updateTrialUI()` → shows "Free trial: 20 uses remaining", upgrade box visible, Go Pro button shown.

**Result:** Trial is initialized with 20 uses on first panel open. No bug.

---

### Step 2: Trial initialized with 20 uses

- `ensureTrialInitialized()` only sets 20 when `!installId`. Once `trialInstallId` exists, it does not overwrite `trialUsesRemaining`.
- If `installId` exists but `remaining === null` (e.g. user cleared only `trialUsesRemaining`), code sets `trialUsesRemaining` to 0 (reset detection).

**Result:** 20 uses and reset detection behave as intended.

---

### Step 3: User consumes trial uses

- **Explain Element:** User clicks "Start explain mode" → `canUseProTrialFeature()` → license not valid, `ensureTrialInitialized()`, `getTrialUsesRemaining()` → e.g. 19 → `{ allow: true }`. After AI success, panel receives `ELEMENT_EXPLAIN_RESULT` with `message.success === true` → `decrementTrialUse()` → `setTrialUsesRemaining(current - 1)` (guarded so it never goes below 0), then `updateTrialUI()`.
- **Error Explainer:** Same gate; on success (`data.success === true`) → `decrementTrialUse()` and `updateTrialUI()`.

**Result:** Trial decrements only on successful AI use; no decrement on server/network/AI failure. No bug.

---

### Step 4: Trial reaches 0

- When `getTrialUsesRemaining()` returns 0, `canUseProTrialFeature()` returns `{ allow: false, message: TRIAL_ENDED_MESSAGE }`.
- Explain Element / Error Explainer: status set to trial-ended message, `showUpgradeModal()` called.
- `updateTrialUI()` shows "Trial ended – Go Pro to continue using AI features." and adds class `trial-ended`.

**Result:** At 0 uses, PRO features are blocked and upgrade modal is shown. No bug.

---

### Step 5: Upgrade modal appears

- Modal is shown via `showUpgradeModal()` (adds `active`, `aria-hidden="false"` to `#upgrade-modal`).
- Content: "Trial ended", "Upgrade to DevLynx Pro to continue using:", list (AI Explain Element, Error Explainer), buttons "Upgrade to Pro" and "Maybe later".
- **Fix applied:** Upgrade modal backdrop now closes the modal (same as API key modal). Previously only "Maybe later" closed it.

**Result:** Modal displays correctly; backdrop close improves UX.

---

### Step 6: Upgrade button opens Gumroad URL

- Footer `#goProBtn` and modal `#upgrade-modal-btn` both call `openPricingUrl()`.
- `openPricingUrl()`: `chrome.tabs.create({ url: GUMROAD_URL })` with `GUMROAD_URL = 'https://jcdreamz.gumroad.com/l/devlynx-ai'`, then `hideUpgradeModal()`.

**Result:** Both buttons open the correct Gumroad URL and close the modal. No bug.

---

### Step 7: User verifies license in Options

- User opens extension Options (browser UI), enters license key, clicks "Verify with server".
- `fetch(VERIFY_URL, { method: 'POST', body: JSON.stringify({ license_key: key }) })` → server returns `{ ok: true, type: 'gumroad'|'dev'|'developer' }`.
- On success: `chrome.storage.local.set({ [PLAN_STORAGE_KEY]: 'pro', [LICENSE_KEY_STORAGE_KEY]: key, [LICENSE_VERIFIED_AT_KEY]: Date.now() })`, then UI shows "License valid. Pro features are now enabled." (or developer message).
- Save button only stores the key; it does **not** set plan to Pro. Pro is set only after successful "Verify with server".

**Result:** License verification and storage update are correct. No verification bug.

---

### Step 8: Plan switches to Pro

- When Options sets `devlens_plan` to `'pro'`, any open panel receives `chrome.storage.onChanged` (area `local`, `PLAN_STORAGE_KEY`).
- Handler runs `applyPlanUI(plan2)` with `plan2 === 'pro'` → upgrade box hidden (or styled for Pro), `updateTrialUI()`.
- `updateTrialUI()`: `getPlan()` → `'pro'` → trial status element hidden, text cleared, `updateStatusBar()`.
- If the panel was closed, next open: `DOMContentLoaded` → `getPlan()` → `'pro'` → `applyPlanUI('pro')` and `updateTrialUI()` → same UI state.

**Result:** Plan switch to Pro is reflected in panel and status bar. No bug.

---

### Step 9: Trial limits are removed

- `licenseValid()` returns `(await getPlan()) === 'pro'` → true.
- `canUseProTrialFeature()` returns `{ allow: true }` without checking trial count; no decrement on use.
- Explain Element and Error Explainer run without trial gating; `decrementTrialUse()` is not called when `licenseValid()` is true.

**Result:** Pro users have no trial limit. No bug.

---

## 2. Bugs and UX issues

| # | Severity | Item | Status |
|---|----------|------|--------|
| 1 | **UX** | Upgrade modal could not be closed by clicking the backdrop (only "Maybe later"). | **Fixed:** Backdrop of `#upgrade-modal` now calls `hideUpgradeModal` on click. |
| 2 | **Low** | No direct link from panel to Options. After buying on Gumroad, user must open Options via browser (e.g. right‑click icon → Options). | Optional improvement: add "Enter license key" in modal or footer that calls `chrome.runtime.openOptionsPage()`. |

No other bugs found in the simulated flow.

---

## 3. Checks performed

- **UI:** Trial line, status bar plan, upgrade box visibility, modal show/hide, and both upgrade buttons behave correctly through install → trial use → trial ended → verify → Pro.
- **Trial counter:** Initialized to 20; decremented only on successful AI (Explain Element and Error Explainer); never goes below 0; reset detection (installId present, remaining missing) sets remaining to 0.
- **Storage:** `devlens_plan`, `devlens_license_key`, `devlens_license_verified_at`, `trialUsesRemaining`, `trialInstallId` read/written consistently; `onChanged` keeps panel in sync when Options updates plan.
- **License verification:** Options only sets Pro after server returns `ok: true`; Save does not set Pro; Clear resets plan and key; panel and status bar reflect Pro/Free from storage.

---

## 4. Summary

- Full upgrade flow (install → trial 20 → consume → 0 → modal → Gumroad → verify in Options → Pro → no trial limit) is consistent and correct.
- One UX fix applied: upgrade modal closes on backdrop click.
- One optional improvement: link from panel to Options for entering the license key after purchase.
