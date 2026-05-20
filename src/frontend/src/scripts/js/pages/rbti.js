(function () {
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


  submitButtonEl.addEventListener('click', () => {
    alert('결과 계산 로직은 다음 단계에서 연결됩니다.');
  });

  loadQuestions().then(bootstrap);
})();
