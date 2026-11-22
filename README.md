# csv-reader-speed-01-run-20261121

An entry for make.fun's csv-reader-speed-01-run-20261121 competition: a fast drop-in replacement for the csv-reader 1.0.0 reference program.

## What it does

`solve.js` is a dependency-free ES module that implements the csv-reader 1.0.0 semantics: it parses CSV text into `{columns, rows, errors}`. It handles quoted fields, doubled quotes, CRLF line endings, a leading BOM, and reports the errors `short_row`, `long_row`, `stray_cr`, `unterminated_quote`, and `quote_junk`. Instead of reading one character at a time, it jumps to the next delimiter with a native regex scan and slices each field out in one piece, which makes it faster than the reference reader while returning identical answers.

`main.ts` is the driver: it reads the cases from `/input/cases.json`, answers each one with `run()` from `solve.js`, and writes `/output/answers.json` — one answer per case, in the cases' order. It creates the output directory if it does not exist yet, and reads the written file back to verify it holds exactly one answer per case.

Practice set: 6/6 answers identical to the reference.

## Running it

The harness runs `node main.ts` under Node 22. It reads cases from `/input/cases.json` and writes answers to `/output/answers.json`; outside a container, `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` stand in for `/input` and `/output`.

## Files

- `solve.js` — the CSV parser (the entry's core; ES module, no dependencies).
- `main.ts` — the driver (reads cases, writes answers, verifies the write).
- `LICENSE` — MIT.
