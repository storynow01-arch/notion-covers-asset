// 同一份教材內容，Baseline 與 Guarded 兩個版本共用。
// 刻意放了「偏長的標題」「偏多的條列」「偏長的程式碼行」，模擬 AI 寫腳本時常見的內容量。

export type Lesson = {
  title: string;
  subtitle: string;
  bullets: string[];
  diagram: { left: string; right: string; steps: string[] };
  code: { caption: string; lines: string[] };
  narration: string[]; // 每一幕的字幕
};

export const lesson: Lesson = {
  title: "第 3 章 網路通訊協定：TCP 三向交握（Three-Way Handshake）完整解析",
  subtitle: "資訊科技｜網路概論單元",
  bullets: [
    "TCP 是連線導向（connection-oriented）的傳輸層協定，傳送資料前必須先建立連線",
    "Client 先送出 SYN 封包，並附上自己的初始序號 ISN（Initial Sequence Number）",
    "Server 收到後回覆 SYN-ACK，確認 Client 的序號，同時送出自己的序號",
    "Client 再送出 ACK 確認 Server 的序號，雙方進入 ESTABLISHED 狀態開始傳資料",
    "為什麼是三次而不是兩次？因為雙方都必須確認「對方收得到我、我也收得到對方」",
    "考試重點：SYN Flood 攻擊就是利用大量只送 SYN、不回 ACK 的半開連線耗盡伺服器資源",
  ],
  diagram: {
    left: "Client",
    right: "Server",
    steps: ["SYN (seq = x)", "SYN-ACK (seq = y, ack = x + 1)", "ACK (ack = y + 1)"],
  },
  code: {
    caption: "用 Python socket 觀察 TCP 連線建立",
    lines: [
      "import socket",
      "",
      "# 建立 TCP socket（SOCK_STREAM 代表使用 TCP 協定）",
      "client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)",
      "",
      "# connect() 呼叫時，作業系統會自動完成三向交握 SYN → SYN-ACK → ACK",
      "client.connect((\"example.com\", 80))",
      "client.sendall(b\"GET / HTTP/1.1\\r\\nHost: example.com\\r\\nConnection: close\\r\\n\\r\\n\")",
      "print(client.recv(1024).decode(\"utf-8\", errors=\"replace\"))",
      "client.close()",
    ],
  },
  narration: [
    "今天我們要來認識 TCP 連線建立時最重要的流程：三向交握。",
    "三向交握一共有三個步驟，我們一步一步看封包裡帶了哪些資訊。",
    "實際寫程式時，三向交握是由作業系統在 connect() 時幫我們完成的。",
  ],
};
