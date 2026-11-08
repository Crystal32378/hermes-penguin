# Penguin 下一步接線與安全驗收

這份是準備文件，不是已安裝、已授權或已送出的證明。正式參賽版仍是 0.2.2。以下任何實際安裝、持續憑證、權限與傳送都還沒有執行。

## 本輪已補

`delivery_safety.py` 用純函數和記憶體內 fixture journal 演練真正傳輸前需要的順序：

- 精確 payload 審閱後才可模擬下一步；同一 operation ID 不重複建立，已開始的步驟不重複執行。
- Slack 三階段上傳若中斷，保留最後步驟與檔案 ID；不把整段重跑。
- timeout、結果格式不對、200 但 `ok:false`、目的地或檔案不符，都不宣告成功。
- Calendar 409 或 timeout 只可用原 calendar/event ID 的精確讀回結果核對，不能把 409 當已成功，也不重送邀請。
- Calendar 比對時段、參加者、標題、單次事件及 guest privacy flags。成功接受事件仍不代表通知信送達或參加者接受。
- Slack complete-upload 接受不等於已驗證頻道中貼文；沒有憑空製造 permalink。
- 上傳 bearer URL、原始 provider response、不必要錯誤文字不放進日誌。計畫內含必要審閱資料，只在測試記憶體，未持久化。
- Calendar 新增整份 plan digest，含 account/client/actor、calendar 建立來源與 scope；不再把單獨 HTTP request digest 當完整審閱鍵。

這些全部是離線演練。journal 不是 production durable journal，重啟持續性、並行鎖、真正登入身分與使用者同意仍未完成。它不能使原本 disabled 的 sender 變成可用。

## Slack：目前需要的精確授權

已準備 `slack-app-manifest.proposed.json`，依 Slack 官方 manifest schema，僅提議專用 bot 的 `chat:write` 和 `files:write`。沒有 user token scopes、history/search/DM、事件訂閱、Socket Mode 或公開 request endpoint；也不是安裝 ChatGPT App。

尚未送到 Slack 的 manifest validator 或建立 App，因此不稱平台已接受。兩項 scopes 可以送文字和圖片，**並非 channel-only OAuth 權限**。真正開啟前仍要：

1. Crystal 批准在指定測試 workspace 建立／安裝專用 bot 與上述精確權限，由核准介面完成，token 不貼聊天。
2. 由 workspace 管理者邀請 bot 到指定私人測試 channel。核對 workspace ID、bot/app identity、channel 與 thread；不能靠顯示名稱或人的會員資格推定。
3. 在 adapter 端固定目的地 allowlist，不允許任意 channel/DM；不要替官方 Hermes server 安裝。
4. 在允許的瀏覽器環境驗證原卡片 PNG、390px、重複點擊、取消與過期選取。metadata hash 尚不是已檢查過圖像。
5. 完成受保護憑證讀取、最終使用者審閱、durable journal 與真實傳輸後，再請 Crystal 批准一則具名 test channel 的精確卡片＋caption。
6. 如果 minimal scopes 無法核對 ambiguous delivery，停在待確認，請使用者查看頻道；不要擴權 history/search 或重新貼一次。

## Google Calendar：與 Gmail 分開

現有 Hermes reference 的 Workspace setup 會要求 Gmail/Drive 等廣泛 scopes，不用那支 setup 來實現本原型。

1. 用 Crystal 選定且確認可測試的 Google 帳號；這輪沒有進入該帳號。
2. 單獨 Calendar OAuth client，僅提議 `https://www.googleapis.com/auth/calendar.app.created`。需辨識帳號時另明示 identity/email scopes，並核對**實際授予**的 scopes，拒絕舊廣泛 grant 混入。
3. 授權、持續 token、建立 app-owned secondary calendar 都需先完成具體確認。app-created calendar 要用可信的建立回應記錄來源，不靠前端 boolean 或 ID 外觀。
4. 實測 primary、其他 calendar、Gmail/Drive 讀寫不可用。不因限制而換成全 Calendar 權限。
5. 群組自行討論後，主辦人填入每人的 email、檢查選定日期時間、所有收件人、通知與 guest visibility，再批准建立事件。這不會新增投票或候選 finder。
6. 一筆自己／測試收件人的可撤回 fixture meeting 仍需批准確切收件人和時段。檢查事件內容與通知結果，不能將 API 接受說成信件必到。

管理型帳號可能被組織管理員擋第三方 OAuth；External Testing token 時效及驗證限制另見 CALENDAR_ONLY_SAFETY。獨立 calendar 不能收窄一個已授予 broad scopes 的 token。

## 瀏覽器測試的現況

Mac 先前明確拒絕 headless Chromium MachPort bootstrap，沒有再試、提權、關安全功能或動桌面。

環境目錄顯示另有 connected 的 dot cloud computer，但尚未切換或傳檔。雲端可以作為**另外獲准的 fixture-only QA 環境**候選，不可用來規避 Mac 存取限制。若採用，需要先確認該環境工具授權、以支援的檔案傳輸方式只帶純原型＋虛構 fixture，重新讀本地指示並測試；不帶帳號、憑證、使用者瀏覽器或私人 Hermes profile。雲端通過也不代表原生 macOS Hermes 驗證通過。

## 官方來源

- Slack manifest：https://docs.slack.dev/reference/app-manifest/
- chat.postMessage：https://docs.slack.dev/reference/methods/chat.postMessage/
- files.getUploadURLExternal：https://docs.slack.dev/reference/methods/files.getUploadURLExternal/
- files.completeUploadExternal：https://docs.slack.dev/reference/methods/files.completeUploadExternal/
- Google Calendar scopes：https://developers.google.com/workspace/calendar/api/auth
- Google events.insert：https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Google calendars.insert：https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert
