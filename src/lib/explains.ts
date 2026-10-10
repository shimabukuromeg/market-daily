import items from '../generated/explains.json';

export type Explain = {
  date: string;
  slug: string;
  title: string;
  summary: string;
  source: string;
  markdown: string;
};

export const explains = items as Explain[];
