#!/usr/bin/env python3
"""
build-blog.py — сборка блога из markdown в статические страницы.

ЗАЧЕМ БЛОГ. Каталог ловит тех, кто уже решил купить гибкий кирпич. Блог ловит
на ступень раньше: «чем отличается от клинкера», «как клеить», «что за сетка».
По Wordstat это тысячи показов в месяц, и на них у сайта сейчас нет ни одной
страницы (см. clients/saranskdekor/keywords.md в content-factory).

ПОЧЕМУ СТАТИКА, А НЕ ДВИЖОК. Сайт живёт на GitHub Pages: базы нет, PHP нет,
и это хорошо — нечему ломаться и нечего взламывать. Статьи пишутся в markdown,
скрипт раскладывает их по папкам с index.html. Никаких сборщиков и зависимостей,
кроме python-markdown.

ЗАПУСК:
    python scripts/build-blog.py          # собрать блог и обновить sitemap
    python scripts/build-blog.py --check  # только проверить, ничего не писать

Статьи лежат в blog/_posts/*.md с шапкой:
    ---
    title: Заголовок
    description: Строка для выдачи, 140-160 знаков
    date: 2026-08-30
    keywords: гибкий кирпич на сетке, монтаж
    ---

⚠️ ФАКТЫ О ТОВАРЕ НЕ ВЫДУМЫВАЮТСЯ. Всё, что попадает в статьи, берётся из
clients/saranskdekor/product-knowledge.md. Числа, которых там нет (расход клея,
цена монтажа), в текст не идут — вместо них отсылка к продавцу.
"""
import re
import sys
import html

# Консоль Windows живёт в cp1251 и падает на «✓» и кириллице в выводе.
# Прибиваем поток к utf-8 сразу: иначе скрипт валится не на логике, а на печати.
for _p in (sys.stdout, sys.stderr):
    try:
        _p.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
from pathlib import Path
from datetime import date

try:
    import markdown
except ImportError:
    sys.exit("нужен python-markdown:  pip install markdown")

KOREN = Path(__file__).resolve().parent.parent
POSTS = KOREN / "blog" / "_posts"
BLOG = KOREN / "blog"
SAIT = "https://saranskdekor.ru"

MESJACY = ("января февраля марта апреля мая июня июля августа сентября "
           "октября ноября декабря").split()


def razobrat(text: str) -> tuple[dict, str]:
    """Отделяем шапку от текста. Формат простой — «ключ: значение» до второй ---."""
    if not text.startswith("---"):
        return {}, text
    _, shapka, telo = text.split("---", 2)
    meta = {}
    for line in shapka.strip().splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, telo.strip()


def data_po_russki(iso: str) -> str:
    try:
        d = date.fromisoformat(iso)
        return f"{d.day} {MESJACY[d.month - 1]} {d.year}"
    except Exception:
        return iso


SHABLON = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Гибкий кирпич в Саранске</title>
<meta name="description" content="{description}">
{keywords_meta}<link rel="canonical" href="{canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/css/fonts.css?v={v_fonts}">
<link rel="stylesheet" href="/css/site.css?v={v_site}">
<link rel="stylesheet" href="/css/ui.css?v={v_ui}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{canonical}">
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body class="bg-stone-900 font-sans text-white antialiased">

<header class="fixed top-0 left-0 right-0 z-50 bg-stone-900/90 backdrop-blur-sm border-b border-stone-800">
  <div class="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 md:flex-col md:items-start md:gap-0 leading-tight">
      <span class="font-heading font-bold text-amber-500 text-xl tracking-wide uppercase">Гибкий Кирпич</span>
      <span class="text-xs text-stone-300 md:text-[10px] md:text-stone-400">г. Саранск, ул. Рабочая, 185В</span>
    </a>
    <nav class="hidden md:flex items-center gap-6 text-sm text-stone-300">
      <a href="/#catalog" class="hover:text-amber-400 transition-colors">Каталог</a>
      <a href="/#raschet-sec" class="hover:text-amber-400 transition-colors">Расчёт</a>
      <a href="/blog/" class="text-amber-400">Статьи</a>
      <a href="/#contact" class="hover:text-amber-400 transition-colors">Контакты</a>
    </nav>
  </div>
</header>

<main class="max-w-3xl mx-auto px-4 pt-24 pb-16">
  <p class="text-stone-500 text-sm"><a href="/blog/" class="hover:text-amber-400">Статьи</a> · {data}</p>
  <h1 class="font-heading font-bold text-3xl sm:text-5xl leading-tight mt-3 mb-6">{title}</h1>

  <article class="statya">
{telo}
  </article>

  <aside class="mt-12 bg-stone-800 border border-stone-700 rounded-2xl p-6">
    <p class="font-heading font-bold text-xl">Посчитать на свою стену</p>
    <p class="text-stone-300 mt-2">
      Калькулятор на главной посчитает площадь, количество плиток и стоимость.
      Образцы можно потрогать в шоуруме на Рабочей, 185В — образец увезёте бесплатно.
    </p>
    <div class="mt-4 flex flex-wrap gap-3">
      <a href="/#raschet-sec" class="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold px-6 py-3 rounded-xl transition-colors">Открыть расчёт</a>
      <a href="/#catalog" class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold px-6 py-3 rounded-xl transition-colors">Посмотреть цвета</a>
    </div>
  </aside>
</main>

<footer class="border-t border-stone-800 py-8 text-center text-stone-500 text-sm">
  <a href="/" class="hover:text-amber-400">Гибкий кирпич в Саранске</a> · ул. Рабочая, 185В
</footer>
</body>
</html>
"""

SHABLON_INDEX = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Статьи о гибком кирпиче — монтаж, отличия, выбор | Саранск</title>
<meta name="description" content="Как клеить гибкий кирпич, чем он отличается от клинкера, что такое стеклосетка и сколько материала нужно. Разбираем по опыту своего производства в Саранске.">
<link rel="canonical" href="{sait}/blog/">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/css/fonts.css?v={v_fonts}">
<link rel="stylesheet" href="/css/site.css?v={v_site}">
<link rel="stylesheet" href="/css/ui.css?v={v_ui}">
</head>
<body class="bg-stone-900 font-sans text-white antialiased">

<header class="fixed top-0 left-0 right-0 z-50 bg-stone-900/90 backdrop-blur-sm border-b border-stone-800">
  <div class="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 md:flex-col md:items-start md:gap-0 leading-tight">
      <span class="font-heading font-bold text-amber-500 text-xl tracking-wide uppercase">Гибкий Кирпич</span>
      <span class="text-xs text-stone-300 md:text-[10px] md:text-stone-400">г. Саранск, ул. Рабочая, 185В</span>
    </a>
    <nav class="hidden md:flex items-center gap-6 text-sm text-stone-300">
      <a href="/#catalog" class="hover:text-amber-400 transition-colors">Каталог</a>
      <a href="/#raschet-sec" class="hover:text-amber-400 transition-colors">Расчёт</a>
      <a href="/blog/" class="text-amber-400">Статьи</a>
      <a href="/#contact" class="hover:text-amber-400 transition-colors">Контакты</a>
    </nav>
  </div>
</header>

<main class="max-w-3xl mx-auto px-4 pt-24 pb-16">
  <h1 class="font-heading font-bold text-4xl sm:text-5xl leading-tight">Статьи</h1>
  <p class="text-stone-300 mt-3 max-w-2xl">
    Отвечаем на вопросы, которые задают перед покупкой: чем гибкий кирпич отличается
    от клинкера, как его клеить и что за сетка с изнанки. Без рекламных обещаний —
    по опыту своего производства.
  </p>

  <div class="mt-10 space-y-4">
{spisok}
  </div>
</main>

<footer class="border-t border-stone-800 py-8 text-center text-stone-500 text-sm">
  <a href="/" class="hover:text-amber-400">Гибкий кирпич в Саранске</a> · ул. Рабочая, 185В
</footer>
</body>
</html>
"""


def versiya(otn: str) -> str:
    """Метка версии по содержимому файла — иначе браузер отдаст старый CSS из кэша."""
    import hashlib
    f = KOREN / otn
    return hashlib.sha1(f.read_bytes()).hexdigest()[:8] if f.exists() else "1"


