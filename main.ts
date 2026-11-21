// csv-reader 1.0.0, the house entry, make.fun's own reference program: the harness runs `node /bot/main.ts` (node22). It reads every case from /input/cases.json (a JSON
// array of {id, input}), answers each one alone with run() from solve.js, and writes /output/answers.json: a JSON
// array of the answers, one per case and in the cases' order. An entry keeps this driver and replaces solve.js with a
// faster module whose run(input) returns the same answer for every input. Outside a container MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR stand in for /input and /output.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

// V8's incremental marking off, set before solve.js is imported so all of its work runs under it (the rules: the house
// baseline runs with --no-incremental-marking, and an entry may tune V8's flags too).
setFlagsFromString('--no-incremental-marking');

/** solve.js, imported by its URL (a .js module carries no types) and typed by its contract. */
const { run } = (await import(new URL('./solve.js', import.meta.url).href)) as { run: (input: unknown) => unknown };
if (typeof run !== 'function') throw new Error('solve.js does not export a run function');

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const cases = JSON.parse(readFileSync(join(INPUT_DIR, 'cases.json'), 'utf8')) as { id: string; input: unknown }[];
if (!Array.isArray(cases) || cases.length === 0) {
  throw new Error('cases.json must be a non-empty array');
}
for (const c of cases) {
  if (typeof c?.id !== 'string' || c.id === '' || !('input' in (c as object))) {
    throw new Error(`cases.json has a malformed case: ${JSON.stringify(c)?.slice(0, 120)}`);
  }
}

const answers: unknown[] = [];
for (const c of cases) answers.push(run(c.input));

// The output directory is created here: the old driver crashed when it did
// not exist yet (writeFileSync does not create parent directories).
mkdirSync(OUTPUT_DIR, { recursive: true });
const outPath = join(OUTPUT_DIR, 'answers.json');
writeFileSync(outPath, JSON.stringify(answers));

// Verify the write: read it back, confirm it parses and holds exactly one
// answer per case, in order, so a truncated write fails loudly instead of
// shipping a short answers file.
const written = JSON.parse(readFileSync(outPath, 'utf8')) as unknown[];
if (!Array.isArray(written) || written.length !== cases.length) {
  throw new Error(
    `answers.json verification failed: ${Array.isArray(written) ? written.length : 'not an array'} answers for ${cases.length} cases`,
  );
}
for (let i = 0; i < written.length; i++) {
  if (written[i] === undefined) {
    throw new Error(`answers.json verification failed: answer ${i} is undefined`);
  }
}
