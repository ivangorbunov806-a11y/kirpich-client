/*
 * menu.js — мелкие удобства для меню разделов на телефоне.
 *
 * Само меню — нативный <details>: раскрывается и закрывается браузером, без
 * скриптов. Здесь только то, чего <details> не умеет и без чего он раздражает:
 * закрыться после выбора пункта и закрыться при нажатии мимо. Если этот файл
 * не загрузится, меню останется рабочим — просто придётся закрывать его тем же
 * значком. Так и задумано: навигация не должна зависеть от скрипта.
 */
(function () {
  'use strict';
  var m = document.getElementById('menu-mob');
  if (!m) return;


  // Пункт «Позвонить» ведёт в раздел контактов, а если на странице есть готовая
  // ссылка звонка — подставляем её, чтобы с телефона звонок шёл в один тап.
  // Номер намеренно НЕ продублирован в разметке меню: он должен жить в одном
  // месте, иначе при смене разъедется по копиям (и защита от ПДн справедливо
  // ругается на каждую новую).
  var zvonok = document.querySelector('a[href^="tel:"]');
  var punkt = m.querySelector('[data-tel]');
  if (zvonok && punkt) punkt.href = zvonok.getAttribute('href');

  // Выбрали раздел — список сворачиваем: иначе он накрывает начало секции,
  // к которой человек только что перешёл.
  m.addEventListener('click', function (e) {
    if (e.target.closest('a')) m.removeAttribute('open');
  });

  // Нажатие мимо меню закрывает его — обычное ожидание от выпадающего списка.
  document.addEventListener('click', function (e) {
    if (m.hasAttribute('open') && !m.contains(e.target)) m.removeAttribute('open');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') m.removeAttribute('open');
  });
})();
