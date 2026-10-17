export function enhanceDailyQuiz() {
  const root = document.querySelector<HTMLElement>('[data-daily-quiz]');
  if (!root) return;

  const intro = root.querySelector<HTMLElement>('[data-quiz-intro]')!;
  const result = root.querySelector<HTMLElement>('[data-quiz-result]')!;
  const panels = Array.from(
    root.querySelectorAll<HTMLElement>('[data-question-panel]'),
  );
  if (!panels.length) return;

  let current = 0;
  let startedAt = 0;
  const answers: number[] = [];

  const showQuestion = (index: number) => {
    panels[index].hidden = false;
    panels[index].querySelector<HTMLElement>('h2')?.focus();
  };

  const showResult = () => {
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
      `${Math.max(1, Math.round((Date.now() - startedAt) / 1000))}秒`;

    root
      .querySelectorAll<HTMLElement>('[data-review-item]')
      .forEach((item, index) => {
        const correctIndex = Number(panels[index].dataset.correct);
        const isCorrect = answers[index] === correctIndex;
        const chosen = panels[index].querySelectorAll<HTMLElement>(
          '[data-choice-label]',
        )[answers[index]];
        const status = item.querySelector<HTMLElement>('[data-review-status]')!;
        status.textContent = isCorrect ? '正解' : '不正解';
        status.classList.toggle('is-correct', isCorrect);
        item.querySelector<HTMLElement>('[data-correct-answer]')!.hidden =
          isCorrect;
        item.querySelector<HTMLElement>('[data-your-answer]')!.textContent =
          `あなたの答え：${'ABC'[answers[index]]} ${chosen.textContent?.trim() ?? ''}`;
      });

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
      showQuestion(current);
    });

  panels.forEach((panel) => {
    panel
      .querySelectorAll<HTMLButtonElement>('[data-choice]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          answers[current] = Number(button.dataset.choice);
          panel.hidden = true;
          current++;
          if (current < panels.length) showQuestion(current);
          else showResult();
        });
      });
  });

  root
    .querySelector<HTMLButtonElement>('[data-quiz-restart]')
    ?.addEventListener('click', () => {
      result.hidden = true;
      intro.hidden = false;
      intro.querySelector<HTMLElement>('h1')?.focus();
    });

  root.classList.add('is-enhanced');
  intro.hidden = false;
}
