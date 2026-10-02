// Baseline：模擬「AI 直接產生」的常見寫法。
// 特徵：每個物件用 position:absolute 寫死座標、字級寫死、不管文字實際多長、
// 字幕直接貼在底部。版面在內容短的時候看起來沒問題，內容一長就出事。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { lesson } from "../content";
import { COLORS, FONT } from "../layout/rules";
import type { SceneSpec } from "../timeline";

const fadeIn = (frame: number, delay = 0) =>
  interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Subtitle: React.FC<{ text: string }> = ({ text }) => (
  <div
    data-qa="subtitle"
    data-qa-role="subtitle"
    style={{
      position: "absolute",
      bottom: 40,
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 34,
      color: "white",
      background: "rgba(0,0,0,0.6)",
      padding: "10px 0",
    }}
  >
    {text}
  </div>
);

const TitleScene: React.FC<{ spec: SceneSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily: FONT.sans, color: COLORS.text }}>
      <div
        data-qa="title"
        data-qa-role="title"
        style={{ position: "absolute", left: 120, top: 360, width: 1680, fontSize: 92, fontWeight: 700, opacity: fadeIn(frame) }}
      >
        {lesson.title}
      </div>
      <div
        data-qa="course-label"
        data-qa-role="label"
        style={{ position: "absolute", left: 120, top: 560, fontSize: 40, color: COLORS.accent, opacity: fadeIn(frame, 10) }}
      >
        {lesson.subtitle}
      </div>
      <Subtitle text={spec.narration} />
    </AbsoluteFill>
  );
};

const BulletsScene: React.FC<{ spec: Extract<SceneSpec, { kind: "bullets" }> }> = ({ spec }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily: FONT.sans, color: COLORS.text }}>
      <div data-qa="heading" data-qa-role="heading" style={{ position: "absolute", left: 100, top: 50, fontSize: 60, fontWeight: 700 }}>
        TCP 三向交握的流程
      </div>
      <ul style={{ position: "absolute", left: 100, top: 170, width: 1100, margin: 0, paddingLeft: 40 }}>
        {spec.bullets.map((b, i) => (
          <li
            key={i}
            data-qa={`bullet-${i + 1}`}
            data-qa-role="body"
            style={{ fontSize: 38, lineHeight: 1.5, marginBottom: 16, opacity: fadeIn(frame, i * 4) }}
          >
            {b}
          </li>
        ))}
      </ul>
      <div
        data-qa="diagram"
        data-qa-role="figure"
        style={{ position: "absolute", left: 1150, top: 220, width: 650, height: 520, opacity: fadeIn(frame, 10) }}
      >
        <BaselineDiagram />
      </div>
      <Subtitle text={spec.narration} />
    </AbsoluteFill>
  );
};

const BaselineDiagram: React.FC = () => (
  <div style={{ position: "relative", width: "100%", height: "100%" }}>
    {[lesson.diagram.left, lesson.diagram.right].map((name, i) => (
      <div
        key={name}
        style={{
          position: "absolute",
          left: i === 0 ? 0 : 470,
          top: 0,
          width: 180,
          padding: "14px 0",
          textAlign: "center",
          background: COLORS.panel,
          border: `3px solid ${COLORS.accent}`,
          borderRadius: 12,
          fontSize: 34,
        }}
      >
        {name}
      </div>
    ))}
    {lesson.diagram.steps.map((s, i) => (
      <div
        key={s}
        data-qa={`arrow-label-${i + 1}`}
        data-qa-role="label"
        style={{
          position: "absolute",
          left: 90,
          top: 130 + i * 120,
          width: 470,
          fontSize: 30,
          whiteSpace: "nowrap",
          color: i === 1 ? COLORS.accent2 : COLORS.accent,
          borderBottom: `4px solid ${i === 1 ? COLORS.accent2 : COLORS.accent}`,
          textAlign: i === 1 ? "right" : "left",
        }}
      >
        {i === 1 ? "◀ " : ""}
        {s}
        {i === 1 ? "" : " ▶"}
      </div>
    ))}
  </div>
);

const CodeScene: React.FC<{ spec: SceneSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily: FONT.sans, color: COLORS.text }}>
      <div data-qa="heading" data-qa-role="heading" style={{ position: "absolute", left: 160, top: 80, fontSize: 56, fontWeight: 700 }}>
        {lesson.code.caption}
      </div>
      <pre
        data-qa="code"
        data-qa-role="code"
        style={{
          position: "absolute",
          left: 160,
          top: 200,
          width: 1200,
          height: 560,
          margin: 0,
          padding: 32,
          boxSizing: "border-box",
          fontFamily: FONT.mono,
          fontSize: 30,
          lineHeight: 1.5,
          background: COLORS.panel,
          borderRadius: 16,
          opacity: fadeIn(frame),
        }}
      >
        {lesson.code.lines.join("\n")}
      </pre>
      <div
        data-qa="note"
        data-qa-role="body"
        style={{
          position: "absolute",
          right: 120,
          top: 300,
          width: 480,
          padding: 24,
          fontSize: 34,
          background: COLORS.accent2,
          color: "#111",
          borderRadius: 16,
          opacity: fadeIn(frame, 15),
        }}
      >
        重點：connect() 會自動觸發三向交握
      </div>
      <Subtitle text={spec.narration} />
    </AbsoluteFill>
  );
};

export const BaselineScene: React.FC<{ spec: SceneSpec }> = ({ spec }) => {
  if (spec.kind === "title") return <TitleScene spec={spec} />;
  if (spec.kind === "bullets") return <BulletsScene spec={spec} />;
  return <CodeScene spec={spec} />;
};
