import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { FONT } from "./rules";

// 字型檔由 `npm run fonts` 下載到 public/fonts（可變字重字型，一個檔涵蓋所有粗細）
export const fontsReady = Promise.all([
  loadFont({ family: FONT.sans, url: staticFile("fonts/NotoSansTC.ttf"), weight: "100 900" }),
  loadFont({ family: FONT.mono, url: staticFile("fonts/JetBrainsMono.ttf"), weight: "100 800" }),
]);

// fitText 等量測函式必須在字型載入後才準，否則會用備用字型算出錯的大小
export const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    fontsReady.then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  return ready;
};
