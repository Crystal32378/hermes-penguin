# Calendar-only 原型：權限邊界與帳號保護

## 結論

此原型不連線、不登入、不讀取任何 token／信箱，不產生 client secret、refresh token 或其他持續存取憑證。既有郵件帳號若用來收信，應視為正式帳號保護，不能只因使用頻率低就稱為測試帳號。檔案與 fixture 僅使用 example.com 虛構地址。

新增 `calendar_only.py` 是離線 policy／request planner；不註冊成新的模型工具，也不增加 live API route。另有純資料 UI review route，會接收目前 Hermes gateway 的表單，但不連 Google；UI 明示 gateway 可能是遠端。`send_calendar_insert()` 永遠拒絕執行。程式中的 FixtureCalendarBinding 是測試資料，不是已驗證 OAuth 身分或可用權限。

## 已完成的保護測試

- 僅接受 `https://www.googleapis.com/auth/calendar.app.created`，可伴隨識別帳號所需的 `openid`／email-address identity scopes；email-address identity scope 不等於 Gmail 信箱權限。
- 任何 Gmail、Drive、Docs、Sheets、Contacts、完整 Calendar、calendar.events、calendar.events.owned、free/busy 或其他額外 grant 都拒絕。這是檢查實際 granted scope metadata 的設計，不是只相信當初要求的清單。
- `primary`、未釘選的日曆、另一帳號、另一 OAuth client 或另一操作人都無法通過離線 policy。
- 只產生指定日曆的 events.insert 計畫，不提供 list／update／delete／sharing／Gmail 操作。
- 明列 `sendUpdates=all`、受邀 email、隱藏其他與會者清單、禁止來賓修改或邀請他人。這些是待使用者確認的計畫，不代表已批准或通知寄達。
- 草稿變更會改變 request digest；另有完整 plan digest 綁 account/client/actor、calendar 來源與 scopes。操作 UUID 對應固定事件 ID，但真正跨程序的重送日誌與衝突處理尚未完成，不能宣稱 exactly-once。
- 不符合全員工時的時段保留明確警告，由主辦人審閱群裡商定的例外，不另建全員同意狀態機。真實忙碌和人員同意仍標為未核實。
- 全套目前 **268 項測試通過**，其中 Calendar-only 測試 36 項、現有分享卡路由測試 15 項。唯一警告為現有 Starlette/httpx 棄用警告。

## 關鍵發現：Hermes 文件與實作不一致

核對官方 reference commit `2bd378ed1b8d6bf2192cb26e0a55ff3091e6bd19`：

- Google Workspace SKILL.md 建議 `--services calendar`。
- 同 commit 的 `scripts/setup.py` **沒有 `--services` 或 `--format` 參數**。
- `get_auth_url()` 寫死使用 SCOPES，包含 Gmail readonly/send/modify、完整 Calendar、Drive、Contacts readonly、Sheets、Docs。
- 它要求 offline access，可建立持續更新的憑證。因此不能把該流程描述成 Calendar-only。
- `google_api.py --calendar` 只是 API target，不是安全限制。底層 token 仍可能存取其他有權限的日曆。
- 它的 calendar create 未傳 `sendUpdates`。未來功能不能據此保證會寄邀請。

本次沒有執行該 setup、修改 Hermes source、讀取任何使用者 credential 或 OAuth consent。

## OAuth 能隔離什麼

Google 官方 scope 說明：

- `calendar` 可查看、編輯、分享、永久刪除可存取的所有日曆。
- `calendar.events` 涵蓋所有日曆事件；`calendar.events.owned` 涵蓋所有自有日曆事件。它們都不會因為 UI 指向某一本測試日曆，就自動隔離其他日曆。
- `calendar.app.created` 允許 app 建附屬日曆並管理其事件，官方 calendars.insert 和 events.insert 均接受此 scope。後續 live adapter 應以此為候選最小寫入範圍，驗證 calendar provenance，並測試對 primary／不相關日曆確實遭拒。
- 如日後需要讀本人忙碌，可單獨討論 `calendar.freebusy`；讀有權存取日曆的忙碌可用 `calendar.events.freebusy`。這兩者不讀活動標題，但仍會暴露忙碌時間，不能擅自加。現階段原型拒絕它們。
- 不能用同一 OAuth app 先前取得的廣泛權限來「假裝縮權」。Google incremental authorization 的 combined grants 可能保留舊 scope；必須核對真正 granted scopes，不能只改新請求文字。
- 單獨 Hermes profile 不是 OS 沙箱。正式 transport 應使用 agent 任意終端工具不能直接取得的憑證邊界；否則 prompt injection 仍可能越過 plugin 內的日曆白名單。

## Google 驗證／測試／管理員限制

已唯讀核對 Google 官方文件：

1. OAuth audience 設為 External 可以服務一般 Google 帳號；Testing 狀態只能讓列名的最多 100 名測試使用者授權。
2. Testing 下的授權七天到期，offline refresh token 亦會到期。只要求基本 OIDC 身分的例外不適用包含 Calendar scope 的請求。
3. 個人／少數認識的人使用，以及 development/testing/staging，有官方驗證豁免情境；這不等於公開對所有 Penguin 使用者發布都不需驗證。正式發布應根據實際 scope 分類、品牌／隱私政策和 production 設定決定審查要求，不能只以「少於 100 人」推定永遠可免。
4. Internal audience 必須是 Google Cloud organization 所擁有的專案、供同組織使用。擁有一個組織域名信箱不代表擁有該 organization 的管理權。
5. Google Workspace 管理員可對第三方 OAuth client 設 Trusted、Limited、Specific Google data、Blocked；即使使用者願意授權，組織仍可封鎖。阻擋時應交由管理員處理，不能繞過或索取全域信任。
6. 組織提供 Google 郵件不代表 Calendar 已啟用，亦不代表允許第三方 OAuth client；需要就指定帳號另外核對。本原型未登入任何帳號。

## 下一個安全里程碑

先完成既有分享卡匯出及離線 UI 審閱；群裡的討論與確認沿用既有通訊工具，不新增投票功能。在真的需要帳號時：

- 優先一個沒有私人郵件／私人共享日曆的獨立測試 Google 帳號。
- 另建測試 OAuth project 與針對 Calendar 的 adapter，不沿用 broad Workspace setup。
- 逐項讓使用者看見帳號、用途、確切 scopes、會建立的附屬日曆與是否要離線存取，再取得核准。
- 不啟動郵件 API、不申請 Gmail／Drive scopes、不用 domain-wide delegation。
- 在允許環境中先以無外部受邀者的虛構事件測試；再測 primary／其他日曆不可存取、scope擴張拒絕、重試去重；全數核實後才進真實邀請。

## 官方來源

- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert
- https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- https://support.google.com/cloud/answer/15549945
- https://support.google.com/a/answer/7281227
