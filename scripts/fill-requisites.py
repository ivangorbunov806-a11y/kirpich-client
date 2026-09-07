#!/usr/bin/env python3
"""Подставляет реквизиты клиента в HTML-шаблон и складывает готовый сайт в dist/.

ЗАЧЕМ ЭТО СКРИПТОМ, А НЕ МОДЕЛЬЮ. Подстановка значений — механическая операция, и делать её
должен детерминированный код: он не потеряет цифру в ИНН и не «улучшит» формат ОГРНИП.
Языковая модель вероятностна, ей здесь нечего делать. Модель уместна на другом шаге —
прочитать готовую страницу и сказать, чего не хватает.

ЗАЧЕМ РАЗДЕЛЕНИЕ НА ШАБЛОН И ДАННЫЕ. В git и в переписку с ИИ уходит только index.html
с тегами вида #INN# — там нет ничего личного. Настоящие значения лежат в
requisites.local.json, который в .gitignore и машину не покидает. Подробно —
docs/runbook/client-requisites-local.md в проекте content-factory.

ЗАПУСК (из папки сайта):
    python scripts/fill-requisites.py

Пути можно переопределить: --template, --data, --out.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# ⚠️ Консоль Windows по умолчанию в cp1251 и падает на «✓»/«⚠» с UnicodeEncodeError —
# поймано живьём 26.08.2026 при первом же прогоне. Переключаем вывод на UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent

# Поля, без которых страница не соответствует требованиям к сведениям о продавце
# (ст. 7 149-ФЗ + закон о защите прав потребителей). Проверяем ДО записи файла:
# лучше отказаться собрать, чем выложить сайт с половиной реквизитов.
REQUIRED = ("IP_FIO", "OGRNIP", "INN", "IP_ADDRESS", "EMAIL")


def load_data(path: Path) -> dict[str, str]:
    """Читает JSON с реквизитами, отбрасывая строки-подсказки (ключи с подчёркивания)."""
    if not path.exists():
        sys.exit(
            f"✗ Нет файла с данными: {path}\n"
            f"  Скопируйте {path.name}.example → {path.name} и впишите реквизиты клиента."
        )
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {k: str(v) for k, v in raw.items() if not k.startswith("_")}


def check_required(data: dict[str, str]) -> None:
    missing = [k for k in REQUIRED if not data.get(k, "").strip()]
    if missing:
        sys.exit(
            "✗ Не заполнены обязательные поля: " + ", ".join(missing) + "\n"
            "  Без них страница не соответствует требованиям к сведениям о продавце."
        )
    # ⛔ ЗАГЛУШКИ ОБРАЗЦА — ЭТО НЕ ЗАПОЛНЕННЫЕ ПОЛЯ (поймано живьём 05.09.2026).
    # Файл скопировали из .example и запустили сборку, не вписав значения. Проверка
    # на пустоту такое пропускала: строка «ДВЕНАДЦАТЬ ЦИФР ПОДРЯД» непустая, и сайт
    # собрался с подсказками вместо реквизитов. Ровно тот случай, когда шаг отработал
    # «успешно» и промолчал о том, что результат негодный.
    # Сравниваем с настоящим содержимым .example, а не с зашитым списком: образец
    # правится, а копия списка в коде разъедется — это уже было с pdn_rules.
    obrazec = ROOT / "requisites.local.json.example"
    if obrazec.exists():
        try:
            proba = json.loads(obrazec.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            proba = {}
        zaglushki = [k for k in REQUIRED
                     if data.get(k, "").strip() == str(proba.get(k, "")).strip()]
        if zaglushki:
            sys.exit(chr(10).join([
                "✗ В полях остались подсказки из образца: " + ", ".join(zaglushki),
                "  Файл скопирован из requisites.local.json.example, но значения не вписаны.",
                "  Откройте requisites.local.json и замените описания вида",
                "  «ДВЕНАДЦАТЬ ЦИФР ПОДРЯД» на настоящие данные клиента.",
                "  Строки, начинающиеся с подчёркивания, — подсказки, их трогать не нужно.",
            ]))

    # Формат проверяем мягко: предупреждаем, но не блокируем — вдруг у клиента
    # действительно нестандартный случай, а сборку срывать из-за этого неправильно.
    if not re.fullmatch(r"\d{15}", data["OGRNIP"]):
        print(f"  ⚠ ОГРНИП обычно 15 цифр, а тут {len(data['OGRNIP'])}: {data['OGRNIP']}")
    if not re.fullmatch(r"\d{12}", data["INN"]):
        print(f"  ⚠ ИНН у ИП обычно 12 цифр, а тут {len(data['INN'])}: {data['INN']}")
    if len(data["IP_FIO"].split()) < 3:
        print("  ⚠ ФИО указано не полностью — инициалы требование не закрывают")


def main() -> int:
    ap = argparse.ArgumentParser(description="Подстановка реквизитов в HTML")
    # ⚠️ Шаблонов теперь несколько: 27.08.2026 добавился spec.html (лист спецификации),
    # и реквизиты живут именно на нём. Со старым одношаблонным вызовом на прод уехала бы
    # страница с сырыми тегами #INN# — а сборка отрапортовала бы «Готово».
    ap.add_argument("--template", type=Path, action="append", default=None,
                    help="можно указать несколько раз; по умолчанию index.html и spec.html")
    ap.add_argument("--data", type=Path, default=ROOT / "requisites.local.json")
    ap.add_argument("--out-dir", type=Path, default=ROOT / "dist")
    a = ap.parse_args()

    templates = a.template or [ROOT / "index.html", ROOT / "spec.html"]
    templates = [t for t in templates if t.exists()]
    if not templates:
        sys.exit("✗ Не найдено ни одного шаблона")

    data = load_data(a.data)
    check_required(data)

    # Подставляем и считаем: сколько тегов заменено — видно сразу, а не «кажется, сработало».
    a.out_dir.mkdir(parents=True, exist_ok=True)
    replaced = 0
    gotovye: list[tuple[Path, str]] = []
    for tpl in templates:
        html = tpl.read_text(encoding="utf-8")
        for key, value in data.items():
            tag = f"#{key}#"
            n = html.count(tag)
            if n:
                html = html.replace(tag, value)
                replaced += n

        # Незакрытые теги — это дырка на боевой странице, поэтому останавливаемся.
        left = re.findall(r"#([A-Z_]{3,})#", html)
        if left:
            sys.exit(f"✗ В {tpl.name} остались незаполненные теги: {', '.join(sorted(set(left)))}")

        out = a.out_dir / tpl.name
        out.write_text(html, encoding="utf-8")
        gotovye.append((out, html))

    # Копируем статику рядом, чтобы dist/ был самодостаточным и его можно было выложить как есть.
    copied = []
    # ⚠️ Список пополняется вручную при появлении новых папок. 26.08.2026 сюда добавлен
    # fonts/: шрифты переехали с внешнего хоста к нам, и без этой строки на прод уехала
    # бы страница без шрифтов — сборка при этом отработала бы «успешно».
    # ⚠️ Список пополняется вручную, и это ловушка: 04.09.2026 сюда не были добавлены
    # blog/ и video/, появившиеся позже — скрипт собрал dist/ без них и сам же поймал
    # это проверкой ссылок. Добавляя на сайт новую папку, дописывать её СЮДА.
    for name in ("css", "js", "img", "fonts", "video", "blog",
                 "favicon.svg", "robots.txt", "sitemap.xml"):
        src = ROOT / name
        if not src.exists():
            continue
        dst = a.out_dir / name
        if src.is_dir():
            import shutil
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            import shutil
            shutil.copy2(src, dst)
        copied.append(name)

    # Сверка границы: всё, на что ссылается страница, обязано существовать в dist/.
    # Без этой проверки сборка молча выкладывает сайт с битыми ссылками.
    missing = []
    for _out, html in gotovye:
        for m in re.finditer(r'(?:src|href)="((?!http|#|tel:|mailto:)[^"]+)"', html):
            rel = m.group(1).split("?")[0]
            if not rel or rel.startswith("data:"):
                continue
            # ⚠️ Корневые пути («/css/site.css») в Path-склейке ЗАМЕЩАЮТ левую часть
            # и превращаются в C:/css/... — проверка молча искала бы файл не там.
            # Приводим к пути внутри dist/ явным срезом ведущего слэша.
            rel = rel.lstrip("/") or "index.html"
            if not (a.out_dir / rel).exists():
                missing.append(rel)
    if missing:
        sys.exit("✗ В dist/ не хватает файлов, на которые ссылается страница: "
                 + ", ".join(sorted(set(missing))))

    for out, _ in gotovye:
        print(f"✓ Готово: {out}")
    print(f"  подставлено значений: {replaced}")
    if copied:
        print(f"  скопирована статика: {', '.join(copied)}")
    print("\n  Публиковать содержимое dist/. В git едет шаблон, не dist/.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
