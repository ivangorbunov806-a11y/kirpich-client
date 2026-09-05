/*
 * obrazec.js — просмотр образца цвета крупно.
 *
 * ЗАЧЕМ. Главный вопрос покупателя перед поездкой в шоурум — «а вживую так же выглядит?».
 * В каталоге образец показан карточкой шириной 268 px, зерно и оттенок на ней не разобрать,
 * а фотографии стенда лежат в разрешении 600-800 px и годятся для крупного показа.
 *
 * ПОЧЕМУ БЕЗ БИБЛИОТЕКИ. Готовые лайтбоксы весят 20-40 КБ и тянут свои стили; здесь нужно
 * открыть картинку, подписать её и закрыться. Делегирование на секции каталога — один
 * обработчик вместо двенадцати.
 *
 * ДЕГРАДАЦИЯ. Скрипт не загрузился — карточки остаются обычными карточками, каталог
 * работает как раньше. Ничего не скрыто заранее, ничего не ломается.
 */
(function () {
  'use strict';

  var catalog = document.getElementById('catalog');
  if (!catalog) return;

  var box = null;          // сам оверлей, создаётся при первом открытии
  var lastFocused = null;  // куда вернуть фокус после закрытия

  function build() {
    box = document.createElement('div');
    box.className = 'obrazec';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Образец цвета крупно');
    box.hidden = true;
    box.innerHTML =
      '<button class="obrazec__close" type="button" aria-label="Закрыть">✕</button>' +
      '<figure class="obrazec__fig">' +
      '  <img class="obrazec__img" alt="">' +
      '  <figcaption class="obrazec__cap"></figcaption>' +
      '</figure>';
    document.body.appendChild(box);

    box.addEventListener('click', function (e) {
      // клик мимо картинки и клик по крестику закрывают — обычное ожидание от такого окна
      if (e.target === box || e.target.closest('.obrazec__close')) close();
    });
  }

  function open(img, title, price) {
    if (!box) build();
    lastFocused = document.activeElement;
    // ⭐ В карточке теперь стоит МИНИАТЮРА (536 px), а крупно надо показать полный
    // файл образца — его адрес лежит в data-full. Без этого при увеличении был бы
    // виден растянутый эскиз. Если data-full нет (старая разметка) — берём как раньше.
    box.querySelector('.obrazec__img').src =
      img.getAttribute('data-full') || img.currentSrc || img.src;
    box.querySelector('.obrazec__img').alt = img.alt || title || '';
    box.querySelector('.obrazec__cap').textContent =
      [title, price, 'реальное фото стенда в шоуруме'].filter(Boolean).join(' · ');
    box.hidden = false;
    document.body.style.overflow = 'hidden';       // фон не прокручивается под окном
    box.querySelector('.obrazec__close').focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  catalog.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;      // ссылки и кнопки работают как обычно
    // Карточка каталога — .catalog-card: название и цена лежат в ней, ниже картинки.
    // Раньше брался ближайший div, а им оказывалась обёртка вокруг одной лишь картинки,
    // и подпись открывалась без названия цвета и цены.
    var card = e.target.closest('.catalog-card') || e.target.closest('figure, article');
    var img = card && card.querySelector('img');
    if (!img) return;
    var h = card.querySelector('h3, h4, .font-heading, .font-semibold');
    var price = card.textContent.match(/от\s*\d[\d\s ]*₽\/м²/);
    open(img, h ? h.textContent.trim() : '', price ? price[0] : '');
  });
})();

/*
 * Ролик по клику. Файл весит 2,3 МБ — грузить его всем ради тех, кто досмотрит,
 * нельзя. До нажатия в разметке лежит только картинка-постер на 27 КБ; <video>
 * создаётся в момент клика, поэтому браузер не начинает качать заранее.
 * Без скрипта работает <noscript>-ссылка прямо на файл.
 */
(function () {
  'use strict';
  var knopka = document.querySelector('.rolik-play');
  if (!knopka) return;

  knopka.addEventListener('click', function () {
    var v = document.createElement('video');
    v.src = knopka.getAttribute('data-src');
    v.controls = true;
    v.autoplay = true;
    v.playsInline = true;            // иначе iOS открывает своё полноэкранное окно
    v.className = 'rolik-video';
    v.setAttribute('aria-label', 'Ролик про гибкий кирпич');
    knopka.parentNode.replaceChild(v, knopka);
    v.focus();
  });
})();

/*
 * Луп-доказательство играет ТОЛЬКО пока он на экране.
 * Причина не в красоте: с постоянным autoplay страница никогда не «затихает» —
 * браузер держит поток, на телефоне это лишний трафик, а инструменты проверки
 * зависают на ожидании тишины в сети. Ушёл из кадра — пауза.
 */
(function () {
  'use strict';
  var v = document.querySelector('video[data-avtoplay]');
  if (!v) return;
  if (!('IntersectionObserver' in window)) { v.play().catch(function () {}); return; }
  new IntersectionObserver(function (zapisi) {
    zapisi.forEach(function (z) {
      if (z.isIntersecting) v.play().catch(function () {});   // отказ автозапуска — не ошибка
      else v.pause();
    });
  }, { threshold: 0.25 }).observe(v);
})();
