import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

const seedanceTemplate = (values: { id: string; label: string; baseUrl: string; modelId: string }) => `const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "baseUrl" as const,
    title: "接口地址",
    value: ${JSON.stringify(values.baseUrl)},
    props: { placeholder: ${JSON.stringify(values.baseUrl)} },
  },
] as const;

const version = "1.0.0";

function mediaUrl(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const media = value as { type?: string; url?: string; data?: string; mimeType?: string };
  if (media.type === "url" && media.url) return media.url;
  if (media.type === "base64" && media.data) return \`data:\${media.mimeType || "image/png"};base64,\${media.data}\`;
  return "";
}

function statusOf(data: any) {
  return String(data?.status ?? data?.data?.status ?? data?.task?.status ?? "").toLowerCase();
}

function resultUrl(data: any) {
  return data?.content?.video_url ?? data?.content?.url ?? data?.data?.content?.video_url
    ?? data?.data?.content?.url ?? data?.data?.video_url ?? data?.video_url ?? "";
}

async function pollVideo(context: any, baseUrl: string, apiKey: string, taskId: string, signal: AbortSignal): Promise<string> {
  const started = Date.now();
  for (;;) {
    if (Date.now() - started > 10 * 60_000) throw new Error("视频生成超时");
    signal.throwIfAborted();
    const response = await context.tool.fetch(\`\${baseUrl}/api/v3/contents/generations/tasks/\${encodeURIComponent(taskId)}\`, {
      headers: { Authorization: \`Bearer \${apiKey}\` },
      signal,
    });
    if (!response.ok) throw new Error(\`查询任务失败：HTTP \${response.status}\`);
    const data = await response.json();
    const status = statusOf(data);
    const url = resultUrl(data);
    if (url && (!status || ["succeeded", "success", "completed", "done"].includes(status))) return url;
    if (["failed", "error", "cancelled", "canceled"].includes(status)) {
      throw Object.assign(new Error(context.tool.errorMessage?.(data) || "视频生成失败"), { code: "MEDIA_TASK_FAILED" });
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

export default {
  id: ${JSON.stringify(values.id)},
  label: ${JSON.stringify(values.label)},
  version,
  readme: "Seedance 视频生成，异步任务模式。",
  rules,
  models: [{
    id: ${JSON.stringify(values.modelId)},
    label: ${JSON.stringify(values.modelId)},
    type: "video",
    mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
    audio: "optional",
    durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p", "1080p"] }],
  }],
  async generateVideo(request: any) {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 API Key");
    const baseUrl = (this.config.baseUrl?.trim() || ${JSON.stringify(values.baseUrl)}).replace(/\\/$/, "");
    const content: Record<string, unknown>[] = [{ type: "text", text: request.prompt ?? "" }];
    for (const image of request.images ?? []) {
      const url = mediaUrl(image);
      if (url) content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
    }
    if (request.firstFrame) {
      const url = mediaUrl(request.firstFrame);
      if (url) content.push({ type: "image_url", image_url: { url }, role: "first_frame" });
    }
    if (request.lastFrame) {
      const url = mediaUrl(request.lastFrame);
      if (url) content.push({ type: "image_url", image_url: { url }, role: "last_frame" });
    }
    for (const video of request.videos ?? []) {
      const url = mediaUrl(video);
      if (url) content.push({ type: "video_url", video_url: { url }, role: "reference_video" });
    }
    for (const audio of request.audios ?? []) {
      const url = mediaUrl(audio);
      if (url) content.push({ type: "audio_url", audio_url: { url }, role: "reference_audio" });
    }
    const deadline = Date.now() + 10 * 60_000;
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const submitResponse = await this.tool.fetch(\`\${baseUrl}/api/v3/contents/generations/tasks\`, {
      method: "POST",
      headers: { Authorization: \`Bearer \${apiKey}\`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        content,
        ratio: request.ratio,
        duration: request.duration,
        resolution: request.resolution,
        watermark: false,
      }),
      signal,
    });
    if (!submitResponse.ok) throw new Error(\`提交任务失败：HTTP \${submitResponse.status}\`);
    const submitData = await submitResponse.json();
    const taskId = submitData?.id ?? submitData?.task_id ?? submitData?.data?.id ?? submitData?.data?.task_id;
    if (typeof taskId !== "string" || !taskId) throw new Error("提交任务未返回任务 ID");
    await this.saveTaskData?.({ kind: "video", taskId, model: request.model, baseUrlHash: String(this.tool.hash(baseUrl)), deadline });
    const videoUrl = await pollVideo(this, baseUrl, apiKey, taskId, signal);
    return [{ mediaType: "video", type: "url", url: videoUrl }];
  },
  async resumeTask(data: any) {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 API Key");
    const baseUrl = (this.config.baseUrl?.trim() || ${JSON.stringify(values.baseUrl)}).replace(/\\/$/, "");
    if (data.kind !== "video" || typeof data.taskId !== "string" || !data.taskId || typeof data.model !== "string"
      || data.baseUrlHash !== String(this.tool.hash(baseUrl)) || typeof data.deadline !== "number" || !Number.isFinite(data.deadline)) {
      throw new Error("视频任务恢复数据无效或请求地址已变更");
    }
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const url = await pollVideo(this, baseUrl, apiKey, data.taskId, signal);
    return [{ mediaType: "video", type: "url", url }];
  },
};
`;

export default Router().post("/", validateFields({
  label: z.string().trim().min(1).max(64),
  baseUrl: z.string().trim().url().max(2048).refine(value => !value.includes("?") && !value.includes("#"), "接口地址不能包含查询参数或锚点"),
  apiKey: z.string().min(1).max(4096),
  modelId: z.string().trim().min(1).max(200),
}), async (req, res) => {
  const label = String(req.body.label).trim();
  const id = `media${Date.now().toString(36)}`;
  const source = seedanceTemplate({
    id,
    label,
    baseUrl: String(req.body.baseUrl).trim().replace(/\/+$/, ""),
    modelId: String(req.body.modelId).trim(),
  });
  res.json(success(await u.mediaProvider.addMediaProvider(source)));
});
