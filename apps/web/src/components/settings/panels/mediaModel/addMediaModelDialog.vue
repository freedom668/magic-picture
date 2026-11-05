<template>
  <el-dialog
    v-model="visible"
    title="添加自定义媒体模型"
    width="min(600px, calc(100vw - 32px))"
    alignCenter
    appendToBody
    destroyOnClose
    :closeOnClickModal="false"
    :closeOnPressEscape="!saving"
    :showClose="!saving">
    <el-form class="mediaForm" labelPosition="top" @submit.prevent>
      <el-form-item label="供应商名称" required>
        <el-input v-model="form.label" maxlength="64" placeholder="例如 TarkCloud" :disabled="saving" />
      </el-form-item>
      <el-form-item label="接口地址" required>
        <el-input v-model="form.baseUrl" placeholder="https://www.tarkcloud.com" :disabled="saving" />
      </el-form-item>
      <el-form-item label="API Key" required>
        <el-input v-model="form.apiKey" type="password" showPassword autocomplete="off" placeholder="输入你的 API Key" :disabled="saving" />
      </el-form-item>
      <el-form-item label="模型 ID" required>
        <el-input v-model="form.modelId" maxlength="200" placeholder="例如 Tark2/doubao-seedance-2.0" :disabled="saving" />
      </el-form-item>
      <el-alert v-if="error" :title="error" type="error" :closable="false" showIcon />
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import axios from "axios";
import { reactive, ref } from "vue";
import type { MediaProvider } from "@toonflow/provider-web/types";
import { saveSettings, settings } from "@/stores/settings";

const visible = defineModel<boolean>({ default: false });
const emit = defineEmits<{ added: [provider: MediaProvider] }>();
const saving = ref(false);
const error = ref("");
const form = reactive({ label: "", baseUrl: "", apiKey: "", modelId: "" });

async function submit() {
  if (saving.value) return;
  error.value = "";
  if (!form.label.trim() || !form.baseUrl.trim() || !form.apiKey.trim() || !form.modelId.trim()) {
    error.value = "请填写完整信息";
    return;
  }
  saving.value = true;
  try {
    const { data } = await axios.post<{ code: number; data: MediaProvider; message: string }>("/api/providers/media/create", {
      label: form.label.trim(),
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim(),
      modelId: form.modelId.trim(),
    });
    if (data.code !== 200 || !data.data) throw new Error(data.message || "添加失败");
    const configs = settings.value.mediaProviderConfigs as Record<string, Record<string, unknown>> | undefined;
    await saveSettings(() => ({
      mediaProviderConfigs: { ...configs, [data.data.id]: { apiKey: form.apiKey.trim(), baseUrl: form.baseUrl.trim() } },
    }));
    emit("added", data.data);
    visible.value = false;
    form.label = "";
    form.baseUrl = "";
    form.apiKey = "";
    form.modelId = "";
  } catch (cause) {
    error.value = axios.isAxiosError<{ message?: string }>(cause)
      ? cause.response?.data?.message || cause.message
      : cause instanceof Error ? cause.message : "添加失败";
  } finally {
    saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
.mediaForm {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}
</style>
