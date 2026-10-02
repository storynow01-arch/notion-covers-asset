// Layout QA：在瀏覽器裡量測每個標了 data-qa 的元素，找出版面問題。
//
// 用法：在元素上加
//   data-qa="唯一名稱"
//   data-qa-role="title | heading | body | label | code | subtitle | figure"
//   data-qa-maxlines="1"         （可選，覆寫 rules.ts 的行數上限）
//   data-qa-allow-overlap="背景" （可選，允許與指定元素重疊，例如底圖）
//
// 檢查五類問題：overlap 重疊、overflow 超框、off-safe-area 超出安全區、
// font-too-small 字太小、unexpected-wrap 非預期換行，另加 subtitle-zone 侵入字幕區、too-close 間距過小。
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { SAFE, SPACING, SUBTITLE_ZONE, TYPE, VIDEO, type Role } from "../layout/rules";

export type ViolationType =
  | "overlap"
  | "overflow"
  | "off-safe-area"
  | "subtitle-zone"
  | "font-too-small"
  | "unexpected-wrap"
  | "too-close";

export type Violation = {
  type: ViolationType;
  elements: string[];
  detail: string;
  box?: { x: number; y: number; w: number; h: number };
};

type Measured = {
  id: string;
  role: string;
  el: HTMLElement;
  x: number;
  y: number;
  w: number;
  h: number;
};

const SUBTITLE_TOP = VIDEO.height - SAFE.bottom - SUBTITLE_ZONE.height;

const countLines = (el: HTMLElement) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  const tops = new Set<number>();
  for (const r of Array.from(range.getClientRects())) {
    if (r.width > 1 && r.height > 1) tops.add(Math.round(r.top / 4));
  }
  return tops.size;
};

const intersect = (a: Measured, b: Measured) => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 2 && h > 2 ? { x, y, w, h } : null;
};

const gapBetween = (a: Measured, b: Measured) => {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.max(dx, dy);
};

const runChecks = (root: HTMLElement): Violation[] => {
  const rootRect = root.getBoundingClientRect();
  const scale = rootRect.width / VIDEO.width; // Studio 預覽會縮放，換算回 1920 座標
  const items: Measured[] = Array.from(root.querySelectorAll<HTMLElement>("[data-qa]")).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      id: el.dataset.qa!,
      role: el.dataset.qaRole ?? "figure",
      el,
      x: (r.left - rootRect.left) / scale,
      y: (r.top - rootRect.top) / scale,
      w: r.width / scale,
      h: r.height / scale,
    };
  });

  const v: Violation[] = [];
  const box = (m: Measured) => ({ x: m.x, y: m.y, w: m.w, h: m.h });

  for (const m of items) {
    // 1. 安全區
    const off =
      m.x < SAFE.x - 1 ||
      m.y < SAFE.top - 1 ||
      m.x + m.w > VIDEO.width - SAFE.x + 1 ||
      m.y + m.h > VIDEO.height - SAFE.bottom + 1;
    if (off) {
      v.push({
        type: "off-safe-area",
        elements: [m.id],
        detail: `位置 (${Math.round(m.x)}, ${Math.round(m.y)}) 尺寸 ${Math.round(m.w)}×${Math.round(m.h)} 超出安全區`,
        box: box(m),
      });
    }

    // 2. 字幕區只能放字幕
    if (m.role !== "subtitle" && m.y + m.h > SUBTITLE_TOP + 1) {
      v.push({
        type: "subtitle-zone",
        elements: [m.id],
        detail: `底部 y=${Math.round(m.y + m.h)} 進入字幕區（y ≥ ${SUBTITLE_TOP}）`,
        box: box(m),
      });
    }

    // 3. 內容超出自己的框（文字被裁切或溢出）
    // 垂直方向容許字形本身略高於行高（中文字型的 ascent/descent 常超出 line-height 幾 px）
    const style = getComputedStyle(m.el);
    const yTolerance = parseFloat(style.fontSize) * 0.25;
    if (m.el.scrollWidth > m.el.clientWidth + 1 || m.el.scrollHeight > m.el.clientHeight + yTolerance) {
      if (style.display !== "inline") {
        v.push({
          type: "overflow",
          elements: [m.id],
          detail: `內容 ${m.el.scrollWidth}×${m.el.scrollHeight} 超出框 ${m.el.clientWidth}×${m.el.clientHeight}`,
          box: box(m),
        });
      }
    }

    // 4. 字級與行數
    const rule = TYPE[m.role as Role];
    if (rule) {
      const fontSize = parseFloat(getComputedStyle(m.el).fontSize);
      if (fontSize < rule.min - 0.5) {
        v.push({
          type: "font-too-small",
          elements: [m.id],
          detail: `${m.role} 字級 ${fontSize.toFixed(0)}px < 最小 ${rule.min}px`,
          box: box(m),
        });
      }
      // 程式碼預設允許的行數 = 原始碼行數（只抓「一行被折成兩行」）
      const defaultMax = m.role === "code" ? (m.el.textContent ?? "").split("\n").length : rule.maxLines;
      const maxLines = Number(m.el.dataset.qaMaxlines ?? defaultMax);
      const lines = countLines(m.el);
      if (lines > maxLines) {
        v.push({
          type: "unexpected-wrap",
          elements: [m.id],
          detail: `${m.role} 換成 ${lines} 行，上限 ${maxLines} 行`,
          box: box(m),
        });
      }
    }
  }

  // 5. 兩兩檢查重疊與間距（祖先/子孫關係不算）
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const allowA = (a.el.dataset.qaAllowOverlap ?? "").split(",");
      const allowB = (b.el.dataset.qaAllowOverlap ?? "").split(",");
      if (allowA.includes(b.id) || allowB.includes(a.id)) continue;
      const hit = intersect(a, b);
      if (hit) {
        v.push({
          type: "overlap",
          elements: [a.id, b.id],
          detail: `重疊面積 ${Math.round(hit.w)}×${Math.round(hit.h)}`,
          box: hit,
        });
      } else if (a.role !== "subtitle" && b.role !== "subtitle") {
        const gap = gapBetween(a, b);
        if (gap < SPACING.minGap && a.el.parentElement !== b.el.parentElement) {
          // 同一個容器內的元素間距由容器 gap 控制；跨容器的才檢查
          v.push({
            type: "too-close",
            elements: [a.id, b.id],
            detail: `間距 ${Math.round(gap)}px < ${SPACING.minGap}px`,
          });
        }
      }
    }
  }
  return v;
};

