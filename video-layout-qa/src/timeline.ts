// 把教材內容排成「場景清單」。React 與 Node（QA 腳本）共用，不能用到瀏覽器 API。
import { lesson } from "./content";
import {
  CONTENT_BOX,
  MAX_BULLETS_PER_PAGE,
  SPACING,
  TYPE,
  estimateLines,
} from "./layout/rules";

export type Variant = "Baseline" | "Guarded";

export type SceneSpec =
  | { id: string; kind: "title"; duration: number; narration: string }
  | {
      id: string;
      kind: "bullets";
      duration: number;
      narration: string;
      bullets: string[];
      page: number;
      pageCount: number;
    }
  | { id: string; kind: "code"; duration: number; narration: string };

const SCENE_FRAMES = 150; // 每幕 5 秒
export const SETTLE_FRAME = 45; // 進場動畫結束、版面穩定的時間點（QA 在這一格檢查）

// Guarded 版：條列的欄寬 = 內容區寬度扣掉圖表欄，與 Split 元件一致
export const BULLET_COLUMN_WIDTH = Math.floor((CONTENT_BOX.width - SPACING.gap) * 0.52);
const HEADING_BLOCK = TYPE.heading.max * TYPE.heading.lineHeight + SPACING.gap;

// 依「預估高度」與「每頁最多幾條」把條列分頁：放不下就拆場景，而不是縮字
export const paginateBullets = (bullets: string[]) => {
  const { max: fontSize, lineHeight } = TYPE.body;
  const available = CONTENT_BOX.height - HEADING_BLOCK;
  const pages: string[][] = [];
  let current: string[] = [];
  let used = 0;
  for (const b of bullets) {
    const lines = estimateLines(b, fontSize, BULLET_COLUMN_WIDTH - 48);
    const h = lines * fontSize * lineHeight + SPACING.minGap;
    if (current.length > 0 && (current.length >= MAX_BULLETS_PER_PAGE || used + h > available)) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(b);
    used += h;
  }
  if (current.length) pages.push(current);
  return pages;
};

export const getScenes = (variant: Variant): SceneSpec[] => {
  const title: SceneSpec = { id: "01-title", kind: "title", duration: SCENE_FRAMES, narration: lesson.narration[0] };
  const code: SceneSpec = { id: "99-code", kind: "code", duration: SCENE_FRAMES, narration: lesson.narration[2] };

  if (variant === "Baseline") {
    // 一般 AI 直接產生的作法：所有條列塞在同一幕
    return [
      title,
      {
        id: "02-handshake",
        kind: "bullets",
        duration: SCENE_FRAMES,
        narration: lesson.narration[1],
        bullets: lesson.bullets,
        page: 1,
        pageCount: 1,
      },
      code,
    ];
  }

  const pages = paginateBullets(lesson.bullets);
  return [
    title,
    ...pages.map(
      (bullets, i): SceneSpec => ({
        id: `02-handshake-p${i + 1}`,
        kind: "bullets",
        duration: SCENE_FRAMES,
        narration: lesson.narration[1],
        bullets,
        page: i + 1,
        pageCount: pages.length,
      }),
    ),
    code,
  ];
};

export const totalFrames = (variant: Variant) =>
  getScenes(variant).reduce((sum, s) => sum + s.duration, 0);

// 每一幕要檢查的影格（絕對影格編號）
export const checkpoints = (variant: Variant) => {
  let from = 0;
  return getScenes(variant).map((s) => {
    const frame = from + Math.min(SETTLE_FRAME, s.duration - 1);
    from += s.duration;
    return { sceneId: s.id, frame };
  });
};
