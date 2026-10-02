// 輸出 A/B 兩支 MP4（不含 QA 標示框），方便並排比較。
// 用法：npm run render                    → out/video/Baseline.mp4、out/video/Guarded.mp4
//       npm run render -- --overlay       → 影片上保留 QA 紅框（教學/示範用）
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const overlay = process.argv.includes("--overlay");
const browserExecutable = process.env.BROWSER_EXECUTABLE ?? null;

const main = async () => {
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
  for (const id of ["Baseline", "Guarded"]) {
    const inputProps = { qa: overlay, overlay };
    const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable, logLevel: "warn" });
    const outputLocation = path.resolve(`out/video/${id}${overlay ? ".qa" : ""}.mp4`);
    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      outputLocation,
      inputProps,
      browserExecutable,
      logLevel: "warn",
      onProgress: ({ progress }) => process.stdout.write(`\r${id} ${(progress * 100).toFixed(0)}%`),
    });
    console.log(`\n✓ ${outputLocation}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
