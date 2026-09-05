#!/usr/bin/env python3
"""Оптимизация картинок сайта: AVIF рядом с WebP + миниатюры для каталога.

ЗАЧЕМ ЭТО НУЖНО (замер 05.09.2026). Страница тянула 1173 КБ до первой прокрутки,
и 612 КБ из них — образцы каталога. Причина: карточка показывает образец в 268×201,
а грузила файл 560×747, потому что тот же файл открывается крупно по клику.

ЧТО ДЕЛАЕМ.
1. Для карточек каталога — отдельные миниатюры двух размеров (360 и 536 по ширине;
   536 = ровно 2× карточки на большом экране, 360 хватает телефону). Полный файл
   остаётся и подгружается только при клике — его адрес кладём в data-full.
2. Каждой картинке добавляем AVIF-двойник. На песчаной текстуре кирпича он вдвое
   легче WebP при том же зерне — проверено сравнением увеличенных фрагментов,
   AVIF q50 (25 КБ) держит песок не хуже WebP q75 (46 КБ).
3. Всем картинкам проставляем width и height, иначе вёрстка прыгает при загрузке.

ПОЧЕМУ WEBP ОСТАЁТСЯ. AVIF понимают не все браузеры, и запасной вариант обязателен:
<picture> отдаёт AVIF тем, кто умеет, остальным — прежний WebP. Терять покупателя
со старым телефоном из-за экономии килобайтов нельзя.

ЗАПУСК:  python scripts/optimize-images.py        (из папки сайта)
Скрипт идемпотентен: повторный прогон ничего не ломает, файлы пересобираются.
"""
from __future__ import annotations
import hashlib, re, sys, pathlib
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
THUMB = ROOT / "img" / "thumb"

# Качество подобрано замером на самом шумном образце: ниже — заметно на зерне.
Q_AVIF, Q_WEBP = 52, 78
SHIR = (360, 536)          # ширины миниатюр каталога
PROP = 4 / 3               # пропорции карточки (object-fit: cover обрезает по центру)


def versiya(p: pathlib.Path) -> str:
    """Хвост ?v= по содержимому: браузер заберёт новый файл, а не старый из кэша."""
    return hashlib.sha1(p.read_bytes()).hexdigest()[:8]


def obrezat(im: Image.Image, w: int, h: int) -> Image.Image:
    """Кадрирование по центру под нужные пропорции — так же, как это делает object-fit."""
    k = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    l, t = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((l, t, l + w, t + h))


def avif_ryadom(ish: pathlib.Path) -> pathlib.Path | None:
    """Кладёт AVIF-двойник рядом с исходником. Возвращает путь или None, если не выгодно."""
    out = ish.with_suffix(".avif")
    Image.open(ish).convert("RGB").save(out, "AVIF", quality=Q_AVIF)
    # Бывает, что AVIF тяжелее (мелкие однотонные картинки) — тогда он не нужен.
    if out.stat().st_size >= ish.stat().st_size:
        out.unlink()
        return None
    return out


def tegi_img(html: str, vnutri: tuple[int, int] | None = None) -> list[str]:
    kusok = html[vnutri[0]:vnutri[1]] if vnutri else html
    return re.findall(r"<img\b[^>]*>", kusok)


def atribut(teg: str, imya: str) -> str | None:
    m = re.search(rf'{imya}="([^"]*)"', teg)
    return m.group(1) if m else None


