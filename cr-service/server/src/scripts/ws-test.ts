import { WebSocket } from "ws";

const url = process.argv[2] || "ws://localhost:3000";

console.log(`Connecting to ${url}...`);

const ws = new WebSocket(url);

ws.on("open", () => {
  console.log("Connected!");

  // クライアント一覧をリクエスト
  ws.send(JSON.stringify({ type: "clients" }));

  // ブロードキャストメッセージを送信
  setTimeout(() => {
    console.log("Sending broadcast message...");
    ws.send(
      JSON.stringify({ type: "broadcast", message: "Hello from test client!" }),
    );
  }, 1000);

  // 5秒後に切断
  setTimeout(() => {
    console.log("Closing connection...");
    ws.close();
  }, 5000);
});

ws.on("message", (data) => {
  console.log("Received:", JSON.parse(data.toString()));
});

ws.on("close", () => {
  console.log("Connection closed");
  process.exit(0);
});

ws.on("error", (error) => {
  console.error("Error:", error);
  process.exit(1);
});
