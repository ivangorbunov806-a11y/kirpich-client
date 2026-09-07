#!/usr/bin/env bash
# Выкат сайта на российский сервер.
#
# ЗАЧЕМ ОТДЕЛЬНЫМ СКРИПТОМ. С 07.09.2026 сайт живёт не на GitHub Pages, а на
# своём сервере (`ssh rf`, 104.171.133.49, Caddy). Публикация «пушем в ветку»
# больше не работает, и вместо неё — одна команда отсюда.
#
# ПОЧЕМУ НЕ ЧЕРЕЗ GitHub Actions. Чтобы GitHub заливал файлы на сервер, ему
# нужен приватный ssh-ключ в секретах. Ключ от сервера в чужом облаке не стоит
# удобства: заливка занимает пять секунд и с машины Ивана.
#
# ЗАПУСК (из папки сайта):
#     bash scripts/deploy-rf.sh
#
# Что делает: собирает сайт с настоящими реквизитами (они в
# requisites.local.json, который в git не попадает), заливает содержимое dist/
# на сервер и проверяет, что сайт отвечает.
set -euo pipefail

SERVER="${DEPLOY_HOST:-rf}"
PAPKA="${DEPLOY_PATH:-/var/www/saranskdekor}"
SAIT="${DEPLOY_URL:-https://saranskdekor.ru/}"

cd "$(dirname "$0")/.."

echo "1/3 · собираю сайт с реквизитами"
python scripts/fill-requisites.py

# Проверка перед заливкой: тихий успех запрещён. Если подстановка не прошла,
# на сервер уедет страница с тегами вместо реквизитов — а заметят это не сразу.
if grep -qE '#(IP_FIO|OGRNIP|INN|IP_ADDRESS|EMAIL)#' dist/index.html; then
  echo "✗ В собранной странице остались неподставленные теги — выкат отменён." >&2
  exit 1
fi

echo "2/3 · заливаю на $SERVER:$PAPKA"
tar czf - -C dist . | ssh "$SERVER" "tar xzf - -C '$PAPKA'"

echo "3/3 · проверяю"
KOD=$(curl -s -o /dev/null -w '%{http_code}' "$SAIT" --max-time 30)
if [ "$KOD" = "200" ]; then
  echo "✓ Готово: $SAIT отвечает $KOD"
else
  echo "⚠ Сайт ответил $KOD — посмотрите логи Caddy: ssh $SERVER 'sudo journalctl -u caddy -n 30'" >&2
  exit 1
fi
