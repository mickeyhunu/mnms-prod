(function () {
  function num(id) {
    var value = Number(document.getElementById(id).value || 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function round3(value) {
    return Math.round(value * 1000) / 1000;
  }

  function bindAlcoholCalculator() {
    var calcBtn = document.getElementById('alcohol-calc');
    var resetBtn = document.getElementById('alcohol-reset');
    var resultEl = document.getElementById('alcohol-result');

    if (!calcBtn || !resetBtn || !resultEl) return;

    calcBtn.addEventListener('click', function () {
      var genderFactor = Number(document.getElementById('alcohol-gender').value || 0.68);
      var weight = num('alcohol-weight');
      var elapsedHours = num('alcohol-hours');

      if (!weight) {
        resultEl.textContent = '체중을 입력해주세요.';
        resultEl.className = 'alcohol-result alcohol-result--warn';
        return;
      }

      var grams = (num('alcohol-soju') * 9.8) + (num('alcohol-beer') * 20) + (num('alcohol-wine') * 14) + (num('alcohol-whiskey') * 8.4) + (num('alcohol-makgeolli') * 14.4);
      var bac = Math.max(0, (grams / (weight * genderFactor)) - (0.015 * elapsedHours));
      var bacRounded = round3(bac);
      var caution = bacRounded >= 0.03;

      resultEl.className = caution ? 'alcohol-result alcohol-result--warn' : 'alcohol-result alcohol-result--safe';
      resultEl.textContent = '예상 BAC: ' + bacRounded.toFixed(3) + '% · ' + (caution ? '운전 금지 권장 (면허정지 기준 0.03% 이상)' : '운전 가능 범위일 수 있으나 절대적 기준은 아닙니다.');
    });

    resetBtn.addEventListener('click', function () {
      ['alcohol-weight', 'alcohol-hours'].forEach(function (id) { document.getElementById(id).value = ''; });
      ['alcohol-soju', 'alcohol-beer', 'alcohol-wine', 'alcohol-whiskey', 'alcohol-makgeolli'].forEach(function (id) { document.getElementById(id).value = '0'; });
      document.getElementById('alcohol-gender').value = '0.68';
      resultEl.className = 'alcohol-result';
      resultEl.textContent = '값을 입력하고 계산해보세요.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAlcoholCalculator);
  } else {
    bindAlcoholCalculator();
  }
})();
