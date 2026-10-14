"""QA viewport capture — CureHub rebrand (TEST ONLY, no app code).
Deletes nothing; captures 23 viewport PNGs (21x 1440x900 + 2x 390x844)
with Playwright chromium headless, full_page=False (explicit viewport crop).
- SuperAdmin demo session via add_init_script localStorage hub.auth/hub.role
- guest (no auth, light) for public + login/signup + landing-mobile
- dark via hub.theme=dark + documentElement data-theme=dark
- asserts 'CureHub' visible in page content for every route (rebrand gate).
Usage: python test_capture_viewport_qa.py
"""
import time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5173/"
SHOT_DIR = r"D:\API\Hospital Management System\screenshots"

AUTH_JS = (
    'localStorage.setItem("hub.auth", JSON.stringify('
    '{"name":"QA SuperAdmin","role":"SuperAdmin","centralId":"CENT-001"}));'
    'localStorage.setItem("hub.role", JSON.stringify("SuperAdmin"));'
    'localStorage.setItem("hub.theme", JSON.stringify("light"));'
)
DARK_JS = (
    'localStorage.setItem("hub.auth", JSON.stringify('
    '{"name":"QA SuperAdmin","role":"SuperAdmin","centralId":"CENT-001"}));'
    'localStorage.setItem("hub.role", JSON.stringify("SuperAdmin"));'
    'localStorage.setItem("hub.theme", JSON.stringify("dark"));'
    'document.documentElement.setAttribute("data-theme", "dark");'
)

# (filename, hash-route, context, extra_wait_s)
SHOTS = [
    ("01-landing-viewport.png", "#/", "guest", 0),
    ("02-hospitals-viewport.png", "#/hospitals", "guest", 0),
    ("03-hospital-detail-viewport.png", "#/hospitals/1", "guest", 0),
    ("04-doctors-viewport.png", "#/doctors", "guest", 0),
    ("05-patients-viewport.png", "#/patients", "staff", 0),
    ("06-patient-detail-viewport.png", "#/patients/CENT-001", "staff", 0),
    ("07-appointments-viewport.png", "#/appointments?hospitalId=1", "guest", 0),
    ("08-referrals-viewport.png", "#/referrals", "staff", 0),
    ("09-beds-viewport.png", "#/beds", "staff", 0),
    ("10-records-viewport.png", "#/records", "staff", 0),
    ("11-reports-viewport.png", "#/reports", "guest", 2),
    ("12-emergency-viewport.png", "#/emergency", "guest", 0),
    ("13-schemes-viewport.png", "#/schemes", "guest", 0),
    ("14-login-viewport.png", "#/login", "guest", 0),
    ("15-signup-viewport.png", "#/signup", "guest", 0),
    ("16-dashboard-viewport.png", "#/dashboard", "staff", 2),
    ("17-profile-viewport.png", "#/profile", "staff", 0),
    ("18-settings-viewport.png", "#/settings", "staff", 0),
    ("19-help-viewport.png", "#/help", "guest", 0),
    ("20-landing-dark-viewport.png", "#/", "dark", 0),
    ("21-dashboard-dark-viewport.png", "#/dashboard", "dark", 2),
    ("22-landing-mobile-viewport.png", "#/", "guest-mobile", 0),
    ("23-dashboard-mobile-viewport.png", "#/dashboard", "staff-mobile", 0),
]

failures = []
ok = 0

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for fname, route, ctx, extra in SHOTS:
        mobile = ctx in ("guest-mobile", "staff-mobile")
        try:
            context = browser.new_context(
                viewport={"width": 390, "height": 844} if mobile else {"width": 1440, "height": 900},
                device_scale_factor=1,
                is_mobile=mobile,
                has_touch=mobile,
            )
            if ctx in ("staff", "staff-mobile"):
                context.add_init_script(script=AUTH_JS)
            elif ctx == "dark":
                context.add_init_script(script=DARK_JS)
            page = context.new_page()
            page.goto(BASE + route, wait_until="domcontentloaded", timeout=30000)
            try:
                page.wait_for_load_state("networkidle", timeout=12000)
            except Exception:
                pass
            time.sleep(2.6 + extra)
            # CureHub rebrand gate: brand must be in rendered page
            body_text = page.evaluate("() => document.body ? document.body.innerText : ''")
            title_text = page.title()
            if "CureHub" not in body_text and "CureHub" not in title_text:
                failures.append(f"{fname}: CureHub NOT found in rendered page {route} (ctx={ctx})")
            # No ?next= redirect: final URL must still be the requested route
            final = page.url
            if route.split("?")[0] not in final:
                failures.append(f"{fname}: unexpected redirect {final} for {route}")
            page.screenshot(path=f"{SHOT_DIR}/{fname}", full_page=False)
            print(f"captured {fname} ctx={ctx} mobile={mobile}")
            ok += 1
            context.close()
        except Exception as e:  # noqa: BLE001 - QA harness must record, not crash
            failures.append(f"{fname}: EXCEPTION {type(e).__name__}: {e}")
    browser.close()

print(f"\nDONE ok={ok}/23 failures={len(failures)}")
for f in failures:
    print("FAIL:", f)
if failures:
    raise SystemExit(1)
