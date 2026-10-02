// 第二層 AI 視覺審查：把每一幕的乾淨截圖 + 第一層 DOM 檢查結果交給 Claude，
// 依教學影片的評分表打分並給出「可直接改程式」的修正建議。
// 前置：先跑 `npm run qa`（會產生 out/qa/report.json 與截圖），並設定 ANTHROPIC_API_KEY。
// 用法：npm run review                    → 審查所有版本
//       npm run review -- --only Guarded  → 只審查一個版本
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Violation } from "../src/qa/LayoutQA";

const QA_DIR = path.resolve("out/qa");
const OUT = path.resolve("out/review");

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const Review = z.object({
  scores: z.object({
    hierarchy: z.number().describe("1-5：標題/內文/標籤的字級階層是否清楚"),
    crowding: z.number().describe("1-5：畫面是否擁擠（5 = 留白剛好）"),
    alignment: z.number().describe("1-5：對齊與間距是否一致"),
    readability: z.number().describe("1-5：在手機或投影上是否看得清楚"),
    teaching_focus: z.number().describe("1-5：學生能否一眼看出這一幕的教學重點"),
  }),
  issues: z.array(
    z.object({
      severity: z.enum(["blocker", "major", "minor"]),
      element: z.string().describe("對應的 data-qa 名稱，沒有就描述位置"),
      problem: z.string(),
      fix: z.string().describe("具體修法：改哪個元件/參數、拆場景或縮短文案"),
    }),
  ),
  pass: z.boolean().describe("沒有 blocker 且每項分數 >= 4 才算通過"),
  summary: z.string(),
});

const SYSTEM = `你是資訊科教學影片的美術指導，負責在每一幕輸出前做版面審查。
畫面規格 1920×1080，安全區左右 96px、上下 72px，底部 140px 是字幕專用區。
字級下限：標題 56px、小標 44px、內文 34px、標籤 28px、字幕 36px。

審查原則：
- 第一層程式檢查（DOM 量測）已經抓過重疊、超框、超出安全區、字太小、非預期換行。它的結果會附在下面。不要重複列出這些問題，除非你在畫面上看到它造成的實際影響。
- 你負責程式量不到的部分：視覺階層、擁擠程度、留白是否失衡、對齊、顏色對比、教學重點是否一眼可見。
- 修正建議要能直接落實到版型元件上，例如「改用 Split ratio 0.6」「這幕條列太多，拆成兩幕」「標題縮短成 XX」。不要建議「把字縮小」來解決空間不足。`;

const main = async () => {
  const report = JSON.parse(fs.readFileSync(path.join(QA_DIR, "report.json"), "utf8")) as Record<
    string,
    { sceneId: string; violations: Violation[]; cleanImage: string }[]
  >;
  const client = new Anthropic();
  fs.mkdirSync(OUT, { recursive: true });
  const results: Record<string, unknown[]> = {};
  const md: string[] = ["# AI 視覺審查報告", ""];

  for (const [variant, scenes] of Object.entries(report)) {
    if (only && variant !== only) continue;
    results[variant] = [];
    md.push(`## ${variant}`, "", "| 場景 | 階層 | 擁擠 | 對齊 | 可讀 | 重點 | 結果 |", "|---|---|---|---|---|---|---|");
    const details: string[] = [];
    for (const scene of scenes) {
      const image = fs.readFileSync(path.join(QA_DIR, scene.cleanImage)).toString("base64");
      const response = await client.beta.messages.parse({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: betaZodOutputFormat(Review) },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/png", data: image } },
              {
                type: "text",
                text: `場景：${scene.sceneId}\n第一層 DOM 檢查結果（${scene.violations.length} 個問題）：\n${JSON.stringify(
                  scene.violations.map((v) => ({ type: v.type, elements: v.elements, detail: v.detail })),
                  null,
                  2,
                )}\n\n請依評分表審查這一幕。`,
              },
            ],
          },
        ],
      });
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        console.warn(`${variant} ${scene.sceneId}：沒有取得審查結果（stop_reason=${response.stop_reason}）`);
        continue;
      }
      const r = response.parsed_output;
      results[variant].push({ sceneId: scene.sceneId, ...r });
      const s = r.scores;
      md.push(
        `| ${scene.sceneId} | ${s.hierarchy} | ${s.crowding} | ${s.alignment} | ${s.readability} | ${s.teaching_focus} | ${r.pass ? "✅" : "❌"} |`,
      );
      details.push(`### ${variant} / ${scene.sceneId}`, "", r.summary, "");
      for (const i of r.issues) details.push(`- **[${i.severity}] ${i.element}**：${i.problem} → ${i.fix}`);
      details.push("");
      console.log(`${variant.padEnd(8)} ${scene.sceneId.padEnd(20)} ${r.pass ? "✅" : "❌"} ${r.summary}`);
    }
    md.push("", ...details);
  }

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(OUT, "report.md"), md.join("\n"));
  console.log(`\n報告：${path.join(OUT, "report.md")}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
