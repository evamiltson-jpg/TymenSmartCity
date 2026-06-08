import hashlib
import json
import logging
import re
import time
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"

TIU_NEWS_URL = "https://news.tyuiu.ru/"
UTMN_NEWS_URL = "https://www.utmn.ru/news/"
REQUEST_TIMEOUT = 25
MAX_TIU_NEWS = 8
MAX_UTMN_NEWS = 8

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
)

UTMN_MONTHS = {
    "янв": "01", "фев": "02", "мар": "03", "апр": "04", "май": "05", "мая": "05",
    "июн": "06", "июл": "07", "авг": "08", "сен": "09", "окт": "10", "ноя": "11", "дек": "12",
}
MONTHS_RU = {
    "01": "января", "02": "февраля", "03": "марта", "04": "апреля", "05": "мая", "06": "июня",
    "07": "июля", "08": "августа", "09": "сентября", "10": "октября", "11": "ноября", "12": "декабря",
}
RUSSIAN_MONTH_TO_NUM = {name: num for num, name in MONTHS_RU.items()}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def create_session() -> requests.Session:
    session = requests.Session()
    session.trust_env = False
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def clean_text(text: str) -> str:
    normalized = (text or "").replace("\xa0", " ")
    normalized = re.sub(r"[ \t]+", " ", normalized)
    return normalized.strip()


def normalize_article_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    for marker in (
        "Комментарии не найдены",
        "Подпишитесь на рассылку",
        "Оставить комментарий",
    ):
        index = text.find(marker)
        if index > 0:
            text = text[:index]

    text = re.sub(r"\n{3,}", "\n\n", text)
    if "\n\n" not in text and len(text) > 280:
        text = re.sub(r"(?<=[.!?…])\s+(?=[А-ЯA-Z«\"'])", "\n\n", text)
    return text.strip()


def extract_paragraph_text(container: BeautifulSoup) -> str:
    if not container:
        return ""

    parts: list[str] = []
    selectors = container.select(
        "p, h2, h3, li, div.paragraph-block, div[class*='paragraph']"
    )
    for node in selectors:
        text = clean_text(node.get_text(" ", strip=True))
        if len(text) > 35:
            parts.append(text)

    if parts:
        return normalize_article_text("\n\n".join(parts))

    return normalize_article_text(container.get_text("\n", strip=True))


def extract_tiu_article_text(soup: BeautifulSoup) -> str:
    blocks = soup.select("div.paragraph-block")
    parts: list[str] = []
    for block in blocks:
        text = clean_text(block.get_text("\n", strip=True))
        if len(text) > 35 and text.lower() != "загрузка":
            parts.append(text)

    if parts:
        return normalize_article_text("\n\n".join(parts))

    og_description = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
    if og_description and og_description.get("content"):
        description = clean_text(og_description["content"])
        if len(description) > 40 and description.lower() != "загрузка":
            return normalize_article_text(description)

    content_root = (
        soup.select_one(".content")
        or soup.select_one("main")
        or soup.select_one("article")
        or soup.body
    )
    return extract_paragraph_text(content_root) if content_root else ""


def pick_tiu_title(soup: BeautifulSoup, list_title: str) -> str:
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = clean_text(og_title["content"])
        if 10 < len(title) < 180:
            return title

    for selector in ("h1", ".article-title", ".news-title", "h2"):
        node = soup.select_one(selector)
        if not node:
            continue
        title = clean_text(node.get_text(" ", strip=True))
        if 10 < len(title) < 180:
            return title

    if list_title and len(list_title) < 180:
        return list_title

    return clean_text(list_title)[:180]


def truncate_text(text: str, limit: int = 220) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "..."


def parse_russian_date_to_iso(date_str: str) -> str:
    if not date_str or date_str == "Дата уточняется":
        return ""

    match = re.search(r"(\d{1,2})\s+([а-яё]+)\s+(\d{4})", date_str.lower())
    if not match:
        return ""

    day, month_name, year = match.groups()
    month = RUSSIAN_MONTH_TO_NUM.get(month_name)
    if not month:
        return ""

    return f"{year}-{month}-{int(day):02d}"


def upgrade_utmn_image_url(url: str) -> str:
    if not url or "utmn.ru" not in url:
        return url

    upgraded = url
    if "/dev2fun.imagecompress/" in upgraded:
        upgraded = re.sub(
            r"/upload/dev2fun\.imagecompress/[^/]+/resize_cache/iblock/",
            "/upload/iblock/",
            upgraded,
        )
        upgraded = re.sub(r"/\d+_\d+_\d+/", "/", upgraded)
        if upgraded.endswith(".webp"):
            upgraded = upgraded[:-5] + ".jpg"

    return upgraded


def get_stock_image(title: str, tag: str) -> str:
    """
    Выдает гарантированно существующую и уникальную картинку с Picsum, 
    используя стабильный хэш заголовка в качестве зерна (seed).
    """
    seed = hashlib.md5(f"{tag}:{title}".encode("utf-8")).hexdigest()
    return f"https://picsum.photos/seed/{seed}/800/600"


