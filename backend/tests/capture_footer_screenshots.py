import os
import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(line_buffering=True)

def run():
    os.makedirs("docs/screenshots", exist_ok=True)
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=edge_path, headless=True)
        
        # Connect to active Vite port
        base_url = "http://localhost:5174"
        try:
            import urllib.request
            urllib.request.urlopen("http://localhost:5174", timeout=2)
        except Exception:
            base_url = "http://localhost:5173"
            
        print(f"Connecting to {base_url}...", flush=True)

        # -------------------------------------------------------------
        # 1. Desktop Viewport (1440 x 900)
        # -------------------------------------------------------------
        print("Capturing Desktop Footer (1440x900)...", flush=True)
        desktop_page = browser.new_page(viewport={"width": 1440, "height": 900})
        desktop_page.goto(f"{base_url}/", wait_until="domcontentloaded")
        time.sleep(2)
        
        footer = desktop_page.locator("footer")
        footer.scroll_into_view_if_needed()
        time.sleep(1.5)
        
        # Verify content
        h2_text = footer.locator("h2").inner_text().replace("\n", "").replace("\xa0", " ").upper()
        print(f"Extracted Credit Name: {h2_text}", flush=True)
        assert "@CHIRANTH MG" in h2_text
        print("✓ Verified display text '@Chiranth MG' rendered in uppercase via CSS", flush=True)
        
        desktop_page.screenshot(path="docs/screenshots/footer_credit_desktop_full.png", full_page=True)
        footer.screenshot(path="docs/screenshots/footer_credit_desktop.png")
        print("Saved docs/screenshots/footer_credit_desktop.png", flush=True)
        desktop_page.close()

        # -------------------------------------------------------------
        # 2. iPhone 14 Viewport (390 x 844)
        # -------------------------------------------------------------
        print("Capturing iPhone 14 Footer (390x844)...", flush=True)
        iphone_page = browser.new_page(
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
        )
        iphone_page.goto(f"{base_url}/", wait_until="domcontentloaded")
        time.sleep(2)
        
        iphone_footer = iphone_page.locator("footer")
        iphone_footer.scroll_into_view_if_needed()
        time.sleep(1.5)
        
        overflow_x = iphone_page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        assert not overflow_x, "Horizontal overflow detected on iPhone 14!"
        print("✓ Zero horizontal overflow on iPhone 14 (390px)", flush=True)

        iphone_page.screenshot(path="docs/screenshots/footer_credit_iphone14_full.png", full_page=True)
        iphone_footer.screenshot(path="docs/screenshots/footer_credit_iphone14.png")
        print("Saved docs/screenshots/footer_credit_iphone14.png", flush=True)
        iphone_page.close()

        # -------------------------------------------------------------
        # 3. Pixel 7 Viewport (412 x 915)
        # -------------------------------------------------------------
        print("Capturing Pixel 7 Footer (412x915)...", flush=True)
        pixel_page = browser.new_page(
            viewport={"width": 412, "height": 915},
            device_scale_factor=2.625,
            is_mobile=True,
            has_touch=True,
        )
        pixel_page.goto(f"{base_url}/", wait_until="domcontentloaded")
        time.sleep(2)
        
        pixel_footer = pixel_page.locator("footer")
        pixel_footer.scroll_into_view_if_needed()
        time.sleep(1.5)

        pixel_page.screenshot(path="docs/screenshots/footer_credit_pixel7_full.png", full_page=True)
        pixel_footer.screenshot(path="docs/screenshots/footer_credit_pixel7.png")
        print("Saved docs/screenshots/footer_credit_pixel7.png", flush=True)
        pixel_page.close()

        # -------------------------------------------------------------
        # 4. Strict 360px Ultra-Narrow Viewport Audit
        # -------------------------------------------------------------
        print("Running 360px Ultra-Narrow Overflow Audit...", flush=True)
        narrow_page = browser.new_page(viewport={"width": 360, "height": 740})
        narrow_page.goto(f"{base_url}/", wait_until="domcontentloaded")
        time.sleep(2)
        
        narrow_footer = narrow_page.locator("footer")
        narrow_footer.scroll_into_view_if_needed()
        time.sleep(1)
        
        scroll_w = narrow_page.evaluate("() => document.documentElement.scrollWidth")
        client_w = narrow_page.evaluate("() => window.innerWidth")
        print(f"360px Audit: scrollWidth={scroll_w}, innerWidth={client_w}", flush=True)
        assert scroll_w <= client_w, f"Horizontal overflow! scrollWidth={scroll_w} > innerWidth={client_w}"
        print("✓ PASSED: No horizontal overflow at 360px", flush=True)
        
        narrow_footer.screenshot(path="docs/screenshots/footer_credit_360px.png")
        narrow_page.close()

        browser.close()
        print("\nAll footer credit audits & screenshots successfully captured!", flush=True)

if __name__ == "__main__":
    run()
