/*
 * stena.js — «снимите плёнку» в секции «Потрогайте вживую».
 *
 * ЗАМЫСЕЛ. Под пальцем или курсором с кладки сходит защитная плёнка, открывая
 * чистый кирпич. Это не украшение: ровно так материал и устроен — швы промазывают
 * прямо по плёнке, а потом её снимают, и стену не надо отмывать. Посетитель
 * проделывает рукой то, что делает монтажник.
 *
 * ПОЧЕМУ ИМЕННО ТАК:
 * · кладка собрана из ОДИННАДЦАТИ настоящих кирпичей, вырезанных из каталожных
 *   снимков стенда. Прежняя версия брала одну текстуру и красила её фильтрами —
 *   отсюда повтор одного зерна и оттенки, которых у товара нет (розовый, зелёный,
 *   серо-синий). Именно это читалось как мультяшность;
 * · плёнка живёт на canvas, а стирается композитным режимом destination-out:
 *   это единственный способ накапливать след, как при настоящем снятии. Маска
 *   на CSS так не умеет — она пересчитывается целиком на каждом кадре;
 * · координаты копятся в переменной, рисование идёт в requestAnimationFrame:
 *   событий указателя приходит больше, чем кадров;
 * · на телефоне кисть шире, а кирпичи крупнее: пальцем целятся хуже, чем мышью.
 *
 * Без скрипта секция — обычная кладка с заголовком и кнопками: canvas не создаётся,
 * ничего не пропадает.
 */
(function () {
  'use strict';

  var wall = document.querySelector('.stena-wall');
  if (!wall) return;

  // Номера соответствуют файлам img/brick-N.webp, нарезанным из каталожных снимков.
  // Повторы задают вес: чем чаще номер в наборе, тем больше таких кирпичей в стене.
  var NABOR = [4, 7, 9, 10, 1, 4, 5, 7, 2, 9, 10, 1, 4, 7, 6, 9, 4, 11, 10, 7, 8, 1, 4, 9, 3, 7];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;

  var BRICK_W = touch ? 96 : 116;
  var BRICK_H = Math.round(BRICK_W / 3.7);          // пропорция настоящей плитки 240×65
  var GAP = 4;
  var KIST = touch ? 46 : 38;                       // радиус стирания плёнки

  var canvas = null, ctx = null;
  var tochka = null, prev = null, tick = null;

  /* --- кладка ------------------------------------------------------------- */
  function build() {
    wall.innerHTML = '';
    var w = wall.clientWidth, h = wall.clientHeight;
    if (!w || !h) return;

    var stepX = BRICK_W + GAP, stepY = BRICK_H + GAP;
    var cols = Math.ceil(w / stepX) + 2;
    var rows = Math.ceil(h / stepY) + 2;
    var frag = document.createDocumentFragment();

    for (var r = 0; r < rows; r++) {
      var offset = (r % 2) ? -stepX / 2 : 0;        // перевязка в половину кирпича
      for (var c = 0; c < cols; c++) {
        var el = document.createElement('i');
        el.className = 'brick';
        // Состав кладки взвешенный, а не равномерный. Одиннадцать цветов вперемешку
        // читаются как ПАЛИТРА образцов, а не как стена: у реальной кладки есть
        // основной тон и редкие вкрапления. Тёплые песочно-терракотовые идут основой,
        // зелёный, бордо и слоновая кость — акцентами.
        var n = NABOR[(r * 7 + c * 5 + r * c) % NABOR.length];
        el.style.cssText =
          'left:' + (c * stepX + offset - stepX) + 'px;' +
          'top:' + (r * stepY - stepY) + 'px;' +
          'width:' + BRICK_W + 'px;height:' + BRICK_H + 'px;' +
          'background-image:url(img/brick-' + n + '.webp)';
        frag.appendChild(el);
      }
    }
    wall.appendChild(frag);
    if (!reduce) sozdatPlenku(w, h);
  }

  /* --- плёнка ------------------------------------------------------------- */
  function sozdatPlenku(w, h) {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'stena-plenka';
      wall.appendChild(canvas);
      ctx = canvas.getContext('2d');
    }
    var dpr = Math.min(devicePixelRatio || 1, 2);   // на 3x-экранах канва вчетверо тяжелее без выигрыша
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    narisovatPlenku(w, h);
  }

  function narisovatPlenku(w, h) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // Сама плёнка: холодная белесая полупрозрачная плоскость.
    ctx.fillStyle = 'rgba(228, 238, 245, 0.40)';   // плотнее — и кирпич под плёнкой теряет цвет
    ctx.fillRect(0, 0, w, h);

    // Блики и складки — иначе слой читается как туман, а не как плёнка.
    for (var i = 0; i < 7; i++) {
      var x = (i * 0.17 + 0.05) * w;
      var g = ctx.createLinearGradient(x, 0, x + w * 0.10, h);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,' + (0.13 + (i % 3) * 0.06) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - w * 0.06, 0, w * 0.22, h);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    for (var k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.1 + k * 0.2), 0);
      ctx.lineTo(w * (0.02 + k * 0.2), h);
      ctx.stroke();
    }
  }

  /* --- стирание ------------------------------------------------------------ */
  function risovat() {
    tick = null;
    if (!ctx || !tochka) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = KIST * 2;
    ctx.beginPath();
    if (prev) { ctx.moveTo(prev.x, prev.y); ctx.lineTo(tochka.x, tochka.y); }
    else { ctx.moveTo(tochka.x, tochka.y); ctx.lineTo(tochka.x + 0.1, tochka.y); }
    ctx.stroke();
    prev = tochka;
  }

  function ukazatel(e) {
    if (!canvas) return;
    var r = wall.getBoundingClientRect();
    tochka = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!tick) tick = requestAnimationFrame(risovat);
  }

  build();
  if (reduce) return;

  var sec = document.getElementById('stena');
  sec.addEventListener('pointermove', ukazatel, { passive: true });
  sec.addEventListener('pointerdown', ukazatel, { passive: true });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) {
    // Разрываем линию: иначе следующее касание дорисует отрезок от прошлой точки
    // через полстены — след получался как царапина, а не как снятая плёнка.
    sec.addEventListener(t, function () { prev = null; });
  });

  var t;
  addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(build, 250);            // пересборка целиком: плёнка возвращается
  });

  /* Показ механики. Человек не догадается провести рукой по картинке, если ему
     не показать: при появлении секции сами снимаем полосу плёнки по диагонали.
     На телефоне это единственный шанс — там нет наведения курсора. */
  if ('IntersectionObserver' in window) {
    var pokazano = false;
    new IntersectionObserver(function (z) {
      if (!z[0].isIntersecting || pokazano || !canvas) return;
      pokazano = true;
      var r = wall.getBoundingClientRect();
      var start = performance.now();
      prev = null;
      (function volna(now) {
        var k = (now - start) / 1100;
        if (k > 1) { prev = null; return; }
        tochka = { x: r.width * (0.12 + k * 0.62), y: r.height * (0.62 - k * 0.16) };
        risovat();
        requestAnimationFrame(volna);
      })(start);
    }, { threshold: 0.35 }).observe(sec);
  }
})();