def extract_image(soup: BeautifulSoup, page_url: str, title: str, tag: str) -> str:
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        content = og_image["content"].strip()
        if content and "logo" not in content.lower():
            image_url = urljoin(page_url, content)
            if tag == "ТюмГУ":
                return upgrade_utmn_image_url(image_url)
            return image_url

    content_root = (
        soup.select_one(".article-detail")
        or soup.select_one("article")
        or soup.select_one("main")
        or soup.body
    )

    candidates: list[str] = []
    if content_root:
        for img in content_root.find_all("img"):
            src = img.get("src") or img.get("data-src") or img.get("data-original") or ""
            if not src or src.startswith("data:"):
                continue
            lower = src.lower()
            if any(skip in lower for skip in ("logo", "icon", "avatar", "sprite", "metric", "counter", "banner")):
                continue
            candidates.append(urljoin(page_url, src))

    if tag == "ТИУ":
        tiu_images = [url for url in candidates if "/media/images/" in url]
        if len(tiu_images) > 1:
            return tiu_images[1]
        if tiu_images:
            return tiu_images[0]

    if candidates:
        image_url = candidates[0]
        if tag == "ТюмГУ":
            return upgrade_utmn_image_url(image_url)
        return image_url

    return get_stock_image(title, tag)


def extract_utmn_list_image(article: BeautifulSoup, base_url: str) -> str:
    for img in article.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""
        if src and not src.startswith("data:"):
            return upgrade_utmn_image_url(urljoin(base_url, src))
    return ""


def parse_utmn_list_date(article: BeautifulSoup) -> str:
    month_el = article.select_one(".date .month")
    day_el = article.select_one(".date .day")
    year_el = article.select_one(".date .year")
    if not (month_el and day_el and year_el):
        return ""

    month_key = month_el.get_text(strip=True).lower()[:3]
    month = UTMN_MONTHS.get(month_key)
    if not month:
        return ""

    return f"{int(day_el.get_text(strip=True))} {MONTHS_RU[month]} {year_el.get_text(strip=True)}"


def parse_tiu_list_date(text: str) -> str:
    match = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", text)
    if not match:
        return ""
    day, month, year = match.groups()
    return f"{int(day)} {MONTHS_RU.get(month, month)} {year}"


def build_article(
    *,
    article_id: str,
    tag: str,
    title: str,
    description: str,
    full_text: str,
    date: str,
    link: str,
    image_url: str,
) -> dict[str, Any]:
    normalized_date = date or "Дата уточняется"
    return {
        "id": article_id,
        "tag": tag,
        "title": title,
        "description": description,
        "full_text": full_text,
        "date": normalized_date,
        "date_iso": parse_russian_date_to_iso(normalized_date),
        "link": link,
        "imageUrl": image_url,
    }


def fetch_tiu_article(session: requests.Session, url: str, list_title: str, list_date: str) -> Optional[dict[str, Any]]:
    try:
        response = session.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        title = pick_tiu_title(soup, list_title)
        full_text = extract_tiu_article_text(soup)
        if title and full_text.startswith(title):
            full_text = full_text[len(title):].strip()
        description = truncate_text(full_text or title)

        date = list_date
        if not date:
            date_match = re.search(r"(\d{2}\.\d{2}\.\d{4})", full_text)
            date = parse_tiu_list_date(date_match.group(1)) if date_match else ""

        slug = url.rstrip("/").split("/")[-1]
        return build_article(
            article_id=f"tiu-{slug[:48]}",
            tag="ТИУ",
            title=title or list_title,
            description=description,
            full_text=full_text,
            date=date,
            link=url,
            image_url=extract_image(soup, url, title, "ТИУ"),
        )
    except Exception as exc:
        logging.warning("Ошибка разбора статьи ТИУ %s: %s. Будет применен резервный вариант.", url, exc)
        return None


