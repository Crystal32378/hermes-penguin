# Penguin：既有分享卡與 Calendar 接線原型

## 最新範圍

只新增兩個接點，不重做現有 Find shared time、候選時段或分享卡，不做投票／讀取群聊／回覆計票狀態機。

1. 將 Penguin 既有選定時段的分享卡與原有文字送往明確的 Slack、Buzz 或 Discord 群組頻道。
2. 大家在群裡自行討論後，主辦人輸入明確的 attendee email，檢查選定時間、帳號、日曆和通知對象，再決定是否建立 Calendar 邀請。

工時吻合不代表實際有空或已答應。若人們商定工時之外的時間，原型保留警告，交由主辦人決定，不硬性要求新系統收集全員同意。

## 已完成且可重跑

這是私人、本機、**不能送出**的離線原型，不是已連線或可部署的功能。

- 正式 `penguin` 仍是獨立的 main worktree，版本 0.2.2。本機保存時確認 HEAD 為 `5e3b213`（Marketplace 狀態文件更新）；功能基線仍是 `d63015de74effae451d5286cc080b6a3afddd6ad`。本次沒有修改正式 worktree。
- 原型位於獨立 worktree `integration_review_penguin`，分支 `prototype/buzz-google-handoff`，版本 `0.2.3-integration-review.4`。本次只保存為本機 commit；沒有 push、安裝、發布或改目錄 PR。等官方討論區開放後再討論正式整合。
- `group_share.py`：以原本 `preview` 重新計算選定時間，保留現有 `desktop/plugin.js` 的 `proposal(slot)` 與 Copy 警告文字。測試直接以 Node 執行原本 JS 純函數，逐字比對。
- Buzz 草稿綁定 HTTPS community、channel UUID、可選 thread root。Discord 草稿綁定 guild/channel/thread ID，禁止自動提及。兩者目標都標記為未驗證，沒有虛構 message ID 或 permalink。
- 分享草稿可帶現有 SendOff PNG 的 hash、大小與 selection fingerprint；圖片來源、內容和目的地仍需審閱。這只是附件清單，不是已匯出、驗過或上傳圖片。PNG 簽名／大小檢查不等於完整影像驗證。
- 時間、目的地、文字或附件變了，就要重新審閱。Discord 文字超過單則限制會拒絕，不默默截斷或分拆。
- `calendar_only.py`：接受明確 email 對應及限定的測試帳號／日曆資料，產生 `events.insert` 草稿。固定 `sendUpdates=all`、禁止來賓自行改動或邀請其他人、隱藏其他來賓名單。全部仍是未批准且未執行。
- Calendar-only 不必設定 Buzz。舊的純資料 `prepare_handoff` helper／`POST /handoff/prepare` 仍可輸出一般事件草稿和可選 Buzz 短文，但它不是送出入口；**實際分享卡功能應接 `group_share.py`，不要改用 helper 的替代文字**。
- `send_existing_card()` 和 `send_calendar_insert()` 永遠拒絕執行。沒有 network transport、token 讀取、OAuth 或實際外部副作用。

fixture 都使用 example.com、虛構人名和頻道。可查看：

- `existing-share-card.txt`：現有卡片 Copy 的確切文字。
- `existing-share-card-discord.json`、`existing-share-card-buzz.json`：兩種頻道的未批准分享草稿。
- `calendar-only-request.json`、`calendar-only-plan.json`：無 Buzz、指定 app-created 測試日曆的邀請計畫。

## 這輪補好的隔離 UI 與匯出程式

正式 `penguin/desktop/plugin.js` 未更動。隔離原型新增兩個小入口：`Share existing card · preview` 與 `Calendar invitation · preview`。

- 分享入口直接重用同一個 SendOff React component，移除預覽中的送行動畫／關閉按鈕，狀態改成 `MEETING PROPOSAL · NOT SENT`，避免沒複製卻聲稱已完成傳送。
- 預覽卡先停止 CSS 動畫，等圖片與 stamp 載入後，複製實際 DOM 與 computed styles，透過 SVG foreignObject／canvas 產生本機 PNG。限制尺寸、檔案大小和 bundled data image，拒絕外部圖片來源。沒有重新畫卡。
- PNG 僅提供本機預覽與明確點擊下載，沒有上傳。切換時間、profile、關閉表單或過期結果會清除。既有卡只畫每人的開始時鐘與日期，介面明示分享時須附完整提案文字，補上時區、結束時間與時長。
- 日曆入口收集主辦人帳號、app-created Calendar ID 和明確 email；勾選已在群裡檢查時間後，只可準備草稿，並不等於已批准邀請。所有真實送出按鈕固定停用。
- `POST /handoff/share` 與 `/handoff/calendar` 是 gateway 內純資料 route，不讀帳號憑證、不連 Google／Buzz／Discord。UI 明示資料會交給目前 Hermes gateway，該 gateway 可能是遠端，沒有誤稱所有內容必定留在電腦。
- 表單只在元件記憶體，未寫 localStorage、磁碟或團隊設定。選定時間、模式與 profile 綁定元件生命週期；表單修改使舊非同步回應失效。
- 既有 Copy 仍用既有 SendOff、訊息與動畫，沒有改成自動送出。

