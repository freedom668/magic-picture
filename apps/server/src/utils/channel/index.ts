import { Toonflow } from "./toonflow";
import type { Channel } from "./types";

// ACT: 私有化部署使用 local 渠道，不连接任何官方服务；账号、余额与官方市场相关接口统一返回 503。
const unavailable = (name: string) => () => {
  throw Object.assign(new Error(`该功能依赖官方渠道，当前私有化部署已关闭（${name}）`), { status: 503 });
};

const localChannel = new Proxy({} as Channel, {
  get(_target, property) {
    if (typeof property === "symbol") return undefined;
    return unavailable(String(property));
  },
}) as Channel;

const channels = new Map<string, Channel>([
  ["toonflow", new Toonflow()],
  ["local", localChannel],
]);

export function getChannel(): Channel {
  const source = channels.get(process.env.TOONFLOW_CHANNEL?.trim() || "toonflow");
  if (!source) throw Object.assign(new Error("渠道未配置，请检查 TOONFLOW_CHANNEL"), { status: 503 });
  return source;
}
