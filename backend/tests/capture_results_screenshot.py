import os
import sys
import time
import requests
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(line_buffering=True)

def run():
    video_path = os.path.abspath("backend/tests/squat_clip_15s.mp4")
    print(f"Uploading {video_path} to backend...", flush=True)
    
    with open(video_path, "rb") as f:
        res = requests.post("http://localhost:7860/analyze", files={"video": ("squat_clip_15s.mp4", f, "video/mp4")})
    
    if res.status_code != 200:
        print(f"Upload failed: {res.text}", flush=True)
        return
        
    job_id = res.json()["job_id"]
    print(f"Job created: {job_id}. Waiting for completion...", flush=True)
    
    for _ in range(60):
        status_res = requests.get(f"http://localhost:7860/jobs/{job_id}").json()
        status = status_res.get("status")
        progress = status_res.get("progress", 0)
        print(f"Status: {status} ({progress*100:.0f}%) - {status_res.get('status_message', '')}", flush=True)
        if status == "done":
            break
        if status == "failed":
            print(f"Job failed: {status_res.get('error_reason')}", flush=True)
            return
        time.sleep(2)
        
    print(f"Job {job_id} complete! Launching browser for screenshot...", flush=True)
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=edge_path, headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        url = f"http://localhost:5173/results/{job_id}"
        print(f"Navigating to {url}...", flush=True)
        page.goto(url, wait_until="domcontentloaded")
        time.sleep(3) # Wait for bento tiles and charts to render
        
        os.makedirs("docs/screenshots", exist_ok=True)
        page.screenshot(path="docs/screenshots/results_page_neo_brutalist.png", full_page=True)
        print("Saved docs/screenshots/results_page_neo_brutalist.png!", flush=True)
        browser.close()

if __name__ == "__main__":
    run()

