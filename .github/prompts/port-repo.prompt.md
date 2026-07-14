---
mode: ask
description: "Use when onboarding this Spectravideo cassette repo on a new machine or with a different LLM. Summarizes repo purpose, key files, validation commands, and next setup steps."
---

You are onboarding to this repository on a new machine and possibly with a different LLM runtime.

Your job:
1. Summarize what this repository is for.
2. Identify the primary script, the primary data location, and the expected workflow.
3. Confirm what can be run locally with no extra dependencies.
4. List any machine prerequisites that are helpful but optional.
5. Propose the smallest next steps to continue work safely.

Important repo facts:
- This repo is a Spectravideo 318/328 cassette archive workspace.
- `extract_svi_basic.py` is the main tool. It detokenizes BASIC programs from `.cas` cassette images into `.bas` text listings.
- `data/` contains the cassette source material and extracted BASIC listings.
- Python 3 is the intended runtime. Keep the workflow dependency-light.
- Changes should preserve original cassette files and focus on extraction accuracy.

When answering:
- Prefer concrete commands over general advice.
- Keep the explanation short and practical.
- If you suggest validation, use `python3 extract_svi_basic.py data/makihyppy.cas /tmp/makihyppy.bas` as the first check.
- If the user wants broader modernization, explain that the current repo is intentionally minimal and data-centric.