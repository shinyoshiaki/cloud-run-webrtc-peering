import { Hono } from "hono";
import { myInstanceId } from "../config/instance.ts";

// Honoアプリケーションを作成
export const app = new Hono();

// Healthエンドポイント
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    instanceId: myInstanceId,
    timestamp: new Date().toISOString(),
  });
});
