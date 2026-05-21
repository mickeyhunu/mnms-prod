(function () {
  let shareSheetOpen = false;
  const state = {
    questions: [],
    answerScale: [],
    currentIndex: 0,
    answers: {}
  };

  const testTitleEl = document.getElementById('rbti-test-title');
  const testDescriptionEl = document.getElementById('rbti-test-description');
  const progressCurrentEl = document.getElementById('rbti-progress-current');
  const progressTotalEl = document.getElementById('rbti-progress-total');
  const progressBarEl = document.getElementById('rbti-progress-bar');
  const questionTextEl = document.getElementById('rbti-question-text');
  const answerListEl = document.getElementById('rbti-answer-list');
  const prevButtonEl = document.getElementById('rbti-prev-btn');
  const nextButtonEl = document.getElementById('rbti-next-btn');
  const submitButtonEl = document.getElementById('rbti-submit-btn');
  const backButtonEl = document.getElementById('rbti-back-btn');
  const shareButtonEl = document.getElementById('rbti-share-btn');

  const fallbackData = {
    testName: 'RBTI',
    description: 'Room Behavior Type Indicator',
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
        renderQuestion();
      });

      answerListEl.appendChild(button);
    });

    prevButtonEl.disabled = state.currentIndex === 0;
    nextButtonEl.classList.toggle('hidden', state.currentIndex === state.questions.length - 1);
    submitButtonEl.classList.toggle('hidden', state.currentIndex !== state.questions.length - 1);
  }

  function bootstrap(data) {
    state.questions = Array.isArray(data.questions) ? data.questions : [];
    state.answerScale = Array.isArray(data.answerScale) ? data.answerScale : fallbackData.answerScale;

    testTitleEl.textContent = data.testName || 'RBTI';
    testDescriptionEl.textContent = data.description || '';

    if (state.questions.length === 0) {
      questionTextEl.textContent = '문항 데이터가 없습니다.';
      return;
    }

    renderQuestion();
  }

  prevButtonEl.addEventListener('click', () => {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderQuestion();
    }
  });

  nextButtonEl.addEventListener('click', () => {
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
    }
  });

  backButtonEl?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = '/';
  });

  shareButtonEl?.addEventListener('click', handleSharePost);
  setupShareSheet();
  document.addEventListener('keydown', handleShareSheetKeydown);


  submitButtonEl.addEventListener('click', () => {
    alert('결과 계산 로직은 다음 단계에서 연결됩니다.');
  });

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
    return {
      title: '미드나인 맨즈 커뮤니티',
      text: 'RBTI 페이지를 공유합니다.',
      url: window.location.href
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
      if (window.Kakao && window.Kakao.Share && typeof window.Kakao.Share.sendDefault === 'function') {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: shareData.title,
            description: shareData.text,
            link: {
              mobileWebUrl: shareData.url,
              webUrl: shareData.url
            }
          },
          buttons: [{
            title: 'RBTI 보기',
            link: {
              mobileWebUrl: shareData.url,
              webUrl: shareData.url
            }
          }]
        });
        closeShareSheet();
        return;
      }

      if (navigator.share) {
        await navigator.share(shareData);
        closeShareSheet();
        return;
      }

      await copyTextToClipboard(shareData.url);
      closeShareSheet();
      alert('카카오톡 공유를 직접 열 수 없어 링크를 복사했습니다. 카카오톡에 붙여넣어 공유해주세요.');
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('카카오톡 공유 실패:', error);
      alert('카카오톡 공유에 실패했습니다.');
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
    try {
      await copyTextToClipboard(getShareData().url);
      closeShareSheet();
      alert('RBTI 페이지 링크가 복사되었습니다.');
    } catch (error) {
      console.error('링크 복사 실패:', error);
      closeShareSheet();
      prompt('아래 링크를 복사하세요.', getShareData().url);
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
