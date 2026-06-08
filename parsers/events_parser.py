import json
import logging
import re
from html import unescape
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"

CLIENT_ID = "bedc0039-d242-4589-a00c-9a64e037d161"
CLIENT_SECRET = "zUVurszEHwN801WF3dG6YKp9jT94dj5p"

API_BASE_URL = "https://apps.leader-id.ru/api/v1"
LEADER_EVENTS_URL = (
    "https://leader-id.ru/events?actual=1&cityId=1285249&offline=0&registrationActual=1&sort=date"
)
UTMN_EVENTS_URL = "https://www.utmn.ru/news/events/"
FASIE_PROGRAMS_URL = "https://fasie.ru/programs/"
TYUMEN_CITY_ID = 1285249
REQUEST_TIMEOUT = 25
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
)

MAX_LEADER_EVENTS = 20
MAX_UTMN_EVENTS = 10
MAX_FASIE_PROGRAMS = 8

MONTHS = {
    "01": "января",
    "02": "февраля",
    "03": "марта",
    "04": "апреля",
    "05": "мая",
    "06": "июня",
    "07": "июля",
    "08": "августа",
    "09": "сентября",
    "10": "октября",
    "11": "ноября",
    "12": "декабря",
}

UTMN_MONTHS = {
    "янв": "01",
    "фев": "02",
    "мар": "03",
    "апр": "04",
    "май": "05",
    "июн": "06",
    "июл": "07",
    "авг": "08",
    "сен": "09",
    "окт": "10",
    "ноя": "11",
    "дек": "12",
}

