import { randomUUID } from "node:crypto";

// 自身のインスタンスUUID
export const myInstanceId = randomUUID();

console.log(`My instance ID: ${myInstanceId}`);
