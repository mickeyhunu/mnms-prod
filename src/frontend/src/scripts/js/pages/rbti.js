(function () {
  let shareSheetOpen = false;
  const state = {
    questions: [],
    answerScale: [],
    currentIndex: 0,
    answers: {},
    meta: {}
  };

  const testTitleEl = document.getElementById('rbti-test-title');
  const testDescriptionEl = document.getElementById('rbti-test-description');
  const progressCurrentEl = document.getElementById('rbti-progress-current');
  const progressTotalEl = document.getElementById('rbti-progress-total');
  const progressBarEl = document.getElementById('rbti-progress-bar');
  const questionTextEl = document.getElementById('rbti-question-text');
  const answerListEl = document.getElementById('rbti-answer-list');
  const backButtonEl = document.getElementById('rbti-back-btn');
  const shareButtonEl = document.getElementById('rbti-share-btn');
  const introSectionEl = document.getElementById('rbti-intro');
  const aboutTitleEl = document.getElementById('rbti-about-title');
  const aboutDescriptionEl = document.getElementById('rbti-about-description');
  const axisListEl = document.getElementById('rbti-axis-list');
  const startButtonEl = document.getElementById('rbti-start-btn');
  const testCardEl = document.getElementById('rbti-test-card');
  const resultSectionEl = document.getElementById('rbti-result-section');
  const resultTypeEl = document.getElementById('rbti-result-type');
  const resultAxisEl = document.getElementById('rbti-result-axis');
  const resultHiddenEl = document.getElementById('rbti-result-hidden');
  const inlineResultEl = document.getElementById('rbti-inline-result');
  const heroResultEl = document.getElementById('rbti-hero-result');
  const heroIntroEl = document.getElementById('rbti-hero-intro');
  const heroTypeEl = document.getElementById('rbti-hero-type');
  const heroAvatarEl = document.getElementById('rbti-hero-avatar');
  const heroTitleEl = document.getElementById('rbti-hero-title');
  const heroSummaryEl = document.getElementById('rbti-hero-summary');
  const heroCommentEl = document.getElementById('rbti-hero-comment');
  const heroScoreLabelsEl = document.getElementById('rbti-hero-score-labels');
  const questionProgressEl = document.getElementById('rbti-question-progress');
  const questionActionsEl = document.getElementById('rbti-question-actions');

  const fallbackData = {
    testName: 'RBTI',
    fullName: 'Room Behavior Type Indicator',
    description: '밤문화 성향검사',
    axes: {
      E: 'Exciter - 하이텐션/술자리 분위기형',
      I: 'Immersive - 조용한 몰입/대화형',
      S: 'Skinship - 스킨십/수위 중시형',
      N: 'Narrative - 대화/감성/케미형',
      F: 'Flex - 소비/구찌형',
      T: 'Tactician - 빠꼼이/계산형',
      J: 'Judger - 주도/정리형',
      P: 'Playmaker - 즉흥/흐름형'
    },
    answerScale: [
      { label: '매우 아니다', value: -2 },
      { label: '아니다', value: -1 },
      { label: '보통', value: 0 },
      { label: '그렇다', value: 1 },
      { label: '매우 그렇다', value: 2 }
    ],
    questions: [
      { id: 1, text: '술게임을 좋아하는 편이다.', axis: 'E' },
      { id: 2, text: '조용하게 대화하는 분위기를 더 선호한다.', axis: 'I' }
    ]
  };

  async function loadQuestions() {
    try {
      const response = await fetch('/api/rbti/questions', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('RBTI API not available');
      return await response.json();
    } catch (error) {
      return fallbackData;
    }
  }

  function renderQuestion() {
    const question = state.questions[state.currentIndex];
    if (!question) return;

    progressCurrentEl.textContent = String(state.currentIndex + 1);
    progressTotalEl.textContent = String(state.questions.length);
    progressBarEl.style.width = `${((state.currentIndex + 1) / state.questions.length) * 100}%`;
    questionTextEl.textContent = `${question.id}. ${question.text}`;

    answerListEl.innerHTML = '';
    state.answerScale.forEach((answer) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline rbti-answer-btn';
      button.textContent = answer.label;
      if (state.answers[question.id] === answer.value) {
        button.classList.add('active');
      }

      button.addEventListener('click', () => {
        state.answers[question.id] = answer.value;

        if (state.currentIndex < state.questions.length - 1) {
          state.currentIndex += 1;
          renderQuestion();
          return;
        }

        submitAnswers();
      });

      answerListEl.appendChild(button);
    });

  }


  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function calculateResults() {
    const axisScores = { E: 0, I: 0, S: 0, N: 0, F: 0, T: 0, J: 0, P: 0 };
    const oppositeAxis = { E: 'I', I: 'E', S: 'N', N: 'S', F: 'T', T: 'F', J: 'P', P: 'J' };
    const hiddenRaw = {};
    const hiddenRange = {};

    state.questions.forEach((question) => {
      const answerValue = Number(state.answers[question.id]);
      if (Number.isNaN(answerValue)) return;

      const axis = question.axis;
      if (axis && oppositeAxis[axis]) {
        if (answerValue >= 0) {
          axisScores[axis] += answerValue;
        } else {
          axisScores[oppositeAxis[axis]] += Math.abs(answerValue);
        }
      }

      const hiddenScores = question.hiddenScores || {};
      Object.entries(hiddenScores).forEach(([key, weight]) => {
        const numericWeight = Number(weight) || 0;
        hiddenRaw[key] = (hiddenRaw[key] || 0) + (answerValue * numericWeight);
        hiddenRange[key] = (hiddenRange[key] || 0) + (Math.abs(numericWeight) * 2);
      });
    });

    const hiddenPercent = Object.entries(hiddenRaw).reduce((acc, [key, value]) => {
      const range = hiddenRange[key] || 0;
      if (range === 0) {
        acc[key] = 50;
        return acc;
      }

      const normalized = ((value + range) / (range * 2)) * 100;
      acc[key] = Math.round(clamp(normalized, 0, 100));
      return acc;
    }, {});

    const type = [
      axisScores.E >= axisScores.I ? 'E' : 'I',
      axisScores.S >= axisScores.N ? 'S' : 'N',
      axisScores.F >= axisScores.T ? 'F' : 'T',
      axisScores.J >= axisScores.P ? 'J' : 'P'
    ].join('');

    return { type, axisScores, hiddenRaw, hiddenPercent };
  }


  function getAxisPercentages(axisScores) {
    const pairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];
    return pairs.map(([left, right]) => {
      const total = axisScores[left] + axisScores[right];
      const leftPercent = total === 0 ? 50 : Math.round((axisScores[left] / total) * 100);
      return {
        left,
        right,
        leftPercent,
        rightPercent: 100 - leftPercent
      };
    });
  }

  function getAxisLabelFromConfig(axes, axisKey) {
    const rawLabel = axes?.[axisKey] || fallbackData.axes[axisKey] || axisKey;
    const [, localizedLabel] = String(rawLabel).split(' - ');
    return (localizedLabel || rawLabel).trim();
  }

  function renderInlineResult(data, result) {
    if (!inlineResultEl) return;

    const resultMap = data.results || {};
    const typeInfo = resultMap[result.type] || {};
    const hiddenComments = data.hiddenScoreComments || {};
    const hiddenScoreLabels = data.hiddenScoreLabels || {};
    const axisConfig = data.axes || fallbackData.axes;

    const axisRows = getAxisPercentages(result.axisScores).map(({ left, right, leftPercent, rightPercent }) => `
      <div>
        <div class="mt-1 flex items-center gap-3 text-sm" style="justify-content: space-between;">
          <span class="inline-flex flex-1 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 font-bold text-indigo-700">${getAxisLabelFromConfig(axisConfig, left)} (${left}) <strong>${leftPercent}%</strong></span>
          <span class="inline-flex flex-1 items-center justify-end gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-right text-purple-700"><strong>${rightPercent}%</strong> ${getAxisLabelFromConfig(axisConfig, right)} (${right})</span>
        </div>
        <div class="h-3 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner" style="height: 12px;" role="img" aria-label="${leftPercent}% 대 ${rightPercent}% 비율 그래프">
          <div class="flex h-full w-full">
            <div class="h-full bg-indigo-500 transition-all duration-700" style="border-radius: 5px 0 0 5px; background-color:lab(59.866% 22.4834 -64.4485); width: ${leftPercent}%;"></div>
            <div class="h-full bg-purple-500 transition-all duration-700" style="border-radius: 0 5px 5px 0; background-color:lab(63.6946% 47.6127 -59.2066); width: ${rightPercent}%;"></div>
          </div>
        </div>
      </div>
    `).join('');

    

    const hiddenEntries = Object.entries(result.hiddenPercent).sort((a, b) => b[1] - a[1]);
    const hiddenRows = hiddenEntries.map(([key, score]) => {
      const barColor = score >= 80 ? "bg-red-500" : score >= 60 ? "bg-orange-400" : score >= 40 ? "bg-yellow-400" : "bg-green-400";

      const comment = hiddenComments[key] || `${key} 지표`;
      return `
        <div class="space-y-1 flex-between">
          <div class="flex-between" style="min-width: 130px;">
            <span class="font-medium text-gray-800" style="white-space: nowrap;">${comment}</span>
            <strong class="font-semibold text-gray-900">${score}%</strong>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200" style="margin-left: 3%; height: 12px;"; role="img" aria-label="${comment} ${score}% 막대그래프">
            <div class="h-full rounded-full ${barColor} transition-all duration-700" style="border-radius: 5px; width: ${score}%;"></div>
          </div>
        </div>
      `;
    }).join('');

    if (heroResultEl) {
      heroResultEl.classList.remove('hidden');
    }
    if (heroTypeEl) {
      heroTypeEl.textContent = result.type;
    }
    if (heroAvatarEl) {
      heroAvatarEl.src = `/src/assets/rbti-avatars/${String(result.type || '').toLowerCase()}.png`;
      heroAvatarEl.alt = `${result.type} RBTI 아바타`;
    }
    if (heroTitleEl) {
      heroTitleEl.textContent = typeInfo.title || '유형 분석 중';
    }
    if (heroSummaryEl) {
      heroSummaryEl.textContent = typeInfo.summary || '요약 데이터가 없습니다.';
    }
    const scoreLabelTags = Object.entries(result.hiddenPercent)
      .filter(([, score]) => Number.isFinite(Number(score)))
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5)
      .map(([key, score]) => {
        const labelConfig = Array.isArray(hiddenScoreLabels[key]) ? hiddenScoreLabels[key] : [];
        const matchedLabel = labelConfig.find((item) => score >= Number(item.min) && score <= Number(item.max));
        return matchedLabel?.label ? `#${matchedLabel.label}` : null;
      })
      .filter(Boolean);

    if (heroCommentEl) {
      heroCommentEl.textContent = typeInfo.staffComment || '코멘트 데이터가 없습니다.';
    }

    if (heroScoreLabelsEl) {
      heroScoreLabelsEl.textContent = scoreLabelTags.join('  ');
    }

    inlineResultEl.innerHTML = `
      <div class="calc-card p-6 mb-6">
        <h3 class="font-semibold text-gray-800 mb-4">축별 분석 결과</h3>
        <div class="space-y-5">${axisRows}</div>
      </div>

      <div class="calc-card p-6">
        <h3 class="font-semibold text-gray-800 mb-4">유형 확률 표</h3>
        <ul class="space-y-2 text-sm text-gray-700">${hiddenRows}</ul>
      </div>
    `;

    inlineResultEl.classList.remove('hidden');
  }

  function bootstrap(data) {
    state.meta = data || {};
    state.questions = Array.isArray(data.questions) ? data.questions : [];
    state.answerScale = Array.isArray(data.answerScale) ? data.answerScale : fallbackData.answerScale;

    testTitleEl.textContent = data.testName || 'RBTI';
    testDescriptionEl.textContent = `${data.fullName || fallbackData.fullName}\n${data.description || fallbackData.description}`;
    renderIntro(data);

    if (state.questions.length === 0) {
      startButtonEl && (startButtonEl.disabled = true);
      return;
    }

  }

  function renderIntro(data) {
    if (aboutTitleEl) {
      aboutTitleEl.textContent = `${data.testName || fallbackData.testName} 검사란?`;
    }

    if (aboutDescriptionEl) {
      aboutDescriptionEl.textContent = `${data.fullName || fallbackData.fullName}는 ${data.description || fallbackData.description}를 위한 테스트입니다. 질문에 답하고 나의 성향 유형을 확인해보세요.`;
    }

    if (!axisListEl) return;
    const axes = data.axes || fallbackData.axes;
    const axisPairs = [['E', 'I'], ['S', 'N'], ['F', 'T'], ['J', 'P']];
    axisListEl.innerHTML = axisPairs.map(([left, right]) => `
      <div class="bg-gray-50 rounded-lg p-1">
        <h3 class="font-medium text-gray-900">${left} vs ${right}</h3>
        <p class="text-gray-600 text-sm mt-1">${axes[left] || fallbackData.axes[left]}</p>
        <p class="text-gray-600 text-sm mt-1">${axes[right] || fallbackData.axes[right]}</p>
      </div>
    `).join('');
  }

  startButtonEl?.addEventListener('click', () => {
    introSectionEl?.classList.add('hidden');
    startButtonEl.classList.add('hidden');
    testCardEl?.classList.remove('hidden');

    if (state.questions.length === 0) {
      startButtonEl && (startButtonEl.disabled = true);
      return;
    }

    resultSectionEl?.classList.add('hidden');
    inlineResultEl?.classList.add('hidden');
    heroResultEl?.classList.add('hidden');
    heroIntroEl?.classList.remove('hidden');
    questionProgressEl?.classList.remove('hidden');
    questionTextEl?.classList.remove('hidden');
    answerListEl?.classList.remove('hidden');
    questionActionsEl?.classList.remove('hidden');
    renderQuestion();
  });

  backButtonEl?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = '/play';
  });

  shareButtonEl?.addEventListener('click', handleSharePost);
  setupShareSheet();
  document.addEventListener('keydown', handleShareSheetKeydown);


  function submitAnswers() {
    if (Object.keys(state.answers).length !== state.questions.length) {
      alert('모든 질문에 답변을 선택해주세요.');
      return;
    }

    const result = calculateResults();
    renderInlineResult(state.meta, result);

    resultSectionEl?.classList.add('hidden');
    heroIntroEl?.classList.add('hidden');
    questionProgressEl?.classList.add('hidden');
    questionTextEl?.classList.add('hidden');
    answerListEl?.classList.add('hidden');
    questionActionsEl?.classList.add('hidden');
    testCardEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  loadQuestions().then(bootstrap);

  function setupShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (!shareSheet) return;

    document.getElementById('share-sheet-overlay')?.addEventListener('click', closeShareSheet);
    document.getElementById('share-sheet-close')?.addEventListener('click', closeShareSheet);
    document.getElementById('share-kakao-btn')?.addEventListener('click', handleKakaoShare);
    document.getElementById('share-sms-btn')?.addEventListener('click', handleSmsShare);
    document.getElementById('share-copy-btn')?.addEventListener('click', handleCopyShareLink);
  }

  function handleShareSheetKeydown(event) {
    if (event.key === 'Escape' && shareSheetOpen) {
      closeShareSheet();
    }
  }

  function getShareData() {
    const title = '미드나인 맨즈 커뮤니티';
    const url = window.location.href;

    return {
      title,
      text: 'RBTI 페이지를 공유합니다.',
      url,
      kakaoTemplateObject: createRbtiKakaoShareTemplate({ title, url })
    };
  }

  function createRbtiKakaoShareTemplate({ title, url }) {
    const imageUrl = document.querySelector('meta[property="og:image"]')?.content || undefined;

    return {
      objectType: 'feed',
      content: {
        title,
        description: 'RBTI 페이지를 공유합니다.',
        imageUrl,
        link: {
          mobileWebUrl: url,
          webUrl: url
        }
      },
      buttons: [
        {
          title: 'RBTI 보기',
          link: {
            mobileWebUrl: url,
            webUrl: url
          }
        }
      ]
    };
  }

  function openShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (!shareSheet) return;

    shareSheet.classList.remove('hidden');
    shareSheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('share-sheet-open');
    shareSheetOpen = true;
  }

  function closeShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (!shareSheet) return;

    shareSheet.classList.add('hidden');
    shareSheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('share-sheet-open');
    shareSheetOpen = false;
  }

  function handleSharePost() {
    openShareSheet();
  }

  async function handleKakaoShare() {
    const shareData = getShareData();

    try {
      await sendKakaoDefaultShare({
        title: shareData.title,
        description: shareData.text,
        url: shareData.url,
        buttonTitle: 'RBTI 보기',
        templateObject: shareData.kakaoTemplateObject
      });
      closeShareSheet();
    } catch (error) {
      console.error('카카오톡 공유 실패:', error);
      alert(error?.message || '카카오톡 공유에 실패했습니다.');
    }
  }

  function handleSmsShare() {
    const shareData = getShareData();
    const message = `${shareData.title}\n제목 ${document.title}\n주소 ${shareData.url}`;
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isAppleDevice ? '&' : '?';
    window.location.href = `sms:${separator}body=${encodeURIComponent(message)}`;
    closeShareSheet();
  }

  async function handleCopyShareLink() {
    const shareData = getShareData();

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        closeShareSheet();
        return;
      }

      await copyTextToClipboard(shareData.url);
      closeShareSheet();
      alert('RBTI 페이지 링크가 복사되었습니다.');
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      console.error('링크 복사 실패:', error);
      closeShareSheet();
      prompt('아래 링크를 복사하세요.', shareData.url);
    }
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = String(text || '');
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
})();
