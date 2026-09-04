/*
 * raschet.js — расчёт материала и стоимости.
 *
 * ЗАЧЕМ. Главный вопрос покупателя — «сколько надо на мою стену и во что встанет
 * всё вместе». Пока он считает это сам в уме, он не звонит.
 *
 * ⭐ СЧИТАЕМ ЛИСТАМИ, А НЕ КВАДРАТНЫМИ МЕТРАМИ (правка 04.09.2026 по слову Ивана).
 * Материал отпускается листами по 0,5 м², и дробное число метров купить нельзя:
 * расчёт «нужно 7,9 м²» в магазине всё равно превратится в 16 листов. Поэтому
 * площадь округляется ВВЕРХ до целого листа, а цена считается от того, что
 * человек реально оплатит. Иначе итог на сайте не сойдётся с чеком — а это
 * худший вид ошибки: она обнаруживается уже у кассы.
 *
 * ОСТАЛЬНЫЕ ЧИСЛА И ИХ ОСНОВАНИЯ:
 * · плитка 240 × 65 мм при шве 5 мм занимает 0,245 × 0,070 = 0,01715 м²,
 *   значит в квадратном метре 58,3 штуки, в листе — около 29;
 * · запас 5 % на подрезку: на арках и углах лист режется, остатки не всегда в дело;
 * · цена 1090 ₽/м², от 100 м² — 990 ₽/м² (порог срабатывает сам);
 *   ⚠️ цены живут ЗДЕСЬ и в разметке — при следующем изменении править оба места;
 * · клей НЕ считаем: расход зависит от основания и гребёнки, а выдумывать цифру
 *   в расчёте, который человек понесёт в магазин, нельзя.
 *
 * ПЕРСОНАЛЬНЫХ ДАННЫХ НЕТ. Ни одного поля с именем или телефоном: расчёт целиком
 * живёт в браузере, никуда не отправляется, согласия на обработку не требуется.
 */
(function () {
  'use strict';

  var form = document.getElementById('raschet');
  if (!form) return;

  var LIST_M2 = 0.5;           // площадь одного листа
  var PLITOK_V_M2 = 58.3;      // 0,245 × 0,070 м с учётом шва 5 мм
  var ZAPAS = 0.05;            // 5 % на подрезку
  var CENA = 1090;
  var CENA_OPT = 990;
  var PORAG_OPT = 100;         // м², с которых действует оптовая цена

  var el = {
    dlina: form.querySelector('[name=dlina]'),
    vysota: form.querySelector('[name=vysota]'),
    proemy: form.querySelector('[name=proemy]'),
    listov: form.querySelector('[data-out=listov]'),
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
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function pusto() {
    ['listov', 'ploshad', 'plitok', 'cena', 'itog'].forEach(function (k) {
      if (el[k]) el[k].textContent = '—';
    });
    el.zametka.textContent = 'Введите длину и высоту стены.';
  }

  function schitat() {
    var d = chislo(el.dlina), v = chislo(el.vysota), pr = chislo(el.proemy);
    var s = Math.max(0, d * v - pr);

    if (!s) { pusto(); return; }

    var sZapasom = s * (1 + ZAPAS);
    // Округляем вверх до целого листа: половину листа не продают.
    var listov = Math.ceil(sZapasom / LIST_M2);
    var kOplate = listov * LIST_M2;
    var cena = kOplate >= PORAG_OPT ? CENA_OPT : CENA;

    if (el.listov) el.listov.textContent = razryady(listov) + ' шт';
    el.ploshad.textContent = kOplate.toFixed(1).replace('.', ',') + ' м²';
    el.plitok.textContent = '≈ ' + razryady(kOplate * PLITOK_V_M2) + ' шт';
    el.cena.textContent = cena + ' ₽/м²';
    el.itog.textContent = razryady(kOplate * cena) + ' ₽';

    var chasti = ['Лист — 0,5 м², округлили вверх до целого. В расчёте запас 5 % на подрезку.'];
    if (cena === CENA_OPT) {
      chasti.push('От 100 м² действует оптовая цена — она уже учтена.');
    } else {
      // Считаем в ЛИСТАХ, а не в метрах: человеку покупать листами, и «не хватает
      // 14 м²» он всё равно переведёт в листы сам.
      var nuzhno = Math.ceil((PORAG_OPT - kOplate) / LIST_M2);
      chasti.push('До оптовой цены 990 ₽/м² не хватает ' + razryady(nuzhno) + ' листов.');
    }
    el.zametka.textContent = chasti.join(' ');
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