const COLORS_BY_TYPE: Record<ViolationType, string> = {
  overlap: "#ef4444",
  overflow: "#f97316",
  "off-safe-area": "#eab308",
  "subtitle-zone": "#a855f7",
  "font-too-small": "#ec4899",
  "unexpected-wrap": "#06b6d4",
  "too-close": "#84cc16",
};

export const LayoutQA: React.FC<{
  enabled: boolean;
  overlay: boolean;
  sceneId: string;
  children: React.ReactNode;
}> = ({ enabled, overlay, sceneId, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const [violations, setViolations] = useState<Violation[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const handle = delayRender(`layout-qa ${sceneId}@${frame}`);
    let cancelled = false;
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        if (cancelled || !ref.current) return continueRender(handle);
        const result = runChecks(ref.current);
        // QA 腳本透過 onBrowserLog 收這一行
        console.log("LAYOUT_QA " + JSON.stringify({ sceneId, frame, violations: result }));
        setViolations(result);
        requestAnimationFrame(() => continueRender(handle));
      }),
    );
    return () => {
      cancelled = true;
      continueRender(handle);
    };
  }, [enabled, frame, sceneId]);

  return (
    <AbsoluteFill ref={ref} data-qa-scene={sceneId}>
      {children}
      {enabled && overlay ? <QAOverlay violations={violations} /> : null}
    </AbsoluteFill>
  );
};

const QAOverlay: React.FC<{ violations: Violation[] }> = ({ violations }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {/* 安全區與字幕區 */}
    <div
      style={{
        position: "absolute",
        left: SAFE.x,
        top: SAFE.top,
        right: SAFE.x,
        bottom: SAFE.bottom,
        border: "2px dashed rgba(255,255,255,0.35)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: SAFE.x,
        right: SAFE.x,
        top: SUBTITLE_TOP,
        height: SUBTITLE_ZONE.height,
        background: "rgba(168,85,247,0.12)",
      }}
    />
    {violations
      .filter((v) => v.box)
      .map((v, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: v.box!.x,
            top: v.box!.y,
            width: v.box!.w,
            height: v.box!.h,
            border: `4px solid ${COLORS_BY_TYPE[v.type]}`,
            background: v.type === "overlap" ? "rgba(239,68,68,0.25)" : undefined,
          }}
        />
      ))}
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        maxWidth: 760,
        padding: "12px 16px",
        background: violations.length ? "rgba(127,29,29,0.92)" : "rgba(20,83,45,0.92)",
        color: "white",
        font: "500 22px/1.4 'Noto Sans TC', sans-serif",
        borderRadius: 10,
      }}
    >
      {violations.length === 0 ? (
        <div>✅ Layout QA：PASS</div>
      ) : (
        <>
          <div style={{ fontWeight: 700 }}>❌ Layout QA：{violations.length} 個問題</div>
          {violations.slice(0, 8).map((v, i) => (
            <div key={i} style={{ color: COLORS_BY_TYPE[v.type] }}>
              [{v.type}] {v.elements.join(" × ")}
            </div>
          ))}
          {violations.length > 8 ? <div>…另有 {violations.length - 8} 個</div> : null}
        </>
      )}
    </div>
  </AbsoluteFill>
);
