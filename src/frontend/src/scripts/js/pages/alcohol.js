(function () {
  function num(id) {
    var value = Number(document.getElementById(id).value || 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function round3(value) {
    return Math.round(value * 1000) / 1000;
  }


  function bindGenderButtons() {
    var genderInput = document.getElementById('alcohol-gender');
    var genderButtons = document.querySelectorAll('#alcohol-gender-buttons [data-gender-value]');
    if (!genderInput || !genderButtons.length) return;

    function syncGenderButtons(value) {
      genderButtons.forEach(function (button) {
        var selected = button.getAttribute('data-gender-value') === value;
        button.classList.toggle('alcohol-gender-btn--active', selected);
      });
    }

    genderButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var value = button.getAttribute('data-gender-value') || '0.68';
        genderInput.value = value;
        syncGenderButtons(value);
      });
    });

    syncGenderButtons(genderInput.value || '0.68');
  }

  function bindDrinkSteppers() {
    document.querySelectorAll('[data-stepper-target]').forEach(function (stepper) {
      var targetId = stepper.getAttribute('data-stepper-target');
      if (!targetId) return;
      var input = document.getElementById(targetId);
      var display = stepper.querySelector('[data-stepper-display]');
      if (!input || !display) return;

      function syncValue(value) {
        var nextValue = Math.max(0, Number(value) || 0);
        input.value = String(nextValue);
        display.textContent = String(nextValue);
      }

      stepper.querySelectorAll('[data-step]').forEach(function (button) {
        button.addEventListener('click', function () {
          var step = Number(button.getAttribute('data-step') || 0);
          syncValue((Number(input.value) || 0) + step);
        });
      });

      syncValue(input.value);
    });
  }

  function bindAlcoholCalculator() {
    var resetBtn = document.getElementById('alcohol-reset');
    var resultEl = document.getElementById('alcohol-result');

    if (!resetBtn || !resultEl) return;

    function renderCalculation() {
      var genderFactor = Number(document.getElementById('alcohol-gender').value || 0.68);
      var weight = num('alcohol-weight');
      var elapsedHoursInput = document.getElementById('alcohol-hours');
      var elapsedHours = num('alcohol-hours');
      var grams = (num('alcohol-soju') * 9.8) + (num('alcohol-beer') * 20) + (num('alcohol-wine') * 14) + (num('alcohol-whiskey') * 8.4) + (num('alcohol-makgeolli') * 14.4);

      if (!weight || !elapsedHoursInput || elapsedHoursInput.value === '' || grams <= 0) {
        resultEl.className = 'alcohol-result';
        resultEl.textContent = '값을 입력하고 계산해보세요.';
        return;
      }

      var bac = Math.max(0, (grams / (weight * genderFactor)) - (0.015 * elapsedHours));
      var bacRounded = round3(bac);
      var caution = bacRounded >= 0.03;

      resultEl.className = caution ? 'alcohol-result alcohol-result--warn' : 'alcohol-result alcohol-result--safe';
      resultEl.textContent = '예상 BAC: ' + bacRounded.toFixed(3) + '% · ' + (caution ? '운전 금지 권장 (면허정지 기준 0.03% 이상)' : '운전 가능 범위일 수 있으나 절대적 기준은 아닙니다.');
    }

    ['alcohol-weight', 'alcohol-hours'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', renderCalculation);
        el.addEventListener('change', renderCalculation);
      }
    });

    document.querySelectorAll('#alcohol-gender-buttons [data-gender-value], [data-step]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.requestAnimationFrame(renderCalculation);
      });
    });

    resetBtn.addEventListener('click', function () {
      document.getElementById('alcohol-weight').value = '';
      document.getElementById('alcohol-hours').value = '0';
      ['alcohol-soju', 'alcohol-beer', 'alcohol-wine', 'alcohol-whiskey', 'alcohol-makgeolli'].forEach(function (id) { document.getElementById(id).value = '0'; });
      document.getElementById('alcohol-gender').value = '0.68';
      document.querySelectorAll('[data-stepper-display]').forEach(function (display) { display.textContent = '0'; });
      document.querySelectorAll('#alcohol-gender-buttons [data-gender-value]').forEach(function (button) {
        var selected = button.getAttribute('data-gender-value') === '0.68';
        button.classList.toggle('alcohol-gender-btn--active', selected);
      });
      resultEl.className = 'alcohol-result';
      resultEl.textContent = '값을 입력하고 계산해보세요.';
    });

    renderCalculation();
  }

  function initAlcoholPage() {
    bindGenderButtons();
    bindDrinkSteppers();
    bindAlcoholCalculator();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAlcoholPage);
  } else {
    initAlcoholPage();
  }
})();
