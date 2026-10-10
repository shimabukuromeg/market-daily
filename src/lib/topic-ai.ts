export function enhanceTopicAI() {
  for (const panel of document.querySelectorAll<HTMLElement>('.topic-ai')) {
    const button = panel.querySelector<HTMLButtonElement>('[data-copy-ai]');
    const prompt = panel.querySelector<HTMLTextAreaElement>('textarea');
    const status = panel.querySelector<HTMLOutputElement>('output');
    if (!button || !prompt || !status) continue;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(prompt.value);
        status.textContent =
          '質問全文をコピーしました。初期入力されない場合はAIの質問欄に貼り付けてください。';
      } catch {
        const details = prompt.closest('details');
        if (details) details.open = true;
        prompt.focus();
        prompt.select();
        status.textContent =
          '自動コピーできませんでした。選択された質問全文をコピーしてください。';
      }
    });
  }
}
