// 第一層自動檢查：渲染每一幕「版面穩定」的那一格，收集 DOM 量測結果。
// 用法：npm run qa                    → Baseline 與 Guarded 都檢查
//       npm run qa -- --only Guarded  → 只檢查一個版本
//       npm run qa -- --strict        → Guarded 有任何問題就以 exit code 1 結束（可放 CI）
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { checkpoints, type Variant } from "../src/timeline";
import type { Violation } from "../src/qa/LayoutQA";

const args = process.argv.slice(2);
const only = args.includes("--only") ? (args[args.indexOf("--only") + 1] as Variant) : null;
const strict = args.includes("--strict");
const variants: Variant[] = only ? [only] : ["Baseline", "Guarded"];
const browserExecutable = process.env.BROWSER_EXECUTABLE ?? null;

const OUT = path.resolve("out/qa");

type SceneResult = {
  sceneId: string;
  frame: number;
  violations: Violation[];
  warnings: string[];
  image: string;
  cleanImage: string;
};

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log("Bundling…");
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });

  const report: Record<string, SceneResult[]> = {};
  for (const variant of variants) {
    const dir = path.join(OUT, variant);
    fs.mkdirSync(dir, { recursive: true });
    report[variant] = [];
    for (const { sceneId, frame } of checkpoints(variant)) {
      let violations: Violation[] = [];
      const warnings: string[] = [];
      const onBrowserLog = (log: { text: string }) => {
        if (log.text.startsWith("LAYOUT_QA ")) {
          const data = JSON.parse(log.text.slice("LAYOUT_QA ".length));
          if (data.sceneId === sceneId) violations = data.violations;
        } else if (log.text.startsWith("CONTENT_WARNING")) {
          if (!warnings.includes(log.text)) warnings.push(log.text);
        }
      };
      const image = path.join(dir, `${sceneId}.png`);
      const cleanImage = path.join(dir, `${sceneId}.clean.png`);
      for (const [overlay, output] of [
        [true, image],
        [false, cleanImage],
      ] as const) {
        const inputProps = { qa: true, overlay };
        const composition = await selectComposition({ serveUrl, id: variant, inputProps, browserExecutable, logLevel: "warn" });
        await renderStill({ serveUrl, composition, frame, output, inputProps, onBrowserLog, browserExecutable, logLevel: "warn" });
      }
      report[variant].push({
        sceneId,
        frame,
        violations,
        warnings,
        image: path.relative(OUT, image),
        cleanImage: path.relative(OUT, cleanImage),
      });
      const mark = violations.length ? `❌ ${violations.length}` : "✅ 0";
      console.log(`${variant.padEnd(8)} ${sceneId.padEnd(20)} ${mark}`);
    }
  }

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, "report.md"), toMarkdown(report));
  console.log(`\n報告：${path.join(OUT, "report.md")}`);

  const guardedCount = (report.Guarded ?? []).reduce((n, s) => n + s.violations.length, 0);
  if (strict && guardedCount > 0) process.exit(1);
};

const TYPES = ["overlap", "overflow", "off-safe-area", "subtitle-zone", "font-too-small", "unexpected-wrap", "too-close"] as const;

const toMarkdown = (report: Record<string, SceneResult[]>) => {
  const lines: string[] = ["# Layout QA 報告", "", "## 總表", ""];
  lines.push(`| 版本 | 場景數 | 問題總數 | ${TYPES.join(" | ")} |`);
  lines.push(`|---|---|---|${TYPES.map(() => "---").join("|")}|`);
  for (const [variant, scenes] of Object.entries(report)) {
    const all = scenes.flatMap((s) => s.violations);
    const counts = TYPES.map((t) => all.filter((v) => v.type === t).length);
    lines.push(`| ${variant} | ${scenes.length} | **${all.length}** | ${counts.join(" | ")} |`);
  }
  for (const [variant, scenes] of Object.entries(report)) {
    lines.push("", `## ${variant}`, "");
    for (const s of scenes) {
      lines.push(`### ${s.sceneId}（frame ${s.frame}）— ${s.violations.length ? `${s.violations.length} 個問題` : "PASS"}`, "");
      lines.push(`![${variant} ${s.sceneId}](${s.image})`, "");
      for (const w of s.warnings) lines.push(`- ⚠️ ${w}`);
      for (const v of s.violations) lines.push(`- **${v.type}** \`${v.elements.join(" × ")}\`：${v.detail}`);
      lines.push("");
    }
  }
  return lines.join("\n");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
