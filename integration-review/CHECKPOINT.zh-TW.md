# Penguin 離線串接保存點

保存日期：2026-11-08。分支：`prototype/buzz-google-handoff`。版本：`0.2.3-integration-review.4`。

## 決定與範圍

先把日曆與多人群組串接的離線試作保存到本機 Git，再依要求備份至公開的 `Crystal32378/hermes-penguin`，只推送 `prototype/buzz-google-handoff` 試作分支。公開分支不是私人備份，也不是正式發行。等官方討論區開放，再討論是否正式加入 Penguin。沒有建立 PR、合併、發布正式版本、修改官方 catalog、安裝插件或對外發言。

正式 0.2.2 位於另一個 `penguin` worktree；保存前核對 main 為 `5e3b213`，工作目錄乾淨。此分支從 0.2.2 功能基線 `d63015d` 延伸，沒有更動 main。

本次包含純資料 Calendar、Slack／Buzz／Discord 草稿、既有分享卡的離線 UI 與 PNG 匯出程式、傳輸失敗路徑演練、虛構 fixtures、測試及接線文件。真正 sender 仍固定拒絕，沒有 OAuth、憑證、外部傳輸或已送達宣稱。

## 本次重跑結果

- Python：268 passed；1 項既有 Starlette/httpx 棄用警告。
- JS handoff 純函數：17 passed。
- React 靜態 render：2 passed；不是瀏覽器畫面檢驗。
- 既有天空／音訊模型回歸：14 passed，使用受控 mocks，不是實際聽音驗證。
- esbuild：實際 plugin bundle 成功。
- 新增與修改的 JS：語法檢查通過。
- 官方 Hermes admission validator：16/16，report warnings 空。另有 3 個非本插件工具缺 `requests` 的環境診斷；未因此安裝依賴。
- `git diff --check`：通過。

驗證使用既有 Python 3.13.15、Node 22.23.1、Hermes reference `2bd378ed1b8d6bf2192cb26e0a55ff3091e6bd19`。最新 Python、JS 與 validator 結果見同目錄的 tests-latest.txt、ui-unit-tests.txt、ui-static-render.txt、validation-latest.json。

## 保存前整理

只納入本原型的原始碼、測試與文件。生成的 card-harness/bundle.js、cache、node_modules、.test-build 與 .test-evidence 不納入 Git。fixtures 的地址／身份／頻道為虛構資料；檢查未發現實際 token、API key 或私鑰。已移除文件中的個人帳號背景與本機使用者絕對路徑。這是限定於本次修改的檢查，不是整個 repository 歷史的秘密稽核。

## 尚待驗證

實際瀏覽器互動、390px 版面、PNG 視覺保真度及原生 Hermes UI 未驗證。先前 macOS Chromium 啟動有 MachPort 權限拒絕；本次不重試該操作，也沒有更改安全設定。真實帳號、權限、日曆來源、通知與群組送達均未測。這是可回復的離線開發保存點，不是可發布版本。

## 重跑

從原型根目錄，使用具備官方 Hermes 測試依賴的 Python 環境：

```bash
export HERMES_SOURCE=/absolute/path/to/hermes-agent
export PENGUIN_NODE_MODULES=/absolute/path/to/node_modules
python -m pytest tests -q
node --test tests/offline-handoff.test.mjs
node tests/browser/build.mjs
node tests/browser/model-check.mjs
```

JS 依賴版本與完整測試前提見 `tests/browser/README.md`。card-harness/capture.mjs 使用同一份依賴設定；可以用 `PLAYWRIGHT_MODULE` 指向環境中已安裝的 Playwright。瀏覽器腳本只能在已允許的環境執行，不列為本次已通過項目。

## 署名

整理、保存與驗證：Murphy。

保留昨晚的工作，讓下一步可以從這裡接著走。
