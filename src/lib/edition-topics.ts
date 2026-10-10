export function editionTopics(markdown: string) {
  const source = /```theme-chart\s*\n([\s\S]*?)```/.exec(markdown)?.[1] ?? '';
  return source
    .trim()
    .split('\n')
    .map((line) => {
      const [label, posts, authors] = line
        .split('|')
        .map((part) => part.trim());
      return { label, posts: Number(posts), authors: Number(authors) };
    })
    .filter(
      (row) =>
        row.label && Number.isFinite(row.posts) && Number.isFinite(row.authors),
    );
}