`APPROVED` 是原有工時判定造型，不代表收到人員同意或日曆已預約。

### 尚未通過的實際驗證

esbuild bundling、JS parse、Python route、純函數與 React static render 已過。原生／瀏覽器畫面與 PNG **尚未驗證**，沒有實際截圖可交付。

macOS headless Chromium 啟動遇到 `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`，隨即終止；先前 Chrome 也在啟動時退出。沒有改安全設定、提權、借用使用者瀏覽器或繞過限制。暫時伺服器已停止。

可重跑隔離 harness 在 `integration-review/card-harness/`；待允許的瀏覽器環境可用時，執行 `tests/browser/offline-handoff.mjs`（本輪只做語法檢查，未執行），驗證 390px、舊 Copy／送行、實際 PNG、切換時間失效與 invitation review。正式合併前還需要人工檢查匯出視覺保真度，不能以 React static render 冒充截圖。

## Buzz 與 Discord 的真實接線條件

### Buzz

官方有 Desktop managed ACP、buzz-acp bridge、native Hermes gateway。建議 dedicated native gateway／受限身份；Desktop managed runtime 自動批准工具，不適合直接接有私人檔案與憑證的個人 agent。獨立 Hermes profile 不等於 OS 沙箱。

需要真實 community、channel、專用 Nostr identity 及管理員認可的 membership。設定具名允許成員與指定 channels，不開全員允許，預設要提及。不能讓群聊裡的任意指令獲得個人終端、檔案或 Google 憑證。

核對 reference adapter 的既有附件路徑：

- `buzz messages send --channel <uuid> --file <local-path> --content -`
- thread 使用既有 reply-to 參數。
- 使用固定 executable、argument array、stdin 傳正文，不能用 shell 插值。
- 底層是官方 NIP-98／NIP-42 簽署流程、`POST /events` 和 `POST /query`，不是自行假設的 `/api/messages/send`。
- 寫入結果不明時先查證，不能盲目重送。

以上尚未呼叫。本次沒有建立身份、加入群組或傳資料。

### Discord

Hermes 有官方 Discord gateway；但在官方 Nous/Hermes Discord 裡是成員，**不代表有權加入自己的 bot**。需要 Manage Server 權限，或該伺服器管理員授權。

安全測試可用自有私人 server 與指定測試頻道、具名成員。最小訊息／圖片權限為 View Channel、Send Messages、Attach Files；如用 thread，另需 Send Messages in Threads。gateway 讀取歷史或 embeds 依實際功能另看，不直接給 Administrator。

應同時限制 allowed users 和 channels。只有 channel allowlist 而未限制 users／roles，可能仍讓該頻道任何人呼叫 agent。不要把全功能個人 Hermes bot 開放給陌生人。先只做明確分享，不需監讀所有群聊。

### Slack：已補離線 adapter

`slack_draft.py` 與 UI 已增加 Slack workspace ID、channel ID、可選 thread timestamp。沒有硬編碼真實測試頻道，也未安裝 ChatGPT App 或 Hermes bot。

- 文字用 `chat.postMessage` 計畫，需 `chat:write`，關閉 markdown、自動提及與 unfurl。
- PNG 加原有完整 caption 使用三階段計畫：`files.getUploadURLExternal` → 上傳經審閱的相同 bytes → `files.completeUploadExternal`。需 `files:write`，caption 只作為 initial_comment 出現一次，不重複發文字，也不用已淘汰的 files.upload。
- 兩種功能全部啟用時的 scope 提案是 chat:write／files:write。只用其中一種時，計畫僅列它所需的 scope；沒有申請權限。
- 原始卡片文字若含可啟動 Slack 提及的語法會拒絕，不默默改寫姓名或 ping 人。
- UI 把本機 PNG 的 SHA-256、尺寸、大小與選定時段 metadata 一起交給目前 Hermes gateway，納入同一份 plan digest。**沒有傳圖片 bytes**，metadata 不證明實際 PNG 完整性。未來真實上傳前必須重新拿到 bytes、驗 hash、decode、核對視覺和選定時段。
- 確認勾選只記錄這份草稿已被查看，不代表授權或已送出。變更頻道、caption、時段、圖片 hash 都使舊審閱失效；`send_slack_delivery` 固定拒絕。
- 還未驗證實際 bot 身份、workspace、channel membership 或 thread 關係；現在只做 ID 格式檢查。Slack scope 本身不是單一頻道的安全邊界，未來仍需專用身份、明確目的地白名單與 membership 驗證。

