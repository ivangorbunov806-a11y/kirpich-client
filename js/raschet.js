/*
 * raschet.js — расчёт материала и стоимости.
 *
 * ЗАЧЕМ. Главный вопрос покупателя — «сколько надо на мою стену и во что встанет
 * всё вместе». Пока он считает это сам в уме, он не звонит.
 *
 * ЧТО СЧИТАЕМ И ОТКУДА ЧИСЛА:
 * · площадь = длина × высота, минус проёмы, которые человек вычитает сам;
 * · плитка 240 × 65 мм при шве 5 мм занимает 0,245 × 0,070 = 0,01715 м²,
 *   значит в квадратном метре 58,3 штуки — округляем вверх;
 * · запас 5 % на подрезку: на арках и углах лист режется, остатки не всегда идут в дело;
 * · цена 900 ₽/м², от 100 м² — 810 ₽/м² (порог срабатывает сам);
 * · клей НЕ считаем: расход зависит от основания и гребёнки, а выдумывать цифру
 *   в расчёте, который человек понесёт в магазин, нельзя. Спросим у клиента —
 *   появится строка.
 *
 * ПЕРСОНАЛЬНЫХ ДАННЫХ НЕТ. Ни одного поля с именем или телефоном: расчёт целиком
 * живёт в браузере, никуда не отправляется, итог человек забирает сам — копирует
 * или несёт в разговор. Поэтому и согласия на обработку не требуется.
 */
(function () {
  'use strict';

  var form = document.getElementById('raschet');
  if (!form) return;

  var PLITOK_V_M2 = 58.3;      // 0,245 × 0,070 м с учётом шва 5 мм
  var ZAPAS = 0.05;            // 5 % на подрезку
  var CENA = 900;
  var CENA_OPT = 810;
  var PORAG_OPT = 100;         // м², с которых действует оптовая цена

  var el = {
    dlina: form.querySelector('[name=dlina]'),
    vysota: form.querySelector('[name=vysota]'),
    proemy: form.querySelector('[name=proemy]'),
    ploshad: form.querySelector('[data-out=ploshad]'),
    plitok: form.querySelector('[data-out=plitok]'),
    cena: form.querySelector('[data-out=cena]'),
    itog: form.querySelector('[data-out=itog]'),
    zametka: form.querySelector('[data-out=zametka]')
  };

  function chislo(input) {
    var v = parseFloat(String(input.value).replace(',', '.'));
    return isFinite(v) && v > 0 ? v : 0;
  }

  function razryady(n) {
    // 12 345 → «12 345»: неразрывный пробел, чтобы число не рвалось на две строки
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function schitat() {
    var d = chislo(el.dlina), v = chislo(el.vysota), pr = chislo(el.proemy);
    var s = Math.max(0, d * v - pr);

    if (!s) {
      el.ploshad.textContent = '—';
      el.plitok.textContent = '—';
      el.cena.textContent = '—';
      el.itog.textContent = '—';
      el.zametka.textContent = 'Введите длину и высоту стены.';
      return;
    }

    var sZapasom = s * (1 + ZAPAS);
    var cena = sZapasom >= PORAG_OPT ? CENA_OPT : CENA;

    el.ploshad.textContent = sZapasom.toFixed(1).replace('.', ',') + ' м²';
    el.plitok.textContent = razryady(Math.ceil(sZapasom * PLITOK_V_M2)) + ' шт';
    el.cena.textContent = cena + ' ₽/м²';
    el.itog.textContent = razryady(sZapasom * cena) + ' ₽';

    if (cena === CENA_OPT) {
      el.zametka.textContent = 'От 100 м² действует оптовая цена — она уже учтена. '
        + 'В расчёте есть запас 5 % на подрезку.';
    } else {
      var doOpta = Math.ceil(PORAG_OPT - sZapasom);
      el.zametka.textContent = 'В расчёте есть запас 5 % на подрезку. '
        + 'До оптовой цены 810 ₽/м² не хватает ' + doOpta + ' м².';
    }
  }

  form.addEventListener('input', schitat);
  form.addEventListener('submit', function (e) { e.preventDefault(); schitat(); });

  // Пресеты: большинству проще ткнуть «стена 3 × 2,5», чем набирать цифры на телефоне.
  form.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-preset').split('x');
      el.dlina.value = p[0];
      el.vysota.value = p[1];
      el.proemy.value = '';
      schitat();
      el.dlina.focus();
    });
  });

  schitat();
})();
