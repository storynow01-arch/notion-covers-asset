// 版面規則（Design tokens）。
// 這份檔案就是「規則寫死，不讓 AI 猜」的地方：Guarded 版的元件與 QA 檢查器都讀這裡。
// 數值以 1920×1080 橫式教學影片為準，可依自己的頻道風格調整。

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

export const SAFE = {
  x: 96, // 左右安全邊距
  top: 72, // 上安全邊距
  bottom: 72, // 下安全邊距（字幕區在這之上）
} as const;

// 字幕區：只有字幕可以進來，其他物件一律不能碰
export const SUBTITLE_ZONE = { height: 140 } as const;

export const CONTENT_BOX = {
  x: SAFE.x,
  y: SAFE.top,
  width: VIDEO.width - SAFE.x * 2,
  height: VIDEO.height - SAFE.top - SAFE.bottom - SUBTITLE_ZONE.height,
} as const;

// 每種角色的字級上下限與行數上限。
// 原則：縮字只能縮到 min；再放不下就「改版型 / 拆場景 / 縮短文案」，不要繼續縮。
export const TYPE = {
  title: { min: 56, max: 84, maxLines: 2, lineHeight: 1.25, weight: 700 },
  heading: { min: 44, max: 60, maxLines: 1, lineHeight: 1.3, weight: 700 },
  body: { min: 34, max: 40, maxLines: 3, lineHeight: 1.45, weight: 500 },
  label: { min: 28, max: 34, maxLines: 1, lineHeight: 1.3, weight: 500 },
  code: { min: 26, max: 34, maxLines: 1, lineHeight: 1.5, weight: 400 },
  subtitle: { min: 36, max: 40, maxLines: 2, lineHeight: 1.35, weight: 500 },
} as const;

export type Role = keyof typeof TYPE;

export const SPACING = { gap: 40, minGap: 24 } as const;

// 每一頁最多幾個條列：超過就自動拆成下一頁
export const MAX_BULLETS_PER_PAGE = 3;

export const COLORS = {
  bg: "#0f172a",
  panel: "#1e293b",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#38bdf8",
  accent2: "#f59e0b",
  subtitleBg: "rgba(2, 6, 23, 0.85)",
} as const;

export const FONT = {
  sans: "Noto Sans TC",
  mono: "JetBrains Mono",
} as const;

// 不需要瀏覽器就能估算行數（給 Node 端排時間軸、決定要不要拆頁用）。
// 中日韓全形字約 1em 寬，半形英數約 0.55em 寬，故意估得保守一點。
export const estimateTextWidth = (text: string, fontSize: number) => {
  let em = 0;
  for (const ch of text) {
    em += /[\u0000-ÿ]/.test(ch) ? 0.56 : 1;
  }
  return em * fontSize;
};

export const estimateLines = (text: string, fontSize: number, boxWidth: number) =>
  Math.max(1, Math.ceil(estimateTextWidth(text, fontSize) / boxWidth));
