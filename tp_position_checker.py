"""
Daily Trustpilot category position checker.

Runs on VPS via cron and writes into category_position_history.
Uses the same Supabase project and optional PROXY_URL.
"""

import os
import random
import re
import time
from typing import Optional

import cloudscraper
from dotenv import load_dotenv
from supabase import Client, create_client


def get_env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def get_env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


def normalize_domain(domain: str) -> str:
    d = domain.strip().lower()
    return d[4:] if d.startswith("www.") else d


def extract_review_domains(html: str) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for match in re.finditer(r"/review/([a-z0-9.-]+)", html, flags=re.IGNORECASE):
        d = normalize_domain(match.group(1) or "")
        if not d or d in seen:
            continue
        seen.add(d)
        out.append(d)
    return out


def make_supabase() -> Client:
    load_dotenv()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY/SUPABASE_SERVICE_KEY are required")
    return create_client(url, key)


def make_scraper() -> cloudscraper.CloudScraper:
    scraper = cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "mac", "mobile": False}
    )
    proxy = os.getenv("PROXY_URL")
    if proxy:
        scraper.proxies = {"http": proxy, "https": proxy}
    return scraper


def fetch_with_retry(scraper: cloudscraper.CloudScraper, url: str, attempt: int = 1) -> str:
    response = scraper.get(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
            )
        },
        timeout=40,
    )
    if response.status_code == 429 and attempt <= 3:
        time.sleep(2 ** attempt)
        return fetch_with_retry(scraper, url, attempt + 1)
    response.raise_for_status()
    return response.text


def run() -> None:
    supabase = make_supabase()
    scraper = make_scraper()

    batch = get_env_int("TP_CHECK_BATCH", 50)
    max_pages = get_env_int("TP_CHECK_MAX_PAGES", 20)
    delay_min = get_env_float("TP_CHECK_DELAY_MIN", 2.0)
    delay_max = get_env_float("TP_CHECK_DELAY_MAX", 4.0)

    cards_resp = (
        supabase.table("monitored_cards")
        .select("*")
        .eq("is_active", True)
        .not_.is_("category_slug", "null")
        .not_.is_("country_code", "null")
        .limit(batch)
        .execute()
    )
    cards = cards_resp.data or []

    print(f"[tp_position_checker] cards={len(cards)}")
    for card in cards:
        card_id = card.get("id")
        domain = normalize_domain(str(card.get("domain") or ""))
        category_slug = str(card.get("category_slug") or "").strip()
        country_code = str(card.get("country_code") or "").strip().upper()
        if not card_id or not domain or not category_slug or not country_code:
            continue

        total_scanned = 0
        position: Optional[int] = None

        for page in range(1, max_pages + 1):
            url = (
                f"https://www.trustpilot.com/categories/"
                f"{category_slug}?country={country_code}&page={page}"
            )
            try:
                html = fetch_with_retry(scraper, url)
            except Exception as exc:  # noqa: BLE001
                print(f"[tp_position_checker] card={card_id} fetch error: {exc}")
                break

            domains = extract_review_domains(html)
            if not domains:
                break

            idx = domains.index(domain) if domain in domains else -1
            if idx >= 0:
                position = total_scanned + idx + 1
                total_scanned += len(domains)
                break

            total_scanned += len(domains)
            time.sleep(random.uniform(delay_min, delay_max))

        rating_at_check = None
        reviews_at_check = None
        domain_id = card.get("domain_id")
        if domain_id:
            dom_resp = (
                supabase.table("domains")
                .select("rating,reviews_count")
                .eq("id", domain_id)
                .maybe_single()
                .execute()
            )
            dom = dom_resp.data or {}
            if dom.get("rating") is not None:
                rating_at_check = float(dom["rating"])
            if dom.get("reviews_count") is not None:
                reviews_at_check = int(dom["reviews_count"])

        insert_resp = (
            supabase.table("category_position_history")
            .insert(
                {
                    "card_id": card_id,
                    "category_slug": category_slug,
                    "country_code": country_code,
                    "position": position,
                    "total_scanned": total_scanned,
                    "rating_at_check": rating_at_check,
                    "reviews_at_check": reviews_at_check,
                    "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
            )
            .execute()
        )
        if getattr(insert_resp, "error", None):
            print(f"[tp_position_checker] card={card_id} insert error: {insert_resp.error}")
        else:
            print(f"[tp_position_checker] card={card_id} position={position} scanned={total_scanned}")


if __name__ == "__main__":
    run()

