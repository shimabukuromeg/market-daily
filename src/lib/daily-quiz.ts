export type DailyQuizQuestion = {
  prompt: string;
  options: [string, string, string];
  correctIndex: number;
  reason: string;
};

export function dailyQuizQuestions(markdown: string): DailyQuizQuestion[] {
  const block = /^```quiz\n([\s\S]*?)\n```/m.exec(markdown);
  if (!block) return [];
  return block[1]
    .trim()
    .split('\n')
    .map((line) => {
      const [prompt, first, second, third, answer, reason] = line
        .split(' | ')
        .map((part) => part.trim());
      return {
        prompt,
        options: [first, second, third],
        correctIndex: 'ABC'.indexOf(answer),
        reason,
      };
    });
}
