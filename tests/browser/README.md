# Reproduce the desktop checks

These tests bundle the actual `desktop/plugin.js`, use its real Python API with a temporary Hermes home, and import the official SDK's budgeted-loop source. The small SDK/profile/visibility adapter is test-only. Browser checks use real Chrome WebAudio; model checks use controlled audio mocks. Neither is native Hermes or human-listening proof.

Prerequisites: Node, Chrome, Python with pytest/FastAPI/httpx/uvicorn and the dependencies of an official Hermes checkout. Tested Hermes v0.23.0 commit `2bd378ed1b8d6bf2192cb26e0a55ff3091e6bd19`. Pinned Node development dependencies are in `package.json`; they are not plugin runtime dependencies. In a separate development environment run `npm install --prefix tests/browser` (not needed when pointing to existing matching dependencies).

From the package root:

```bash
export HERMES_SOURCE=/absolute/path/to/hermes-agent
# Optional: existing Node dependencies instead of tests/browser/node_modules
export PENGUIN_NODE_MODULES=/absolute/path/to/node_modules
export PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
export PLAYWRIGHT_CHANNEL=chrome
export PENGUIN_TEST_URL=http://127.0.0.1:8773
export PENGUIN_TEST_EVIDENCE=/absolute/path/to/private-test-evidence
node tests/browser/build.mjs
node tests/browser/model-check.mjs
# In a separate terminal with HERMES_SOURCE set:
python tests/browser/server.py
# With the server running:
node tests/browser/ui-check.mjs
node tests/browser/loop-check.mjs  # about 150 seconds
node tests/desktop-completion.mjs
node tests/browser/recovery-check.mjs
```

The server binds only to 127.0.0.1 and creates fresh fictional demo profiles. Stop it with Ctrl+C. Port defaults to 8773; change PENGUIN_TEST_PORT and PENGUIN_TEST_URL together. `.test-build`, `.test-evidence` and `node_modules` are ignored and not submission files. Do not target personal Hermes.

UI checks include real MP3 decoding, mute/volume/pause, still/reduced motion, time-zone/count/invalid/pending updates, reference slider, narrow layout, simulated visibility, profile and plugin disposal, and failed-music retry. Loop check runs beyond the actual track duration, verifies a single looping source and advancing phase, measures draw time and verifies paused sleep. It does not judge the audible loop seam. Completion and recovery reuse existing regression tests unchanged.

Audio scopes are deliberately distinct: model mock; headless browser WebAudio; native host observation; human listening. Do not combine their claims or claim the old, unavailable cloud harness's 21 tests were rerun.
