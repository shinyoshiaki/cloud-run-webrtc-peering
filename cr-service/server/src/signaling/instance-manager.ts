import { myInstanceId } from "../config/instance.ts";
import type { Instance } from "../types/index.ts";
import { instanceRepository } from "./repositories.ts";

// 自身のインスタンスを登録
export async function registerInstance(): Promise<void> {
  await instanceRepository.save({ uuid: myInstanceId });
  console.log(`Instance registered with UUID: ${myInstanceId}`);
}

// 他のインスタンスを取得
export async function getOtherInstances(): Promise<
  (Instance & { id: string })[]
> {
  const instances = await instanceRepository.findAll();
  return instances.filter((instance) => instance.uuid !== myInstanceId);
}
