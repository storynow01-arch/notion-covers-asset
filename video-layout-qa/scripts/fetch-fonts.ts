// 下載字型到 public/fonts（只需執行一次）。
// 字型放在本地而不是從 Google Fonts 即時載入：渲染結果每次都一樣，離線也能跑，
// 而且文字寬度量測（fitText、QA）才會跟最後輸出的影片一致。
import fs from "node:fs";
import path from "node:path";

const FONTS = {
  "NotoSansTC.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf",
  "JetBrainsMono.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
};

const dir = path.resolve("public/fonts");
fs.mkdirSync(dir, { recursive: true });
for (const [name, url] of Object.entries(FONTS)) {
  const file = path.join(dir, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 10_000) {
    console.log(`✓ ${name} 已存在`);
    continue;
  }
  console.log(`下載 ${name}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${name}`);
}
