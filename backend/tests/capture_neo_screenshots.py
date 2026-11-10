import os
import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(line_buffering=True)

def capture():
    os.makedirs("docs/screenshots", exist_ok=True)
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=edge_path, headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        # 1. Landing Page
        print("Capturing Landing Page...", flush=True)
        page.goto("http://localhost:5173/", wait_until="domcontentloaded")
        time.sleep(2)
        page.screenshot(path="docs/screenshots/landing_page_neo_brutalist.png", full_page=True)
        print("Saved docs/screenshots/landing_page_neo_brutalist.png", flush=True)
        
        # 2. Design System Showcase
        print("Capturing Design System Page...", flush=True)
        page.goto("http://localhost:5173/design", wait_until="domcontentloaded")
        time.sleep(1.5)
        page.screenshot(path="docs/screenshots/design_system_neo_brutalist.png", full_page=True)
        print("Saved docs/screenshots/design_system_neo_brutalist.png", flush=True)
        
        # 3. About Page
        print("Capturing About Page...", flush=True)
        page.goto("http://localhost:5173/about", wait_until="domcontentloaded")
        time.sleep(1)
        page.screenshot(path="docs/screenshots/about_page_neo_brutalist.png", full_page=True)
        print("Saved docs/screenshots/about_page_neo_brutalist.png", flush=True)

        # 4. Mobile Viewport (Landing Page)
        print("Capturing Mobile Viewport...", flush=True)
        mobile_page = browser.new_page(viewport={"width": 390, "height": 844})
        mobile_page.goto("http://localhost:5173/", wait_until="domcontentloaded")
        time.sleep(1.5)
        mobile_page.screenshot(path="docs/screenshots/landing_page_mobile.png", full_page=True)
        print("Saved docs/screenshots/landing_page_mobile.png", flush=True)
        
        browser.close()
        print("All screenshots successfully captured!", flush=True)

if __name__ == "__main__":
    capture()
