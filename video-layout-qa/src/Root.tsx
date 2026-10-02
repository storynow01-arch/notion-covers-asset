import React from "react";
import { Composition, Series } from "remotion";
import { LayoutQA } from "./qa/LayoutQA";
import { BaselineScene } from "./scenes/Baseline";
import { GuardedScene } from "./scenes/Guarded";
import { VIDEO } from "./layout/rules";
import { getScenes, totalFrames, type Variant } from "./timeline";
import "./layout/fonts";

export type LessonProps = {
  qa: boolean; // 是否執行版面檢查
  overlay: boolean; // 是否把問題框畫在畫面上
};

const makeLesson = (variant: Variant): React.FC<LessonProps> => {
  const Scene = variant === "Baseline" ? BaselineScene : GuardedScene;
  const LessonVideo: React.FC<LessonProps> = ({ qa, overlay }) => (
    <Series>
      {getScenes(variant).map((spec) => (
        <Series.Sequence key={spec.id} durationInFrames={spec.duration} name={spec.id}>
          <LayoutQA enabled={qa} overlay={overlay} sceneId={spec.id}>
            <Scene spec={spec} />
          </LayoutQA>
        </Series.Sequence>
      ))}
    </Series>
  );
  return LessonVideo;
};

const Baseline = makeLesson("Baseline");
const Guarded = makeLesson("Guarded");

export const Root: React.FC = () => (
  <>
    {(["Baseline", "Guarded"] as const).map((variant) => (
      <Composition
        key={variant}
        id={variant}
        component={variant === "Baseline" ? Baseline : Guarded}
        durationInFrames={totalFrames(variant)}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={{ qa: true, overlay: true } satisfies LessonProps}
      />
    ))}
  </>
);
