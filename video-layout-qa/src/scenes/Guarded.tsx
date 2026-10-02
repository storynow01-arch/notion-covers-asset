// Guarded：同一份內容，改用版型元件 + 規則 + 自動拆頁。
import React from "react";
import { lesson } from "../content";
import { COLORS, CONTENT_BOX, SPACING, TYPE } from "../layout/rules";
import { BulletList, Callout, CodeBlock, FitTitle, HandshakeDiagram, Heading, Split, Stage, useEnter } from "../layout/primitives";
import type { SceneSpec } from "../timeline";

const TitleScene: React.FC<{ spec: SceneSpec }> = ({ spec }) => {
  const enter = useEnter(10);
  return (
    <Stage subtitle={spec.narration}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
        <FitTitle text={lesson.title} />
        <div
          data-qa="course-label"
          data-qa-role="label"
          style={{ fontSize: TYPE.label.max, lineHeight: TYPE.label.lineHeight, color: COLORS.accent, ...enter }}
        >
          {lesson.subtitle}
        </div>
      </div>
    </Stage>
  );
};

const BulletsScene: React.FC<{ spec: Extract<SceneSpec, { kind: "bullets" }> }> = ({ spec }) => (
  <Stage subtitle={spec.narration}>
    <Heading>{`TCP 三向交握的流程${spec.pageCount > 1 ? `（${spec.page}/${spec.pageCount}）` : ""}`}</Heading>
    <Split
      left={<BulletList items={spec.bullets} />}
      right={<HandshakeDiagram {...lesson.diagram} />}
    />
  </Stage>
);

// 程式碼區可用高度 = 內容區 − 標題列 − 重點框 − 兩個間距（多留 8px 給字形誤差）
const CODE_MAX_HEIGHT =
  CONTENT_BOX.height -
  TYPE.heading.max * TYPE.heading.lineHeight -
  (TYPE.body.min * TYPE.body.lineHeight + 32) -
  SPACING.gap * 2 -
  8;

const CodeScene: React.FC<{ spec: SceneSpec }> = ({ spec }) => (
  <Stage subtitle={spec.narration}>
    <Heading>{lesson.code.caption}</Heading>
    <CodeBlock lines={lesson.code.lines} maxHeight={CODE_MAX_HEIGHT} />
    <Callout delay={15}>重點：connect() 會自動觸發三向交握</Callout>
  </Stage>
);

export const GuardedScene: React.FC<{ spec: SceneSpec }> = ({ spec }) => {
  if (spec.kind === "title") return <TitleScene spec={spec} />;
  if (spec.kind === "bullets") return <BulletsScene spec={spec} />;
  return <CodeScene spec={spec} />;
};
