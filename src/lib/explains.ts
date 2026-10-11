import items from '../generated/explains.json';

export type Explain = {
  date: string;
  slug: string;
  title: string;
  summary: string;
  question: string;
  answer: string;
  source: string;
  sourceLabel: string;
  markdown: string;
};

export const explains = items as Explain[];