def sobrat(check: bool = False) -> int:
    if not POSTS.exists():
        print(f"нет папки {POSTS}")
        return 1

    v = {"v_fonts": versiya("css/fonts.css"), "v_site": versiya("css/site.css"),
         "v_ui": versiya("css/ui.css")}
    md = markdown.Markdown(extensions=["tables", "attr_list"])
    stati = []

    for f in sorted(POSTS.glob("*.md")):
        meta, telo_md = razobrat(f.read_text(encoding="utf-8"))
        if not meta.get("title"):
            print(f"⚠️  {f.name}: нет заголовка в шапке — пропускаю")
            continue
        slug = f.stem
        md.reset()
        telo = md.convert(telo_md)
        canonical = f"{SAIT}/blog/{slug}/"

        jsonld = ('{"@context":"https://schema.org","@type":"Article",'
                  f'"headline":{html_json(meta["title"])},'
                  f'"description":{html_json(meta.get("description", ""))},'
                  f'"datePublished":"{meta.get("date", "")}",'
                  f'"mainEntityOfPage":"{canonical}",'
                  '"publisher":{"@type":"Organization","name":"Гибкий Кирпич",'
                  f'"url":"{SAIT}/"}}}}')

        kw = meta.get("keywords", "")
        stranica = SHABLON.format(
            title=html.escape(meta["title"]),
            description=html.escape(meta.get("description", "")),
            keywords_meta=f'<meta name="keywords" content="{html.escape(kw)}">\n' if kw else "",
            canonical=canonical,
            data=data_po_russki(meta.get("date", "")),
            telo=telo,
            jsonld=jsonld,
            **v)

        papka = BLOG / slug
        if not check:
            papka.mkdir(parents=True, exist_ok=True)
            (papka / "index.html").write_text(stranica, encoding="utf-8")
        stati.append((meta, slug))
        print(f"  ✓ /blog/{slug}/ — {meta['title']}")

    # Список статей: новые сверху
    stati.sort(key=lambda x: x[0].get("date", ""), reverse=True)
    karto4ki = []
    for meta, slug in stati:
        karto4ki.append(
            f'''    <a href="/blog/{slug}/" class="block bg-stone-800 border border-stone-700 rounded-2xl p-6
       hover:border-amber-600 transition-colors">
      <p class="text-stone-500 text-xs">{data_po_russki(meta.get("date", ""))}</p>
      <h2 class="font-heading font-bold text-2xl mt-1">{html.escape(meta["title"])}</h2>
      <p class="text-stone-300 mt-2">{html.escape(meta.get("description", ""))}</p>
      <span class="inline-block mt-3 text-amber-400 font-semibold">Читать →</span>
    </a>''')

    if not check:
        (BLOG / "index.html").write_text(
            SHABLON_INDEX.format(spisok="\n".join(karto4ki), sait=SAIT, **v), encoding="utf-8")
        obnovit_sitemap([s for _, s in stati])

    print(f"\nсобрано статей: {len(stati)}")
    return 0


def html_json(s: str) -> str:
    """Строка для JSON-LD: кавычки внутри заголовка ломают разметку."""
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


def obnovit_sitemap(slugs: list[str]) -> None:
    """Блог должен попасть в карту сайта, иначе поисковик найдёт его нескоро."""
    f = KOREN / "sitemap.xml"
    if not f.exists():
        return
    x = f.read_text(encoding="utf-8")
    x = re.sub(r"\n?  <!-- блог -->.*?(?=</urlset>)", "\n", x, flags=re.S)
    segodnya = date.today().isoformat()
    bloki = [f"  <!-- блог -->\n  <url>\n    <loc>{SAIT}/blog/</loc>\n"
             f"    <lastmod>{segodnya}</lastmod>\n    <priority>0.7</priority>\n  </url>"]
    for s in slugs:
        bloki.append(f"  <url>\n    <loc>{SAIT}/blog/{s}/</loc>\n"
                     f"    <lastmod>{segodnya}</lastmod>\n    <priority>0.6</priority>\n  </url>")
    x = x.replace("</urlset>", "\n".join(bloki) + "\n</urlset>")
    f.write_text(x, encoding="utf-8")
    print(f"  ✓ sitemap.xml: добавлено {len(slugs) + 1} адресов")


def peresobrat_css() -> None:
    """Стили собираются ПО СТРАНИЦАМ, поэтому сборку зовём после их записи.
    Классы, встречающиеся только в статьях (например отступ под шапку), иначе
    не попадут в CSS — проверено: заголовок статьи уезжал под шапку."""
    import subprocess, shutil
    if not shutil.which("npx"):
        print("  ⚠️  npx не найден — CSS не пересобран, классы блога могут отсутствовать")
        return
    r = subprocess.run(["npx", "--yes", "tailwindcss@3.4.17", "-c", "tailwind.config.js",
                        "-i", "css/input.css", "-o", "css/site.css", "--minify"],
                       cwd=KOREN, capture_output=True, text=True, shell=True)
    print("  ✓ css/site.css пересобран" if r.returncode == 0 else f"  ⚠️  сборка CSS: {r.stderr[:120]}")


if __name__ == "__main__":
    kod = sobrat(check="--check" in sys.argv)
    if kod == 0 and "--check" not in sys.argv:
        peresobrat_css()
        sobrat()          # второй проход: проставить свежие метки версий CSS
    sys.exit(kod)
