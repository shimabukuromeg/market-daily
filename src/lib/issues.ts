import issues from '../generated/issues.json';

export type Issue = {
  date: string;
  title: string;
  summary: string;
  markdown: string;
  posts: number;
  coverage: string;
};

export const editions = issues as Issue[];

export function sitePath(path = '') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}
