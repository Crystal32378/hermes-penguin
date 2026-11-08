# Penguin 離線介面接線：本輪結果

版本：0.2.3-integration-review.4。只在 integration_review_penguin worktree，以本機 commit 保存並供公開 GitHub 試作分支備份，未安裝、合併或發布正式版本。正式整合等官方討論區開放後再討論。

## 已寫好

- 既有 planner 下方兩個小入口：分享現有卡片、日曆邀請審閱。
- 同一個 SendOff component 的靜止預覽，沒有新卡片、候選 finder 或投票 UI。
- 原有卡片 DOM 的 PNG 匯出程式：等 artwork ready、停止預覽動畫、限制來源與尺寸，預覽後才能下載。圖片需與完整 proposal 文字一起分享。
- Slack／Discord／Buzz 目的地表單，以及選定時段＋每人 email 的 Calendar 表單。
- 兩條 gateway 純資料 route，嚴格欄位驗證，送出與連線按鈕不提供。沒有 Google／群組傳輸。Slack 圖片 metadata 已綁入審閱指紋，仍沒有傳圖片 bytes。
- 表單與圖片僅在元件記憶體。選定時段、profile、欄位改動及卸載使舊回應失效；下載也檢查 scope。
- 表單資料會進入目前 Hermes gateway，因此介面明示它可能遠端。沒有假稱所有資料必定只在本機。

## 通過

- 268 項 Python tests。
- 17 項 JS 純函數 tests。
- 2 個 React 靜態畫面 render assertions。
- esbuild bundle 與 JS 語法檢查。
- 官方 admission validator 16/16，report warnings 空。
- 獨立唯讀程式審查提出的動畫、圖片載入、caption、gateway 和下載 scope 問題已修正。
- 正式 main 在本次保存時為 5e3b213（文件更新），worktree 乾淨，仍為 0.2.2；本次沒有修改。

## 沒有通過或尚未測

實際 PNG 與瀏覽器互動沒有驗證。macOS 拒絕 headless Chromium 的 MachPortRendezvous bootstrap_check_in（Permission denied 1100），啟動即終止。沒有提權、更改安全設定或操作使用者的桌面／瀏覽器；沒有截圖可交付。

準備好的 tests/browser/offline-handoff.mjs 只通過語法檢查，還沒跑。它涵蓋真實卡片 PNG、草稿欄位、選時失效及 390px。既有 Copy／送行 browser regression 也應在允許環境重跑。React static render 不等於畫面檢驗。

尚無 OAuth、真實身份／calendar provenance、group membership、傳輸重送日誌或 E2E。沒有進入提名的測試帳號，也沒有把真實地址寫進 fixtures。

## 主要檔案

- desktop/handoff.js：離線表單。
- desktop/handoff-model.js：純資料與請求代次。
- desktop/card-export.js：既有卡片本機匯出程式，實際 render 尚待驗證。
- desktop/plugin.js：隔離版兩個入口、同一 SendOff 的預覽模式。
- dashboard/plugin_api.py：/handoff/share、/handoff/calendar。
- tests/test_offline_ui_routes.py、tests/offline-handoff.test.mjs、tests/offline-ui-ssr.js。
- tests/browser/offline-handoff.mjs：待執行 browser regression。

詳細原則、官方來源與接線需求見 INTEGRATION_REVIEW.zh-TW.md、CALENDAR_ONLY_SAFETY.zh-TW.md。

## Slack mock 交接

新增 slack_draft.py。文字用 chat.postMessage／chat:write；圖片加同一份 caption 用 getUploadURLExternal、位元組上傳與 completeUploadExternal 三階段計畫／files:write。UI 只傳圖片 metadata 到現有 gateway，不傳圖本身。提供文字、mock image 和 fixture review JSON，全部虛構。確認勾選及 fixture receipt 都不能授權送出；live sender 永遠拒絕。

Slack 權限未授予，App 未安裝，bot 未加入任何頻道。連線、真正圖片檢驗與端對端訊息驗證仍待單獨批准和測試。

## 後續送出安全演練（review.4）

新增 delivery_safety.py 的純離線 reducer 與記憶體 journal，測重複操作、Slack 部分上傳、未知回應、Calendar 409／timeout 核對。Calendar 完整 plan digest 綁身份、client、calendar provenance 與 scope，回應比對 organizer／時段／參加者／guest flags。任何 provider link 都不直接當已驗證連結保存。

這不是 durable production journal，也沒有 HTTP transport。268 項 Python 測試包括新失敗路徑；原 sender 仍永遠拒絕。未完成的瀏覽器、真實身份、scope grant、傳輸／實際送達都不因此算通過。

已備最小 Slack manifest（僅 chat:write、files:write），未送平台 validator、建立或安裝。精確下一步與可批准的獨立雲端 fixture QA 路徑在 NEXT_CONNECTION_STEPS.zh-TW.md。