def main() -> int:
    html = HTML.read_text(encoding="utf-8")
    # Картинки, уже завёрнутые в <picture> (первый экран), этот проход не трогает —
    # им AVIF добавляется ниже, внутрь готовой обёртки.
    uzhe = set()
    for m in re.finditer(r"<picture>.*?</picture>", html, re.S):
        uzhe.update(tegi_img(m.group(0)))

    THUMB.mkdir(parents=True, exist_ok=True)
    i = html.find('<section id="catalog"')
    j = html.find("</section>", i)
    katalog = set(tegi_img(html, (i, j)))

    bylo = stalo = 0
    n_thumb = n_avif = 0

    for teg in tegi_img(html):
        if teg in uzhe:
            continue
        src = atribut(teg, "src")
        if not src or src.startswith("data:"):
            continue
        ish = ROOT / src.split("?")[0].lstrip("/")
        if not ish.exists():
            print("  ⚠ файла нет:", ish.name)
            continue

        im = Image.open(ish).convert("RGB")
        v_katalog = teg in katalog
        bylo += ish.stat().st_size

        if v_katalog:
            # Миниатюры двух ширин в двух форматах + полный файл на клик.
            avif_set, webp_set = [], []
            for w in SHIR:
                h = round(w / PROP)
                mal = obrezat(im, w, h)
                pw_ = THUMB / f"{ish.stem}-{w}.webp"
                pa = THUMB / f"{ish.stem}-{w}.avif"
                mal.save(pw_, "WEBP", quality=Q_WEBP, method=6)
                mal.save(pa, "AVIF", quality=Q_AVIF)
                webp_set.append(f"{pw_.relative_to(ROOT).as_posix()}?v={versiya(pw_)} {w}w")
                avif_set.append(f"{pa.relative_to(ROOT).as_posix()}?v={versiya(pa)} {w}w")
                stalo += min(pw_.stat().st_size, pa.stat().st_size)
            n_thumb += 1
            osnov = THUMB / f"{ish.stem}-{SHIR[-1]}.webp"
            razmery = f'width="{SHIR[-1]}" height="{round(SHIR[-1] / PROP)}"'
            sizes = "(max-width: 640px) 50vw, 270px"
            novyj_img = teg
            novyj_img = re.sub(r'src="[^"]*"',
                               f'src="{osnov.relative_to(ROOT).as_posix()}?v={versiya(osnov)}"', novyj_img)
            novyj_img = novyj_img.replace("<img", f'<img data-full="{src}" {razmery}', 1)
            novyj_img = novyj_img.replace(">", f' srcset="{", ".join(webp_set)}" sizes="{sizes}">', 1) \
                if "srcset=" not in novyj_img else novyj_img
            blok = ("<picture>"
                    f'<source type="image/avif" srcset="{", ".join(avif_set)}" sizes="{sizes}">'
                    f"{novyj_img}</picture>")
        else:
            # Обычная картинка: AVIF-двойник того же размера + width/height.
            pa = avif_ryadom(ish)
            stalo += (pa.stat().st_size if pa else ish.stat().st_size)
            if pa:
                n_avif += 1
            novyj_img = teg
            if not atribut(teg, "width"):
                novyj_img = novyj_img.replace("<img", f'<img width="{im.width}" height="{im.height}"', 1)
            blok = (f'<picture><source type="image/avif" '
                    f'srcset="{pa.relative_to(ROOT).as_posix()}?v={versiya(pa)}">{novyj_img}</picture>'
                    if pa else novyj_img)

        html = html.replace(teg, blok, 1)

    # Первый экран: AVIF внутрь готовых <picture>. Порядок важен — браузер берёт
    # ПЕРВЫЙ подходящий source, поэтому AVIF ставим перед существующими.
    n_hero = 0
    for m in list(re.finditer(r"<picture>(.*?)</picture>", html, re.S)):
        blok = m.group(0)
        if "image/avif" in blok:
            continue
        istochniki = []
        for teg in tegi_img(blok):
            for adres, media in [(atribut(teg, "src"), None)] +                     [(re.search(r'srcset="([^" ]+)', s2).group(1), re.search(r'media="([^"]+)"', s2))
                     for s2 in re.findall(r"<source[^>]*>", blok)]:
                if not adres:
                    continue
                f = ROOT / adres.split("?")[0].lstrip("/")
                if not f.exists():
                    continue
                pa = f.with_suffix(".avif")
                if not pa.exists():
                    pa = avif_ryadom(f)
                if not pa:
                    continue
                atr = f' media="{media.group(1)}"' if media else ""
                istochniki.append(f'<source type="image/avif"{atr} '
                                  f'srcset="{pa.relative_to(ROOT).as_posix()}?v={versiya(pa)}">')
        if istochniki:
            # media-варианты должны идти раньше безусловного, иначе он перехватит всё
            istochniki.sort(key=lambda x: "media=" not in x)
            html = html.replace(blok, blok.replace("<picture>", "<picture>" + "".join(dict.fromkeys(istochniki)), 1), 1)
            n_hero += 1

    HTML.write_text(html, encoding="utf-8")
    print(f"первых экранов с AVIF: {n_hero}")
    print(f"миниатюр каталога: {n_thumb} · AVIF-двойников: {n_avif}")
    print(f"вес картинок разметки: {bylo/1024:.0f} КБ → {stalo/1024:.0f} КБ "
          f"(экономия {(bylo-stalo)/1024:.0f} КБ)")
    print("Полные файлы образцов остались на диске — они грузятся только по клику (data-full).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
