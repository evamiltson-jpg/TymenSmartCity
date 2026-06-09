"""Скачивает стоковые превью проектов (Picsum) в public/project_images/."""
import hashlib
import json
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
IMAGES_DIR = PUBLIC_DIR / "project_images"
MANIFEST = PUBLIC_DIR / "project_images.json"

PROJECT_TITLES = [
    "SmartTraffic AI",
    "EcoBin Sensors",
    "SolarBench",
    "HelpHand App",
    "SkyPatrol",
    "EduVR History",
]

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
)


def slug_for(title: str) -> str:
    return hashlib.md5(title.encode("utf-8")).hexdigest()[:12]


def picsum_url(title: str) -> str:
    seed = hashlib.md5(title.encode("utf-8")).hexdigest()
    return f"https://picsum.photos/seed/{seed}/800/600"


def main() -> None:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, str] = {}

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    for title in PROJECT_TITLES:
        slug = slug_for(title)
        filename = f"{slug}.jpg"
        target = IMAGES_DIR / filename
        url = picsum_url(title)

        if not target.exists() or target.stat().st_size < 1024:
            print(f"Downloading {title}...")
            response = session.get(url, timeout=40)
            response.raise_for_status()
            target.write_bytes(response.content)

        manifest[title] = f"/project_images/{filename}"
        print(f"OK {title} -> {manifest[title]}")

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifest saved: {MANIFEST}")


if __name__ == "__main__":
    main()
