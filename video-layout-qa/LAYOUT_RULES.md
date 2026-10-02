# 教學影片版面規則（給 AI 的系統提示）

> 用法：在請 AI（Claude Code、ChatGPT、Cursor…）產生或修改影片場景之前，把這整份貼進提示詞，
> 或放進專案的 `CLAUDE.md` / `AGENTS.md`。數值來源是 `src/layout/rules.ts`，兩邊要同步。

## 畫面規格
- 1920×1080、30fps。
- 安全區：左右 96px、上下 72px。所有文字和重要物件都必須在安全區內。
- 字幕區：安全區底部的 140px 只能放字幕，其他物件一律不能進入。

## 字級（不可低於下限）
| 角色 | 下限 | 上限 | 最多行數 |
|---|---|---|---|
| 標題 title | 56px | 84px | 2 |
| 小標 heading | 44px | 60px | 1 |
| 內文 body | 34px | 40px | 每條 3 行 |
| 標籤 label | 28px | 34px | 1 |
| 程式碼 code | 26px | 34px | 不可自動折行 |
| 字幕 subtitle | 36px | 40px | 2 |

## 排版規則
1. **不准寫死座標**：不可以用 `position: absolute` 加 `left/top` 擺放可讀文字。只能用 `src/layout/primitives.tsx` 的元件：
   `Stage`、`FitTitle`、`Heading`、`Split`、`BulletList`、`HandshakeDiagram`（或其他圖表元件）、`CodeBlock`、`Callout`。
2. **長度不確定就假設會換行**：文字區塊要用 flex/grid 預留空間，不能假設它一定只有一行。
3. **不要一直縮字來救版面**：字級縮到下限還放不下時，依序處理：
   1. 換版型（例如改 Split 比例，或把圖放到下方）
   2. 拆成兩幕（條列一頁最多 3 條，`paginateBullets` 會自動拆）
   3. 縮短文案（標題超過兩行就改寫成更短的版本）
4. **程式碼不准自動折行**：最長那一行在最小字級也放不下時，要手動拆行或拆成兩幕。
5. **每個可讀元素都要標 `data-qa` 和 `data-qa-role`**，否則自動檢查器看不到它。

## 交付前的自我檢查（必做）
1. 執行 `npm run qa -- --only Guarded --strict`。
2. 讀 `out/qa/report.md`，每一個問題都要修掉，修完再跑一次，直到 exit code 為 0。
3. 有 API key 時，再跑 `npm run review -- --only Guarded`，處理所有 `blocker` 和 `major`。
4. 不可以為了讓檢查通過而刪掉 `data-qa` 標記、放寬 `rules.ts`，或加上 `data-qa-allow-overlap` 掩蓋問題。真的需要例外時，要在回覆裡說明原因。
