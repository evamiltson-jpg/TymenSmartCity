import hashlib
import json
import logging
import re
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/121.0.0.0 Safari/537.36"
)
REQUEST_HEADERS = {"User-Agent": USER_AGENT}
REQUEST_TIMEOUT = 25
MAX_ITEMS_PER_FEED = 36

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def create_session() -> requests.Session:
    session = requests.Session()
    session.trust_env = False
    session.headers.update(REQUEST_HEADERS)
    return session


def clean_text(raw_text: str) -> str:
    normalized = raw_text.replace("\xa0", " ")
    normalized = re.sub(r"\r\n?", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    normalized = re.sub(r"[ \t]{2,}", " ", normalized)
    return normalized.strip()


def normalize_article_text(text: str) -> str:
    text = clean_text(text)
    if not text:
        return ""

    if "\n\n" not in text and len(text) > 280:
        text = re.sub(r"(?<=[.!?…])\s+(?=[А-ЯA-Z«\"'])", "\n\n", text)

    return text


def html_to_text(html_fragment: str) -> str:
    soup = BeautifulSoup(html_fragment or "", "html.parser")
    for tag in soup(["script", "style", "noscript", "template", "svg"]):
        tag.decompose()
    return clean_text(soup.get_text(separator="\n", strip=True))


def ensure_absolute_url(url: str, base_url: str) -> str:
    if not url:
        return ""
    return urljoin(base_url, url)


def get_stock_image(title: str) -> str:
    """
    Выдает гарантированно существующую красивую картинку с Picsum.
    """
    hash_val = hashlib.md5(title.encode("utf-8")).hexdigest()
    return f"https://picsum.photos/seed/{hash_val}/800/600"


def get_page_soup(session: requests.Session, article_url: str) -> Optional[BeautifulSoup]:
    try:
        response = session.get(article_url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")
    except Exception as exc:
        logging.warning("Не удалось загрузить страницу %s: %s", article_url, exc)
        return None


def extract_text_from_soup(soup: BeautifulSoup, selectors: list[str]) -> str:
    for selector in selectors:
        container = soup.select_one(selector)
        if container:
            for tag in container(["script", "style", "noscript", "template", "svg", "aside"]):
                tag.decompose()
            text = normalize_article_text(container.get_text(separator="\n", strip=True))
            if text:
                return text

    paragraphs = [clean_text(p.get_text(" ", strip=True)) for p in soup.find_all("p")]
    paragraphs = [p for p in paragraphs if len(p) > 20]
    if paragraphs:
        return normalize_article_text("\n\n".join(paragraphs))
    return normalize_article_text(clean_text(soup.get_text(separator="\n", strip=True)))


def extract_image_from_soup(soup: BeautifulSoup, article_url: str) -> str:
    # Пытаемся найти главное превью статьи в мета-тегах og:image (это дает лучшую картинку)
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        return ensure_absolute_url(og_image["content"], article_url)

    # Если в мета-тегах нет, ищем первый подходящий тег img
    for img in soup.find_all("img"):
        src = (
            img.get("src")
            or img.get("data-src")
            or img.get("data-original")
            or img.get("data-lazy-src")
        )
        if src and not src.startswith("data:image"):
            if "habr.com/share" in src or "avatar" in src.lower():
                continue
            return ensure_absolute_url(src, article_url)
    return ""


def parse_feed(
    session: requests.Session,
    *,
    rss_url: str,
    content_selectors: list[str],
    tag: str,
    id_offset: int,
    is_city_news: bool,
) -> list[dict]:
    logging.info("Парсим RSS: %s", rss_url)
    response = session.get(rss_url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()

    root = ET.fromstring(response.content)
    items = root.findall(".//item")
    results: list[dict] = []

    for index, item in enumerate(items[:MAX_ITEMS_PER_FEED], start=1):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        description_html = item.findtext("description") or ""

        rss_preview_text = html_to_text(description_html).replace("Читать далее", "").strip()
        
        full_text = rss_preview_text
        image_url = ""

        # Сначала пробуем выудить картинку напрямую из RSS-ленты
        enclosure = item.find("enclosure")
        if enclosure is not None and enclosure.get("url"):
            image_url = enclosure.get("url")
        
        if not image_url:
            rss_soup = BeautifulSoup(description_html, "html.parser")
            rss_img = rss_soup.find("img")
            if rss_img and rss_img.get("src"):
                image_url = ensure_absolute_url(rss_img["src"], link)

        # Переходим на страницу статьи, чтобы забрать ПОЛНЫЙ текст и картинку (если её не было в RSS)
        if link:
            soup = get_page_soup(session, link)
            if soup:
                page_text = extract_text_from_soup(soup, content_selectors)
                if page_text:
                    full_text = page_text

                # Если картинка еще не нашлась, ищем её на странице статьи
                if not image_url:
                    page_image = extract_image_from_soup(soup, link)
                    if page_image:
                        image_url = page_image

        # Если картинки нет вообще нигде — ставим Picsum заглушку
        if not image_url:
            image_url = get_stock_image(title)

        if not full_text:
            full_text = "Текст статьи временно недоступен. Вы можете прочитать её на оригинальном источнике по ссылке ниже."
        description = (full_text[:200] + "...") if len(full_text) > 200 else full_text

        results.append(
            {
                "id": index + id_offset,
                "title": title,
                "link": link,
                "date": pub_date,
                "description": description,
                "full_text": full_text,
                "imageUrl": image_url,
                "tag": tag,
            }
        )
        logging.info("Готово [%s] %s", index, title[:60])
        time.sleep(0.3)

    return results


def save_json_both_locations(data: list[dict], filename: str) -> None:
    public_target = PUBLIC_DIR / filename
    payload = json.dumps(data, ensure_ascii=False, indent=4)
    public_target.write_text(payload, encoding="utf-8")
    logging.info("Сохранено: %s", public_target)


def run_once() -> None:
    session = create_session()

    city_news = parse_feed(
        session,
        rss_url="https://t-l.ru/rss.xml",
        content_selectors=["div.text", "div.article-text", "div.news-text", "article"],
        tag="Город",
        id_offset=0,
        is_city_news=True,
    )

    it_news = parse_feed(
        session,
        rss_url="https://habr.com/ru/rss/articles/",
        content_selectors=["div.article-formatted-body", "div.tm-article-body", "div.post-content-body", "article"],
        tag="Технологии",
        id_offset=100,
        is_city_news=False,
    )

    save_json_both_locations(city_news, "news_data.json")
    save_json_both_locations(it_news, "it_news_data.json")
    logging.info("Парсинг завершен успешно.")


def main() -> None:
    run_once()


if __name__ == "__main__":
    main()