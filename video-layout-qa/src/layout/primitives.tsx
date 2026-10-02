// Guarded 版的版型元件。AI（或你）只能用這些元件組場景，不能自己寫 x/y 座標。
// 位置交給 flex 排版、字級交給 rules.ts，內容放不下時讓 QA 報錯，而不是默默縮字。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitText } from "@remotion/layout-utils";
import {
  COLORS,
  CONTENT_BOX,
  FONT,
  SAFE,
  SPACING,
  SUBTITLE_ZONE,
  TYPE,
  VIDEO,
  estimateTextWidth,
} from "./rules";
import { useFontsReady } from "./fonts";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { opacity: t, transform: `translateY(${(1 - t) * 24}px)` };
};

// 整個畫面：安全區內的內容區 + 固定的字幕區
export const Stage: React.FC<{ subtitle: string; children: React.ReactNode }> = ({ subtitle, children }) => (
  <AbsoluteFill style={{ background: COLORS.bg, color: COLORS.text, fontFamily: FONT.sans }}>
    <div
      style={{
        position: "absolute",
        left: CONTENT_BOX.x,
        top: CONTENT_BOX.y,
        width: CONTENT_BOX.width,
        height: CONTENT_BOX.height,
        display: "flex",
        flexDirection: "column",
        gap: SPACING.gap,
      }}
    >
      {children}
    </div>
    <div
      style={{
        position: "absolute",
        left: SAFE.x,
        right: SAFE.x,
        top: VIDEO.height - SAFE.bottom - SUBTITLE_ZONE.height,
        height: SUBTITLE_ZONE.height,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        data-qa="subtitle"
        data-qa-role="subtitle"
        style={{
          fontSize: TYPE.subtitle.max,
          lineHeight: TYPE.subtitle.lineHeight,
          fontWeight: TYPE.subtitle.weight,
          background: COLORS.subtitleBg,
          padding: "8px 24px",
          borderRadius: 10,
          textAlign: "center",
          maxWidth: "100%",
        }}
      >
        {subtitle}
      </div>
    </div>
  </AbsoluteFill>
);

// 標題：先試一行（fitText 算剛好塞滿的字級），太小就改兩行，再不行就停在最小字級並警告
export const FitTitle: React.FC<{ text: string; qa?: string; width?: number; delay?: number }> = ({
  text,
  qa = "title",
  width = CONTENT_BOX.width,
  delay = 0,
}) => {
  const ready = useFontsReady();
  const enter = useEnter(delay);
  const rule = TYPE.title;
  let fontSize: number = rule.max;
  let maxLines = 1;
  if (ready) {
    const oneLine = fitText({ text, withinWidth: width, fontFamily: FONT.sans, fontWeight: rule.weight }).fontSize;
    if (oneLine >= rule.min) {
      fontSize = Math.min(oneLine, rule.max);
    } else {
      maxLines = rule.maxLines;
      // 兩行時每行約可放一半的字；乘 0.9 預留斷行位置的誤差
      const twoLines = oneLine * maxLines * 0.9;
      fontSize = clamp(twoLines, rule.min, rule.max);
      if (twoLines < rule.min) {
        console.warn(`CONTENT_WARNING 標題太長，最小字級也放不下 ${maxLines} 行，請縮短文案：「${text}」`);
      }
    }
  }
  return (
    <div
      data-qa={qa}
      data-qa-role="title"
      data-qa-maxlines={maxLines}
      style={{
        fontSize: Math.floor(fontSize),
        fontWeight: rule.weight,
        lineHeight: rule.lineHeight,
        textWrap: "balance",
        width,
        ...enter,
      }}
    >
      {text}
    </div>
  );
};

export const Heading: React.FC<{ children: string; delay?: number }> = ({ children, delay = 0 }) => (
  <div
    data-qa="heading"
    data-qa-role="heading"
    style={{
      fontSize: TYPE.heading.max,
      fontWeight: TYPE.heading.weight,
      lineHeight: TYPE.heading.lineHeight,
      flexShrink: 0,
      ...useEnter(delay),
    }}
  >
    {children}
  </div>
);

// 左右分欄：比例固定，兩欄之間有固定 gap，物件不可能互相壓到
export const Split: React.FC<{ left: React.ReactNode; right: React.ReactNode; ratio?: number }> = ({
  left,
  right,
  ratio = 0.52,
}) => (
  <div style={{ display: "flex", gap: SPACING.gap, flex: 1, minHeight: 0 }}>
    <div style={{ flex: ratio, minWidth: 0, display: "flex", flexDirection: "column" }}>{left}</div>
    <div style={{ flex: 1 - ratio, minWidth: 0, display: "flex", flexDirection: "column" }}>{right}</div>
  </div>
);

export const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: SPACING.minGap }}>
    {items.map((b, i) => (
      <Bullet key={i} index={i} text={b} />
    ))}
  </div>
);