只向群組送卡片不需要 Socket Mode、歷史訊息／DM 讀取或把整個個人 Hermes 開給群成員。若未來改成讓群組呼叫 agent，要另外審閱功能與權限，不能沿用本次單向分享授權。

## Google：不能直接沿用 broad Workspace setup

詳見 `CALENDAR_ONLY_SAFETY.zh-TW.md`。

重要核對：reference v0.23.0 文件說可用 `--services calendar`，但同 commit setup.py 沒有該參數，OAuth scopes 寫死包含 Gmail read/send/modify、完整 Calendar、Drive、Contacts、Sheets、Docs。因此不能把它當 Calendar-only，也沒有執行它。

`--calendar` 只是 API 目標，不是權限隔離；在個人 Google 帳號另建一個日曆，也不能限制持有完整 Calendar scope 的 token。

原型只接受 `calendar.app.created` 加必要 identity scopes，並釘選 app 自建附屬日曆。拒絕額外 Gmail／Drive／廣泛 Calendar grants。`FixtureCalendarBinding` 只是虛構證據，正式連線前必須改成由 server 驗證的身份／實際 grant／自建日曆 provenance；另測 primary 和無關日曆確實無法存取。

現有 Hermes `google_api.py calendar create` 未傳 `sendUpdates`。未來 adapter 要明確用 `sendUpdates=all`；要求通知不等於通知已送達。

管理型 Google 帳號應當正式帳號保護。提供 Google 郵件不代表已啟用 Calendar 或允許我們的 OAuth app。Workspace 管理員可擋第三方 app。External Testing Calendar grant／refresh token 通常七天到期；公開給所有 Penguin 使用者前還要做 production／verification 評估。全部尚未授權或登入。

## 驗證結果

- Python 全套 **268 passed**：包含原有核心與 Hermes route、Calendar-only、分享卡、離線 UI route 以及 Slack 文字／圖片計畫和審閱失效測試。另有 17 項 JS 純函數測試、2 個 React 靜態畫面 render 檢查通過；不是瀏覽器互動或截圖驗證。
- 1 項 Starlette/httpx 棄用警告，未安裝／升級依賴。
- 官方 admission validator 16/16，report warnings 空。啟動時另有 3 個 Hermes 非本插件工具缺 requests 的診斷，不因此宣稱整個 Hermes 環境通過。
- 覆蓋 DST、跨日、完整工時警告、email 對應、禁止偽造 consent、純資料無 I/O、scope 擴張拒絕、帳號／日曆不符、既有 JS 文字一致、卡片／時段過期、目的地變更和禁止直接送出。
- 尚未測真實連線、受邀通知、OAuth grant、native UI、PNG 渲染與跨平台；不是可對外宣稱的完整整合。
- 重跑：在原型根目錄執行 `../.venv/bin/python -m pytest -q`。

## 官方來源

- https://hermes-agent.nousresearch.com/docs/integrations/buzz
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/buzz
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord
- https://github.com/block/buzz/blob/main/crates/buzz-cli/README.md
- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert
- https://support.google.com/cloud/answer/15549945
- https://support.google.com/a/answer/7281227
- 本機唯讀 reference commit：`2bd378ed1b8d6bf2192cb26e0a55ff3091e6bd19`。

Slack 官方 API 來源：

- https://docs.slack.dev/reference/methods/chat.postMessage/
- https://docs.slack.dev/reference/methods/files.getUploadURLExternal/
- https://docs.slack.dev/reference/methods/files.completeUploadExternal/

## review.4 離線傳輸安全演練

新增 delivery_safety.py 與 test_delivery_safety.py，維持網路 0 次、無 auth／send route。模擬重複操作、部分上傳、未知結果與 Google conflict 的精確核對，不宣稱真的送達或通知寄達。Calendar 審閱雜湊同時綁操作內容與 fixture 身分來源。記憶體 journal 不代表 durable/concurrent production journal。

最小 Slack manifest 只是本機建議檔，精確 scopes 與後續核准／驗證在 NEXT_CONNECTION_STEPS.zh-TW.md。另有 connected cloud computer 可作獨立獲准 QA 環境候選；本輪未切換或傳檔，未繞過 Mac 的 MachPort 拒絕。
