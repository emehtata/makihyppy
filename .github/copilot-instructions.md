This repository is a small Spectravideo cassette preservation workspace.

Key facts:
- The main source artifact is cassette image data under `data/`.
- `extract_svi_basic.py` is the primary tool in the repo. It extracts tokenized SVI/MSX BASIC programs from `.cas` cassette images into ASCII `.bas` listings.
- `web/` contains a vanilla HTML5/Canvas/JS browser port of the extracted `data/makihyppy.bas` ski-jump game. It currently implements only the single-jumper practice loop (approach timing, in-flight balance, landing, distance, and 5-judge style scoring) ported line-by-line from the BASIC source; the full tournament/menu flow has not been ported. No build step, no dependencies — open `web/index.html` directly or serve it with the "Serve web port" VS Code task.
- The repo is intentionally small and mostly data-oriented. Avoid introducing frameworks, packaging, or infrastructure unless explicitly requested.

Working rules for this repo:
- Prefer minimal Python 3 scripts over new dependencies.
- Preserve the original cassette data. Treat files under `data/` as source artifacts.
- When changing the extractor, validate with a narrow command such as `python3 extract_svi_basic.py data/makihyppy.cas /tmp/makihyppy.bas`.
- Keep output files deterministic and readable; generated BASIC listings should stay close to the machine listing format.
- If adding support for more tape formats or dialects, extend the existing script before creating parallel tools.
- When continuing the browser port, extend `web/game.js` (comments reference original BASIC line numbers) rather than starting a new game file or introducing a framework/build tool.

Common commands:
- Extract one file: `python3 extract_svi_basic.py data/makihyppy.cas data/makihyppy.bas`
- Force dialect: `python3 extract_svi_basic.py --dialect svi input.cas output.bas`

What to avoid by default:
- Do not rename or reorganize cassette archive folders unless asked.
- Do not add build systems, packaging metadata, or CI for a single-script workflow unless the user asks for it.
- Do not assume this is a general MSX emulator project; it is currently a cassette-data workspace with one extractor.