const Bullet: React.FC<{ index: number; text: string }> = ({ index, text }) => {
  const enter = useEnter(index * 6);
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", ...enter }}>
      <div
        style={{
          width: 32,
          height: 32,
          marginTop: TYPE.body.max * 0.3,
          borderRadius: 8,
          background: COLORS.accent,
          flexShrink: 0,
        }}
      />
      <div
        data-qa={`bullet-${index + 1}`}
        data-qa-role="body"
        style={{ fontSize: TYPE.body.max, lineHeight: TYPE.body.lineHeight, fontWeight: TYPE.body.weight, minWidth: 0 }}
      >
        {text}
      </div>
    </div>
  );
};

// 三向交握示意圖：全部用 flex 排，箭頭寬度跟著欄寬伸縮
export const HandshakeDiagram: React.FC<{ left: string; right: string; steps: string[] }> = ({ left, right, steps }) => {
  const enter = useEnter(8);
  const box = (name: string) => (
    <div
      data-qa={`node-${name.toLowerCase()}`}
      data-qa-role="label"
      style={{
        fontSize: TYPE.label.max,
        lineHeight: TYPE.label.lineHeight,
        padding: "12px 28px",
        background: COLORS.panel,
        border: `3px solid ${COLORS.accent}`,
        borderRadius: 12,
      }}
    >
      {name}
    </div>
  );
  return (
    <div
      data-qa="diagram"
      data-qa-role="figure"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: SPACING.gap,
        padding: 32,
        background: "rgba(30,41,59,0.6)",
        borderRadius: 20,
        ...enter,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {box(left)}
        {box(right)}
      </div>
      {steps.map((s, i) => (
        <Arrow key={s} index={i} label={s} toRight={i !== 1} />
      ))}
    </div>
  );
};

const Arrow: React.FC<{ index: number; label: string; toRight: boolean }> = ({ index, label, toRight }) => {
  const color = toRight ? COLORS.accent : COLORS.accent2;
  const enter = useEnter(12 + index * 8);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, ...enter }}>
      <div
        data-qa={`arrow-label-${index + 1}`}
        data-qa-role="label"
        style={{ fontSize: TYPE.label.min + 2, lineHeight: TYPE.label.lineHeight, color }}
      >
        {label}
      </div>
      <svg width="100%" height="24" viewBox="0 0 100 24" preserveAspectRatio="none">
        <line x1="2" y1="12" x2="98" y2="12" stroke={color} strokeWidth="4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ alignSelf: toRight ? "flex-end" : "flex-start", color, fontSize: 28, lineHeight: 1, marginTop: -30 }}>
        {toRight ? "▶" : "◀"}
      </div>
    </div>
  );
};

// 程式碼：依「最長那一行」與「可用高度」算字級；最小字級也放不下時不再縮，
// 交給 QA 報 overflow / subtitle-zone（代表要拆行或拆成兩幕）
export const CodeBlock: React.FC<{ lines: string[]; maxHeight: number }> = ({ lines, maxHeight }) => {
  const enter = useEnter(4);
  const padding = 32;
  const inner = CONTENT_BOX.width - padding * 2;
  const longest = Math.max(...lines.map((l) => estimateTextWidth(l, 1) / 0.56 * 0.6)); // 等寬字約 0.6em
  const byWidth = inner / longest;
  const byHeight = (maxHeight - padding * 2) / (lines.length * TYPE.code.lineHeight);
  const fontSize = clamp(Math.floor(Math.min(byWidth, byHeight)), TYPE.code.min, TYPE.code.max);
  return (
    <pre
      data-qa="code"
      data-qa-role="code"
      data-qa-maxlines={lines.length}
      style={{
        margin: 0,
        padding,
        fontFamily: `${FONT.mono}, ${FONT.sans}`,
        fontSize,
        lineHeight: TYPE.code.lineHeight,
        background: COLORS.panel,
        borderRadius: 16,
        whiteSpace: "pre",
        overflow: "hidden",
        flexShrink: 0,
        ...enter,
      }}
    >
      {lines.join("\n")}
    </pre>
  );
};

export const Callout: React.FC<{ children: string; delay?: number }> = ({ children, delay = 0 }) => (
  <div
    data-qa="note"
    data-qa-role="body"
    style={{
      fontSize: TYPE.body.min,
      lineHeight: TYPE.body.lineHeight,
      fontWeight: 700,
      padding: "16px 28px",
      background: COLORS.accent2,
      color: "#111",
      borderRadius: 14,
      alignSelf: "flex-start",
      ...useEnter(delay),
    }}
  >
    {children}
  </div>
);
