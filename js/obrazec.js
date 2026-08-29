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
    box.querySelector('.obrazec__img').src = img.currentSrc || img.src;
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
