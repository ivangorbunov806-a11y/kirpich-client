/*
 * stena.js — интерактивная кладка в секции «Потрогайте вживую».
 *
 * ЗАМЫСЕЛ. Курсор (или палец) раздвигает кирпичи: материал в жизни как раз
 * поддаётся — гнётся, режется ножницами. Эффект показывает свойство товара,
 * а не украшает страницу.
 *
 * ПОЧЕМУ ТАК СДЕЛАНО, А НЕ ИНАЧЕ:
 * · кирпичи ставятся абсолютно и двигаются ТОЛЬКО через transform — это работа
 *   для GPU; менять left/top значит пересчитывать раскладку на каждый кадр;
 * · координаты курсора складываются в переменную, а рисование идёт в
 *   requestAnimationFrame: событий указателя приходит больше, чем кадров;
 * · на телефоне кирпичи крупнее и их меньше — 200 элементов на слабом аппарате
 *   заметно греют и жрут батарею;
 * · при `prefers-reduced-motion` стена собирается, но не реагирует: движение
 *   здесь украшение, а содержание секции — текст и кнопка.
 *
 * Без скрипта секция выглядит как тёмный блок с заголовком и кнопкой. Ничего
 * не ломается и ничего не пропадает.
 */
(function () {
  'use strict';

  var wall = document.querySelector('.stena-wall');
  if (!wall) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;

  var BRICK_W = touch ? 84 : 104;     // ширина кирпича, px
  var BRICK_H = Math.round(BRICK_W / 3.7);   // пропорция настоящей плитки 240×65
  var GAP = touch ? 5 : 6;
  var RADIUS = touch ? 130 : 170;     // на каком расстоянии кирпич начинает отходить
  var PUSH = touch ? 26 : 34;         // насколько далеко отходит ближайший

  var bricks = [];
  var vozvrat;
  var mouse = { x: -9999, y: -9999 };
  var tick = null;

  function build() {
    wall.innerHTML = '';
    bricks = [];
    var w = wall.clientWidth, h = wall.clientHeight;
    if (!w || !h) return;

    var stepX = BRICK_W + GAP, stepY = BRICK_H + GAP;
    var cols = Math.ceil(w / stepX) + 2;
    var rows = Math.ceil(h / stepY) + 2;

    var frag = document.createDocumentFragment();
    for (var r = 0; r < rows; r++) {
      // перевязка со смещением в половину кирпича — как в настоящей кладке
      var offset = (r % 2) ? -stepX / 2 : 0;
      for (var c = 0; c < cols; c++) {
        var x = c * stepX + offset - stepX;
        var y = r * stepY - stepY;
        var el = document.createElement('i');
        el.className = 'brick';
        // Оттенки раскиданы неравномерно: ровное чередование читается как обои.
        var t = (r * 7 + c * 3) % 11;
        if (t === 1 || t === 6) el.className += ' brick--2';
        else if (t === 3) el.className += ' brick--3';
        else if (t === 8) el.className += ' brick--4';
        else if (t === 10) el.className += ' brick--5';
        el.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + BRICK_W + 'px;height:' + BRICK_H + 'px';
        frag.appendChild(el);
        bricks.push({ el: el, cx: x + BRICK_W / 2, cy: y + BRICK_H / 2, dx: 0, dy: 0 });
      }
    }
    wall.appendChild(frag);
  }

  function draw() {
    tick = null;
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      var dx = b.cx - mouse.x, dy = b.cy - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var tx = 0, ty = 0, rot = 0;
      if (dist < RADIUS && dist > 0.001) {
        var sila = (1 - dist / RADIUS);          // ближе к курсору — сильнее
        sila = sila * sila;                      // затухание мягче линейного
        tx = (dx / dist) * PUSH * sila;
        ty = (dy / dist) * PUSH * sila;
        rot = (dx > 0 ? 1 : -1) * sila * 7;      // лёгкий разворот, кладка «сыплется»
      }
      // Пишем в стиль только когда есть что менять: лишние присваивания на
      // сотне элементов дают заметные подтормаживания на слабых машинах.
      if (tx !== b.dx || ty !== b.dy) {
        b.el.style.transform = tx || ty
          ? 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotate(' + rot.toFixed(1) + 'deg)'
          : '';
        b.dx = tx; b.dy = ty;
      }
    }
  }

  function zaprosit() {
    if (!tick) tick = requestAnimationFrame(draw);
  }

  function pointer(e) {
    clearTimeout(vozvrat);
    var r = wall.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    zaprosit();
  }

  build();
  if (reduce) return;

  var sec = document.getElementById('stena');
  sec.addEventListener('pointermove', pointer, { passive: true });
  sec.addEventListener('pointerdown', pointer, { passive: true });
  /* Возврат кладки. На мыши — сразу, как курсор ушёл. На телефоне палец убирают
     после каждого касания, и мгновенный сброс съедал весь эффект: тап давал
     нулевой результат. Поэтому на тач-экране кладка стоит раздвинутой ещё
     секунду и только потом сходится. */
  function otpustit(zaderzhka) {
    clearTimeout(vozvrat);
    vozvrat = setTimeout(function () {
      mouse.x = mouse.y = -9999;
      zaprosit();
    }, zaderzhka);
  }
  sec.addEventListener('pointerleave', function () { otpustit(touch ? 900 : 0); });
  sec.addEventListener('pointerup',    function () { otpustit(touch ? 900 : 0); });
  sec.addEventListener('pointercancel', function () { otpustit(touch ? 900 : 0); });

  // Пересборка при смене размера — с задержкой, иначе на каждый пиксель
  // перетаскивания окна пересобирается вся стена.
  var t;
  addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(build, 250);
  });

  /* Телефон: пальца на экране может не быть вовсе, и человек просто пролистает
     мимо. Один раз при появлении секции проводим «волну» — показываем, что
     кладка живая, дальше она отзывается на касание. */
  if (touch && 'IntersectionObserver' in window) {
    var pokazano = false;
    new IntersectionObserver(function (z) {
      if (!z[0].isIntersecting || pokazano) return;
      pokazano = true;
      var r = wall.getBoundingClientRect();
      var start = performance.now();
      (function volna(now) {
        var k = (now - start) / 1400;              // 1,4 с на проход
        if (k > 1) { mouse.x = mouse.y = -9999; zaprosit(); return; }
        mouse.x = r.width * k;
        mouse.y = r.height * (0.5 + Math.sin(k * Math.PI * 2) * 0.18);
        zaprosit();
        requestAnimationFrame(volna);
      })(start);
    }, { threshold: 0.4 }).observe(sec);
  }
})();
