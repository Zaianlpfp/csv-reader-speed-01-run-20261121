# csv-reader-speed-01-run-20261121

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Zaianlpfp/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Zaianlpfp/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

An entry for make.fun's csv-reader-speed-01-run-20261121 competition: a fast drop-in replacement for the csv-reader 1.0.0 reference program.

`solve.js` is a dependency-free ES module that implements the csv-reader 1.0.0 semantics: it parses CSV text into `{columns, rows, errors}`. It handles quoted fields, doubled quotes, CRLF line endings, a leading BOM, and reports the errors `short_row`, `long_row`, `stray_cr`, `unterminated_quote`, and `quote_junk`. Instead of reading one character at a time, it jumps to the next delimiter with a native regex scan and slices each field out in one piece, which makes it faster than the reference reader while returning identical answers.

`main.ts` is the driver: it reads the cases from `/input/cases.json`, answers each one with `run()` from `solve.js`, and writes `/output/answers.json` — one answer per case, in the cases' order. It creates the output directory if it does not exist yet, and reads the written file back to verify it holds exactly one answer per case.

Practice set: 6/6 answers identical to the reference.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=vdteqqjz&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
