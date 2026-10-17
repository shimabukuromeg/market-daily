export function enhanceDailyQuiz() {
  const root = document.querySelector<HTMLElement>('[data-daily-quiz]');
  if (!root) return;

  const intro = root.querySelector<HTMLElement>('[data-quiz-intro]')!;
  const result = root.querySelector<HTMLElement>('[data-quiz-result]')!;
  const panels = Array.from(
    root.querySelectorAll<HTMLElement>('[data-question-panel]'),
  );
  if (!panels.length) return;

  const timeLimit = Number(root.dataset.quizSeconds) || 60;
  let current = 0;
  let startedAt = 0;
  let deadlineAt = 0;
  let timer: number | undefined;
  let resultText = '';
  const answers: number[] = [];

  const updateTimer = () => {
    const remaining = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
    root.querySelectorAll<HTMLElement>('[data-remaining]').forEach((label) => {
      label.textContent = String(remaining);
    });
    root
      .querySelectorAll<HTMLElement>('.quiz-progress-track')
      .forEach((track) => {
        track.setAttribute('aria-valuenow', String(remaining));
        track.querySelector<HTMLElement>('[data-time-fill]')!.style.width =
          `${(remaining / timeLimit) * 100}%`;
      });
    if (remaining === 0) showResult(true);
  };

  const showQuestion = (index: number) => {
    panels[index].hidden = false;
    panels[index].querySelector<HTMLElement>('h2')?.focus();
  };

  const showResult = (timedOut: boolean) => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    panels.forEach((panel) => {
      panel.hidden = true;
    });
    const correct = panels.reduce(
      (total, panel, index) =>
        total + (Number(panel.dataset.correct) === answers[index] ? 1 : 0),
      0,
    );
    root.querySelector<HTMLElement>('[data-score]')!.textContent =
      `${correct}/${panels.length}`;
    root.querySelector<HTMLElement>('[data-correct-count]')!.textContent =
      `${correct}問`;
    root.querySelector<HTMLElement>('[data-accuracy]')!.textContent =
      `${Math.round((correct / panels.length) * 100)}%`;
    root.querySelector<HTMLElement>('[data-elapsed]')!.textContent =
      `${Math.min(timeLimit, Math.max(1, Math.round((Date.now() - startedAt) / 1000)))}秒`;
    root.querySelector<HTMLElement>('[data-result-lede]')!.textContent =
      timedOut
        ? '時間切れです。未回答の問題も含め、解説を確認しましょう。'
        : '記事の根拠と照らしながら、答えを確かめましょう。';

    root
      .querySelectorAll<HTMLElement>('[data-review-item]')
      .forEach((item, index) => {
        const correctIndex = Number(panels[index].dataset.correct);
        const chosenIndex = answers[index] ?? -1;
        const isCorrect = chosenIndex === correctIndex;
        const status = item.querySelector<HTMLElement>('[data-review-status]')!;
        status.textContent =
          chosenIndex < 0 ? '未回答' : isCorrect ? '正解' : '不正解';
        status.classList.toggle('is-correct', isCorrect);
        item.querySelector<HTMLElement>('[data-correct-answer]')!.hidden =
          isCorrect;
        const chosen = panels[index].querySelectorAll<HTMLElement>(
          '[data-choice-label]',
        )[chosenIndex];
        item.querySelector<HTMLElement>('[data-your-answer]')!.textContent =
          chosenIndex < 0
            ? 'あなたの答え：未回答'
            : `あなたの答え：${'ABC'[chosenIndex]} ${chosen.textContent?.trim() ?? ''}`;
      });

    resultText = `${root.dataset.shareDate}の理解度チェックは${correct}/${panels.length}問正解でした。`;
    const share = root.querySelector<HTMLAnchorElement>('[data-share-result]')!;
    const intent = new URL('https://x.com/intent/post');
    intent.searchParams.set('text', resultText);
    intent.searchParams.set('url', root.dataset.shareUrl ?? location.href);
    share.href = intent.href;
    result.hidden = false;
    result.querySelector<HTMLElement>('h1')?.focus();
  };

  root
    .querySelector<HTMLButtonElement>('[data-quiz-start]')
    ?.addEventListener('click', () => {
      intro.hidden = true;
      current = 0;
      answers.length = 0;
      startedAt = Date.now();
      deadlineAt = startedAt + timeLimit * 1000;
      updateTimer();
      timer = window.setInterval(updateTimer, 250);
      showQuestion(current);
    });

  panels.forEach((panel) => {
    panel
      .querySelectorAll<HTMLButtonElement>('[data-choice]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          if (Date.now() >= deadlineAt) {
            showResult(true);
            return;
          }
          answers[current] = Number(button.dataset.choice);
          panel.hidden = true;
          current++;
          if (current < panels.length) showQuestion(current);
          else showResult(false);
        });
      });
  });

  root
    .querySelector<HTMLButtonElement>('[data-copy-result]')
    ?.addEventListener('click', async () => {
      const status = root.querySelector<HTMLElement>('[data-copy-status]')!;
      try {
        await navigator.clipboard.writeText(
          `${resultText}\n${root.dataset.shareUrl ?? location.href}`,
        );
        status.textContent = '結果の文章をコピーしました。';
      } catch {
        status.textContent = 'コピーできませんでした。';
      }
    });

  root
    .querySelector<HTMLButtonElement>('[data-quiz-restart]')
    ?.addEventListener('click', () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
      result.hidden = true;
      intro.hidden = false;
      root.querySelector<HTMLElement>('[data-copy-status]')!.textContent = '';
      intro.querySelector<HTMLElement>('h1')?.focus();
    });

  root.classList.add('is-enhanced');
  intro.hidden = false;
}
