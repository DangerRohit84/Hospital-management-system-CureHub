CureHub — Visual QA screenshots — VIEWPORT-ONLY (re-shot 2026-10-14 ~23:05 UTC, Playwright chromium headless, new CureHub branding)
Frontend: http://127.0.0.1:5173/ (Vite dev :5173, HashRouter) — 200 OK
Backend: http://127.0.0.1:8086 census {"hospitals":3,"doctors":6,"patients":8,"appointments":6,"referrals":2,"totalBeds":575,"occupiedBeds":322} (fresh DEMO-SEED)
Auth: SuperAdmin demo session via localStorage hub.auth (init_script) for staff routes; guest (no auth) for login/signup.

NOTE (2026-10-14 cleanup): Original full-page PNGs 01-landing.png … 23-dashboard-mobile.png
(1366px wide tall strips, fullPage:true) REMOVED. Folder now viewport-only:
23x *-viewport.png + this README.txt (24 files total).

VIEWPORT-ONLY SET (re-shot 2026-10-14 ~23:05 UTC, Playwright chromium headless, fullPage:false)
Method: test_capture_viewport_qa.py (in this folder, TEST ONLY) — python Playwright
sync_playwright, chromium headless. Desktop viewport 1440x900 dsf1
is_mobile=False; mobile viewport 390x844 dsf1 is_mobile=True has_touch=True. page.screenshot
full_page=False (explicit viewport crop, above-fold only — NOT full page). SuperAdmin demo
session {"name":"QA SuperAdmin","role":"SuperAdmin","centralId":"CENT-001"} via
context.add_init_script raw JS localStorage hub.auth/hub.role/hub.theme (present before React mounts);
guest context (no auth, theme light) for public routes + 14-login + 15-signup + 22 landing-mobile.
Dark via hub.theme dark + data-theme dark. Each: goto domcontentloaded + networkidle 12s + 2.6s (+2s charts for
reports/dashboard) then viewport screenshot. No ?next= redirect (final URL == requested).
Rebrand gate: harness asserts "CureHub" in rendered body/title for EVERY route — 23/23 PASS.
Source grep: "CureHub" 13 hits in frontend-react/src, "Govt Hospital Hub" 0 (fully rebranded).
Frontend: http://127.0.0.1:5173/ (HashRouter) 200 OK, title/meta CureHub. Backend: http://127.0.0.1:8086 census
hospitals=3 doctors=6 patients=8 (DEMO-SEED 3/6/8 intact).
Files (viewport-only, 23 PNGs):
01-landing-viewport.png — #/ — 1440x900 — hero above-fold
02-hospitals-viewport.png — #/hospitals — 1440x900 — search + first cards above-fold
03-hospital-detail-viewport.png — #/hospitals/1 — 1440x900 — AIIMS header + tabs above-fold
04-doctors-viewport.png — #/doctors — 1440x900 — filters + first cards above-fold
05-patients-viewport.png — #/patients — 1440x900 SuperAdmin — registry header + first rows
06-patient-detail-viewport.png — #/patients/CENT-001 — 1440x900 SuperAdmin — Asha header above-fold
07-appointments-viewport.png — #/appointments?hospitalId=1 — 1440x900 — wizard step 1 above-fold
08-referrals-viewport.png — #/referrals — 1440x900 SuperAdmin — kanban header above-fold
09-beds-viewport.png — #/beds — 1440x900 SuperAdmin — legend + first ward cards
10-records-viewport.png — #/records — 1440x900 SuperAdmin — gated form above-fold
11-reports-viewport.png — #/reports — 1440x900 — citizen cards above-fold
12-emergency-viewport.png — #/emergency — 1440x900 — 108/102/14555 cards above-fold
13-schemes-viewport.png — #/schemes — 1440x900 — Rs5L hero + KPIs above-fold
14-login-viewport.png — #/login guest — 1440x900 — split-screen above-fold
15-signup-viewport.png — #/signup guest — 1440x900 — onboard form above-fold
16-dashboard-viewport.png — #/dashboard — 1440x900 SuperAdmin — 6 KPIs above-fold
17-profile-viewport.png — #/profile — 1440x900 SuperAdmin — session header above-fold
18-settings-viewport.png — #/settings — 1440x900 SuperAdmin — theme/density above-fold
19-help-viewport.png — #/help — 1440x900 — FAQ search above-fold
20-landing-dark-viewport.png — #/ dark — 1440x900 SuperAdmin dark — hero dark tokens above-fold
21-dashboard-dark-viewport.png — #/dashboard dark — 1440x900 SuperAdmin dark — KPIs dark above-fold
22-landing-mobile-viewport.png — #/ mobile 390x844 — 390x844 — stacked hero above-fold
23-dashboard-mobile-viewport.png — #/dashboard mobile 390x844 — 390x844 SuperAdmin — KPIs above-fold
Total: 23 viewport PNGs, all exact viewport pixels (21x 1440x900 + 2x 390x844), fullPage:false.
Verified 2026-10-14 ~23:05 UTC via PIL: total 23, desk 21, mob 2, bad 0.
See .ai/reports/qa-report.md CureHub viewport re-shoot appendix 2026-10-14 ~23:05 UTC for verdict.
