/**
 * Packs the lesson, quiz and glossary Markdown files of `packages/content` into `src/generated.ts`, which the app
 * imports. Checks every file parses first, so a broken lesson stops the build instead of the app.
 *
 * Usage:  pnpm content:build
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generatedSource } from '../packages/content/src/build';
import type { ContentFiles } from '../packages/content/src/build';
import { parseGlossary, parseLesson, parseQuiz } from '../packages/content/src/parse';

const ROOT = join(import.meta.dirname, '..', 'packages', 'content');

function readDir(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(join(ROOT, dir)).filter((n) => n.endsWith('.md')).sort())
    out[name] = readFileSync(join(ROOT, dir, name), 'utf8').replace(/\r\n/g, '\n');
  return out;
}

export function readContent(): ContentFiles {
  return {
    lessons: readDir('lessons'),
    quizzes: readDir('quizzes'),
    glossary: readFileSync(join(ROOT, 'glossary.md'), 'utf8').replace(/\r\n/g, '\n'),
  };
}

const files = readContent();
for (const [name, text] of Object.entries(files.lessons)) parseLesson(text, name);
for (const [name, text] of Object.entries(files.quizzes)) parseQuiz(text, name);
parseGlossary(files.glossary);
writeFileSync(join(ROOT, 'src', 'generated.ts'), generatedSource(files));
console.log(`content: ${String(Object.keys(files.lessons).length)} lessons, ${String(Object.keys(files.quizzes).length)} quizzes`);