FASIE_PROGRAM_SLUGS = [
    "programma-innoshkolnik",
    "programma-umnik",
    "programma-studstartup",
    "programma-start",
    "programma-razvitie",
    "programma-internatsionalizatsiya",
    "programma-kommertsializatsiya",
    "prioritet",
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def create_session() -> requests.Session:
    session = requests.Session()
    session.trust_env = False
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def strip_html(text: str) -> str:
    cleaned = re.sub(r"<[^>]+>", " ", text or "")
    cleaned = unescape(cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def truncate_text(text: str, limit: int = 220) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "..."


def format_russian_date(date_str: str) -> str:
    if not date_str:
        return "Дата уточняется"
    try:
        date_part = date_str.split(" ")[0]
        year, month, day = date_part.split("-")
        return f"{int(day)} {MONTHS.get(month, month)} {year}"
    except Exception:
        return date_str


def format_time_range(date_start: str, date_end: str) -> str:
    if not date_start:
        return ""

    start_time = date_start.split(" ")[1][:5] if " " in date_start else ""
    end_time = date_end.split(" ")[1][:5] if date_end and " " in date_end else start_time
    if not start_time:
        return ""
    return f"{start_time} — {end_time}" if end_time and end_time != start_time else start_time


def format_event_date(date_start: str, date_end: str) -> str:
    if not date_start:
        return "Дата уточняется"

    start_date = format_russian_date(date_start)
    if not date_end:
        return start_date

    start_day = date_start.split(" ")[0]
    end_day = date_end.split(" ")[0]
    if start_day == end_day:
        return start_date

    return f"{start_date} — {format_russian_date(date_end)}"


def get_event_tag(title: str, type_name: str = "") -> str:
    title_lower = title.lower()
    type_lower = (type_name or "").lower()

    if "хакатон" in title_lower or "hackathon" in title_lower or "хакатон" in type_lower:
        return "Хакатоны"
    if "акселератор" in title_lower or "акселератор" in type_lower:
        return "Акселератор"
    if "демо-день" in title_lower or "demo day" in title_lower or "выставк" in title_lower:
        return "Выставки и демо-дни"
    if "фестивал" in title_lower:
        return "Цифровые фестивали"
    if "мастер-класс" in type_lower or "воркшоп" in title_lower or "workshop" in title_lower:
        return "Технические воркшопы"
    if "соревнован" in type_lower or "чемпионат" in title_lower or "стартап" in title_lower:
        return "Стартап-чемпионаты"
    if type_lower in {"конференция", "лекция", "семинар", "встреча", "форум"}:
        return "Конференции и саммиты"
    if "конференц" in title_lower or "форум" in title_lower or "лекц" in title_lower:
        return "Конференции и саммиты"
    if "конкурс" in title_lower:
        return "Стартап-чемпионаты"

    return "Конференции и саммиты"


def build_event(
    *,
    event_id: str,
    tag: str,
    title: str,
    description: str,
    date: str,
    time: str,
    location: str,
    link: str,
) -> dict[str, Any]:
    return {
        "id": event_id,
        "tag": tag,
        "title": title,
        "description": description,
        "date": date,
        "time": time,
        "location": location,
        "link": link,
    }


def get_access_token() -> Optional[str]:
    token_url = f"{API_BASE_URL}/oauth/token"
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "client_credentials",
    }
    try:
        response = requests.post(token_url, json=payload, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json().get("access_token")
    except Exception as exc:
        logging.error("Не удалось авторизоваться в API Leader-ID: %s", exc)
        return None


def extract_leader_description(item: dict[str, Any]) -> str:
    info = item.get("info")
    if isinstance(info, str) and info.strip():
        return truncate_text(strip_html(info))

    full_info = item.get("full_info")
    if not full_info:
        return "Описание будет опубликовано на странице мероприятия."

    try:
        blocks = json.loads(full_info).get("blocks", [])
    except json.JSONDecodeError:
        return "Описание будет опубликовано на странице мероприятия."

    parts: list[str] = []
    for block in blocks:
        data = block.get("data") or {}
        text = data.get("text") or data.get("caption") or ""
        cleaned = strip_html(text)
        if cleaned:
            parts.append(cleaned)

    description = " ".join(parts).strip()
    if not description:
        return "Описание будет опубликовано на странице мероприятия."

    return truncate_text(description)


def extract_leader_location(item: dict[str, Any]) -> str:
    if (item.get("format") or "").lower() == "online":
        return "Онлайн"

    place = item.get("place") or {}
    if isinstance(place, dict):
        place_address = place.get("address") or {}
        if isinstance(place_address, dict) and place_address.get("title"):
            return place_address["title"]
        if place.get("name"):
            return place["name"]

    space = item.get("space") or {}
    if isinstance(space, dict):
        space_address = space.get("address") or {}
        if isinstance(space_address, dict) and space_address.get("title"):
            return space_address["title"]
        if space.get("name"):
            return space["name"]

    return item.get("city") or "Тюмень"


def normalize_leader_event(item: dict[str, Any]) -> dict[str, Any]:
    event_id = item.get("id")
    title = item.get("full_name") or item.get("name") or "Без названия"
    type_name = ""
    event_type = item.get("type")
    if isinstance(event_type, dict):
        type_name = event_type.get("name") or ""

    date_start = item.get("date_start") or ""
    date_end = item.get("date_end") or ""

    return build_event(
        event_id=f"leader-{event_id}",
        tag=get_event_tag(title, type_name),
        title=title,
        description=extract_leader_description(item),
        date=format_event_date(date_start, date_end),
        time=format_time_range(date_start, date_end),
        location=extract_leader_location(item),
        link=f"https://leader-id.ru/events/{event_id}",
    )


def fetch_leader_events(token: str) -> list[dict[str, Any]]:
    events_url = f"{API_BASE_URL}/events/search"
    headers = {"Authorization": f"Bearer {token}"}
    events: list[dict[str, Any]] = []
    page = 1

    while len(events) < MAX_LEADER_EVENTS:
        params = {
            "cityId": TYUMEN_CITY_ID,
            "actual": 1,
            "registrationActual": 1,
            "offline": 0,
            "sort": "date",
            "limit": min(10, MAX_LEADER_EVENTS - len(events)),
            "paginationPage": page,
        }

        try:
            response = requests.get(
                events_url,
                headers=headers,
                params=params,
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logging.error("Ошибка Leader-ID: %s", exc)
            break

        raw_items = data.get("items") or []
        if not raw_items:
            break

        for item in raw_items:
            events.append(normalize_leader_event(item))
            if len(events) >= MAX_LEADER_EVENTS:
                break

        meta = data.get("meta") or {}
        if page >= (meta.get("paginationPageCount") or page):
            break
        page += 1

    logging.info("Leader-ID: %s мероприятий", len(events))
    return events


def parse_utmn_list_date(article: BeautifulSoup) -> str:
    month_el = article.select_one(".date .month")
    day_el = article.select_one(".date .day")
    year_el = article.select_one(".date .year")
    if not (month_el and day_el and year_el):
        return "Дата уточняется"

    month_key = month_el.get_text(strip=True).lower()[:3]
    month = UTMN_MONTHS.get(month_key)
    if not month:
        return "Дата уточняется"

    day = day_el.get_text(strip=True)
    year = year_el.get_text(strip=True)
    return f"{int(day)} {MONTHS[month]} {year}"


def fetch_utmn_event_details(session: requests.Session, url: str) -> tuple[str, str, str]:
    try:
        response = session.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
    except Exception as exc:
        logging.warning("Не удалось загрузить UTMN %s: %s", url, exc)
        return "", "", "ТюмГУ, Тюмень"

    detail = soup.select_one(".article-detail")
    description = truncate_text(strip_html(detail.get_text(" ", strip=True))) if detail else ""
    if not description:
        meta = soup.find("meta", attrs={"name": "description"})
        if meta and meta.get("content"):
            description = truncate_text(strip_html(meta["content"]))

    full_text = detail.get_text("\n", strip=True) if detail else ""
    location = "ТюмГУ, г. Тюмень"

    address_match = re.search(
        r"(?:г\.\s*)?Тюмен[ьи][^.\n]{0,120}(?:ул\.|улиц[аы])[^.\n]{0,80}",
        full_text,
        re.IGNORECASE,
    )
    if address_match:
        location = address_match.group(0).strip()
    elif "тюмгу" in full_text.lower() or "тюменск" in full_text.lower():
        location = "ТюмГУ, г. Тюмень"

    time_match = re.search(r"(\d{1,2}:\d{2}).{0,20}(\d{1,2}:\d{2})", full_text)
    event_time = f"{time_match.group(1)} — {time_match.group(2)}" if time_match else ""

    return description, event_time, location


def fetch_utmn_events(session: requests.Session) -> list[dict[str, Any]]:
    logging.info("Парсим UTMN: %s", UTMN_EVENTS_URL)
    events: list[dict[str, Any]] = []

    try:
        response = session.get(UTMN_EVENTS_URL, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
    except Exception as exc:
        logging.error("Ошибка UTMN: %s", exc)
        return events

    articles = soup.select("article.article")[:MAX_UTMN_EVENTS]
    for article in articles:
        link_el = article.select_one("a.full") or article.select_one(".article_title a")
        if not link_el:
            continue

        href = link_el.get("href", "")
        if not href or "/news/events/" not in href:
            continue

        full_url = urljoin(UTMN_EVENTS_URL, href)
        event_id_match = re.search(r"/news/events/(\d+)/?", href)
        if not event_id_match:
            continue

        title_el = article.select_one(".article_title")
        title = title_el.get_text(" ", strip=True) if title_el else "Мероприятие ТюмГУ"
        date = parse_utmn_list_date(article)
        description, event_time, location = fetch_utmn_event_details(session, full_url)

        if not description:
            description = "Мероприятие Тюменского государственного университета."

        events.append(
            build_event(
                event_id=f"utmn-{event_id_match.group(1)}",
                tag=get_event_tag(title),
                title=title,
                description=description,
                date=date,
                time=event_time,
                location=location,
                link=full_url,
            )
        )

    logging.info("UTMN: %s мероприятий", len(events))
    return events


def fetch_fasie_program(session: requests.Session, slug: str) -> Optional[dict[str, Any]]:
    url = urljoin(FASIE_PROGRAMS_URL, slug + "/")
    try:
        response = session.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
    except Exception as exc:
        logging.warning("Не удалось загрузить FASIE %s: %s", url, exc)
        return None

    title_el = soup.select_one("h1")
    title = title_el.get_text(" ", strip=True) if title_el else slug
    meta = soup.find("meta", attrs={"name": "description"})
    description = truncate_text(meta.get("content", "").strip()) if meta else ""
    if not description:
        for paragraph in soup.select("section p"):
            text = paragraph.get_text(" ", strip=True)
            if len(text) > 60:
                description = truncate_text(text)
                break

    if not description:
        description = "Программа поддержки инновационных проектов Фонда содействия инновациям."

    return build_event(
        event_id=f"fasie-{slug}",
        tag="Гранты и программы",
        title=title,
        description=description,
        date="Постоянный набор",
        time="",
        location="Фонд содействия инновациям (fasie.ru)",
        link=url,
    )


def fetch_fasie_programs(session: requests.Session) -> list[dict[str, Any]]:
    logging.info("Парсим FASIE: %s", FASIE_PROGRAMS_URL)
    events: list[dict[str, Any]] = []

    for slug in FASIE_PROGRAM_SLUGS[:MAX_FASIE_PROGRAMS]:
        program = fetch_fasie_program(session, slug)
        if program:
            events.append(program)

    logging.info("FASIE: %s программ", len(events))
    return events


def merge_events(sources: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    seen_links: set[str] = set()

    for source in sources:
        for event in source:
            event_id = str(event.get("id", ""))
            link = event.get("link", "")
            if event_id and event_id in seen_ids:
                continue
            if link and link in seen_links:
                continue
            if event_id:
                seen_ids.add(event_id)
            if link:
                seen_links.add(link)
            merged.append(event)

    return merged


def save_events(events: list[dict[str, Any]]) -> None:
    payload = json.dumps(events, ensure_ascii=False, indent=4)
    public_target = PUBLIC_DIR / "events_data.json"
    public_target.write_text(payload, encoding="utf-8")
    logging.info("Сохранено %s мероприятий в events_data.json", len(events))


def main() -> None:
    session = create_session()
    token = get_access_token()
    if not token:
        logging.warning("Leader-ID недоступен, пропускаем источник.")

    try:
        leader_events = fetch_leader_events(token) if token else []
        utmn_events = fetch_utmn_events(session)
        fasie_events = fetch_fasie_programs(session)
        events = merge_events([leader_events, utmn_events, fasie_events])
    except Exception as exc:
        logging.error("Ошибка при сборе мероприятий: %s", exc)
        events = []
    if not events:
        logging.warning("События не найдены. Будет записан пустой список.")

    save_events(events)


if __name__ == "__main__":
    main()