def parse_tiu_news(session: requests.Session) -> list[dict[str, Any]]:
    logging.info("Парсим TIU: %s", TIU_NEWS_URL)
    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    try:
        response = session.get(TIU_NEWS_URL, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
    except Exception as exc:
        logging.error("TIU list error: %s", exc)
        return results

    candidates: list[tuple[str, str, str]] = []
    for anchor in soup.find_all("a", href=True):
        href = urljoin(TIU_NEWS_URL, anchor["href"])
        if "news.tyuiu.ru/" not in href:
            continue
        if any(part in href for part in ("/sections/", "/search", "/media/", "/tag/", "/rss")):
            continue
        slug = href.rstrip("/").split("/")[-1]
        if not slug or slug == "news.tyuiu.ru":
            continue

        text = clean_text(anchor.get_text(" ", strip=True))
        if len(text) < 25:
            continue
        if href in seen_urls:
            continue
        seen_urls.add(href)

        title = re.sub(r"^\d+\s+\d{2}\.\d{2}\.\d{2,4}\s+", "", text)
        title = re.sub(r"\s+\d+\s+\d{2}\.\d{2}\.\d{2,4}\s*$", "", title)
        title = clean_text(title)
        if len(title) > 160:
            title = truncate_text(title, 160).rstrip(".")
        date = parse_tiu_list_date(text)
        candidates.append((href, title, date))

    for url, title, date in candidates[:MAX_TIU_NEWS]:
        article = fetch_tiu_article(session, url, title, date)
        if not article:
            # Умный резервный вариант: если страница ТИУ заблокировала робота, всё равно сохраняем новость!
            slug = url.rstrip("/").split("/")[-1]
            article = build_article(
                article_id=f"tiu-{slug[:48]}",
                tag="ТИУ",
                title=title,
                description="Текст статьи временно недоступен. Вы можете прочитать новость на официальном источнике.",
                full_text="Текст статьи временно недоступен. Вы можете прочитать новость на официальном источнике по ссылке ниже.",
                date=date,
                link=url,
                image_url=get_stock_image(title, "ТИУ"),
            )
        results.append(article)
        logging.info("TIU: %s", article["title"][:60])
        time.sleep(0.25)

    logging.info("TIU: %s новостей", len(results))
    return results


def fetch_utmn_article(session: requests.Session, url: str, list_title: str, list_date: str) -> Optional[dict[str, Any]]:
    try:
        response = session.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        title_el = soup.select_one("h1")
        title = clean_text(title_el.get_text(" ", strip=True)) if title_el else list_title
        detail = soup.select_one(".article-detail")
        full_text = extract_paragraph_text(detail) if detail else title
        description = truncate_text(full_text)

        article_id_match = re.search(r"/news/stories/[^/]+/(\d+)/?", url)
        article_id = f"utmn-{article_id_match.group(1)}" if article_id_match else f"utmn-{hash(url)}"

        return build_article(
            article_id=article_id,
            tag="ТюмГУ",
            title=title or list_title,
            description=description,
            full_text=full_text,
            date=list_date,
            link=url,
            image_url=extract_image(soup, url, title, "ТюмГУ"),
        )
    except Exception as exc:
        logging.warning("Ошибка разбора статьи ТюмГУ %s: %s. Будет применен резервный вариант.", url, exc)
        return None


def parse_utmn_news(session: requests.Session) -> list[dict[str, Any]]:
    logging.info("Парсим UTMN: %s", UTMN_NEWS_URL)
    results: list[dict[str, Any]] = []

    try:
        response = session.get(UTMN_NEWS_URL, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
    except Exception as exc:
        logging.error("UTMN list error: %s", exc)
        return results

    articles = soup.select("article.article")
    seen_links: set[str] = set()

    for article in articles:
        if len(results) >= MAX_UTMN_NEWS:
            break

        link_el = article.select_one("a.full") or article.select_one(".article_title a") or article.select_one("a[href*='/news/stories/']")
        if not link_el:
            continue

        href = link_el.get("href", "")
        if "/news/stories/" not in href:
            continue

        full_url = urljoin(UTMN_NEWS_URL, href)
        if full_url in seen_links:
            continue
        seen_links.add(full_url)

        title_el = article.select_one(".article_title")
        title = clean_text(title_el.get_text(" ", strip=True)) if title_el else "Новость ТюмГУ"
        date = parse_utmn_list_date(article)

        preview_image = extract_utmn_list_image(article, UTMN_NEWS_URL)
        item = fetch_utmn_article(session, full_url, title, date)
        if item and preview_image and "picsum.photos" in item.get("imageUrl", ""):
            item["imageUrl"] = preview_image
        if not item:
            # Умный резервный вариант: если страница ТюмГУ заблокировала робота, всё равно сохраняем новость!
            item = build_article(
                article_id=f"utmn-{hash(full_url)}",
                tag="ТюмГУ",
                title=title,
                description="Текст статьи временно недоступен. Вы можете прочитать новость на официальном источнике.",
                full_text="Текст статьи временно недоступен. Вы можете прочитать новость на официальном источнике по ссылке ниже.",
                date=date,
                link=full_url,
                image_url=get_stock_image(title, "ТюмГУ"),
            )
        results.append(item)
        logging.info("UTMN: %s", item["title"][:60])
        time.sleep(0.25)

    logging.info("UTMN: %s новостей", len(results))
    return results


def merge_news(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items:
        key = item.get("link") or item.get("id")
        if key in seen:
            continue
        seen.add(key)
        merged.append(item)
    return merged


def save_news(items: list[dict[str, Any]]) -> None:
    payload = json.dumps(items, ensure_ascii=False, indent=4)
    public_target = PUBLIC_DIR / "university_news_data.json"
    public_target.write_text(payload, encoding="utf-8")
    logging.info("Сохранено %s новостей в university_news_data.json", len(items))


def sort_news_by_date(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        items,
        key=lambda item: item.get("date_iso") or "1970-01-01",
        reverse=True,
    )


def main() -> None:
    session = create_session()
    news = sort_news_by_date(merge_news(parse_tiu_news(session) + parse_utmn_news(session)))
    if not news:
        logging.warning("Новости вузов не найдены. Будет записан пустой список.")
    save_news(news)


if __name__ == "__main__":
    main()