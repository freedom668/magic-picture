<template>
  <teleport to="body">
    <div v-if="visible" class="loadingPage" role="status" aria-label="正在加载项目">
      <div class="logoWrap" :class="{ drawn, filling }" aria-hidden="true" @animationend="handleAnimationEnd">
        <img class="logoImage" :src="logoUrl" alt="" draggable="false" @error="finishDrawing" />
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import logoUrl from "@toonflow/assets/logo.png";

const props = defineProps<{ active: boolean }>();
const visible = defineModel<boolean>("visible", { default: false });
const drawn = defineModel<boolean>("drawn", { default: false });
const filling = ref(false);
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const reducedMotion = ref(motionPreference.matches);
let fallbackTimer: number | undefined;

function clearFallback() {
  if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
  fallbackTimer = undefined;
}

function updateMotionPreference(event: MediaQueryListEvent) {
  reducedMotion.value = event.matches;
}
motionPreference.addEventListener("change", updateMotionPreference);
onBeforeUnmount(() => {
  clearFallback();
  motionPreference.removeEventListener("change", updateMotionPreference);
});

watch([() => props.active, reducedMotion], ([active, reducedMotion]) => {
  clearFallback();
  if (active) {
    if (!visible.value) {
      drawn.value = false;
      visible.value = true;
    }
    filling.value = false;
  }
  if (reducedMotion) {
    drawn.value = true;
    if (!active) visible.value = false;
  } else if (!active && drawn.value && visible.value) {
    filling.value = true;
  }
  // 标志图入场动画未触发时（元素隐藏、图片加载失败等）兜底放行，避免流程卡在等待 drawn。
  if (!drawn.value) fallbackTimer = window.setTimeout(() => finishDrawing(), 1200);
}, { immediate: true });

function finishDrawing() {
  clearFallback();
  if (drawn.value) return;
  drawn.value = true;
  if (!props.active) filling.value = true;
}

// animationend 会从子元素冒泡，按动画名分流；logoPulse 是无限动画，不会触发。
function handleAnimationEnd(event: AnimationEvent) {
  if (event.animationName === "logoEnter") finishDrawing();
  if (event.animationName === "logoFill" && !props.active) visible.value = false;
}
</script>

<style lang="scss" scoped>
.loadingPage {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--el-bg-color);

  .logoWrap {
    position: absolute;
    top: 50dvh;
    left: 50vw;
    width: 96px;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);

    // 柔和光晕，避免彩色标志在纯色背景上显得突兀。
    &::before {
      content: "";
      position: absolute;
      inset: -22%;
      border-radius: 50%;
      background: radial-gradient(closest-side, rgb(0 0 0 / 6%), transparent);
      opacity: 0;
      animation: logoHalo 0.6s ease-out both;
    }

    .logoImage {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0;
      transform: scale(0.84);
      animation: logoEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
      will-change: opacity, transform;
    }

    &.drawn .logoImage { animation: logoPulse 3s ease-in-out 0.5s infinite; }
    &.drawn::before { opacity: 1; animation: none; }

    &.filling {
      .logoImage { animation: logoFill 0.28s ease both; }
      &::before { animation: logoFill 0.28s ease both; }
    }

    @media (prefers-reduced-motion: reduce) {
      .logoImage,
      &.drawn .logoImage { animation: none; opacity: 1; transform: none; }
      &::before { animation: none; opacity: 1; }
    }
  }
}

@keyframes logoEnter {
  from { opacity: 0; transform: scale(0.84); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes logoFill {
  0% { opacity: 1; }
  70%, 100% { opacity: 0; }
}

@keyframes logoHalo {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes logoPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.82; transform: scale(0.97); }
}
</style>
