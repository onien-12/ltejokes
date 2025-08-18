import os
import re
import time
import requests
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup

BASE_URL = "https://www.etsi.org/deliver/etsi_ts/"
OUTPUT_DIR = "etsi_ts"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
MAX_WORKERS = 8
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT})

visited_dirs = set()
file_links = []


def fetch_html(url):
    try:
        r = SESSION.get(url, timeout=20)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    except requests.RequestException as e:
        print(f"[ERROR] Failed to fetch {url}: {e}")
        return None


def crawl_directory(url):
    if url in visited_dirs:
        return
    visited_dirs.add(url)

    soup = fetch_html(url)
    if not soup:
        return

    for link in soup.find_all("a", href=True):
        href = link["href"]
        full_url = urljoin(url, href)

        if href in ("../", "./"):
            continue

        print(href)

        if href.endswith("/") and not href.endswith("deliver/"):
            crawl_directory(full_url)
        elif re.search(r"\.(pdf|zip)$", href, re.IGNORECASE):
            file_links.append(full_url)


def download_file(url):
    try:
        rel_path = urlparse(url).path.lstrip("/")
        local_path = os.path.join(OUTPUT_DIR, rel_path.replace("deliver/", ""))
        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        r = SESSION.get(url, stream=True, timeout=60)
        r.raise_for_status()
        with open(local_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)

        print(f"[OK] {url}")
    except requests.RequestException as e:
        print(f"[FAIL] {url}: {e}")


def main():
    start = time.time()
    crawl_directory(BASE_URL)

    print(f"[*] Found {len(file_links)} files. Starting downloads...")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(download_file, url) for url in file_links]
        for _ in as_completed(futures):
            pass

    elapsed = time.time() - start
    print(f"[*] Done in {elapsed:.2f} seconds.")


if __name__ == "__main__":
    main()
