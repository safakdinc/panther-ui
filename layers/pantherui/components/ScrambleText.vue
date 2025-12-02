<template>
  <div ref="rootRef" :class="['text-block', className]" :style="style">
    <p ref="pRef"><slot /></p>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

const props = defineProps({
  radius: { type: Number, default: 100 },
  duration: { type: Number, default: 1.2 },
  speed: { type: Number, default: 0.5 },
  scrambleChars: { type: String, default: ".:" },
  className: { type: String, default: "" },
  style: { type: Object, default: () => ({}) },
});

const rootRef = ref(null);
const pRef = ref(null);
let chars = [];
let split = null;

const handleMove = (e) => {
  chars.forEach((c) => {
    const { left, top, width, height } = c.getBoundingClientRect();
    const dx = e.clientX - (left + width / 2);
    const dy = e.clientY - (top + height / 2);
    const dist = Math.hypot(dx, dy);

    if (dist < props.radius) {
      gsap.to(c, {
        overwrite: true,
        duration: props.duration * (1 - dist / props.radius),
        scrambleText: {
          text: c.dataset.content || "",
          chars: props.scrambleChars,
          speed: props.speed,
        },
        ease: "none",
      });
    }
  });
};

const setupSplit = () => {
  if (!pRef.value) return;
  split = SplitText.create(pRef.value, {
    type: "chars",
    charsClass: "char",
  });
  chars = split.chars;
  chars.forEach((c) => {
    gsap.set(c, {
      display: "inline-block",
      attr: { "data-content": c.innerHTML },
    });
  });
};

onMounted(() => {
  setupSplit();
  rootRef.value?.addEventListener("pointermove", handleMove);
});

onBeforeUnmount(() => {
  rootRef.value?.removeEventListener("pointermove", handleMove);
  split && split.revert();
});

// Re-setup split if props change
watch(
  () => [props.radius, props.duration, props.speed, props.scrambleChars],
  () => {
    split && split.revert();
    setupSplit();
  },
);
</script>

<style scoped>
.text-block {
  margin: 7vw;
  max-width: 800px;
  font-family: monospace;
  font-size: clamp(14px, 4vw, 32px);
  color: #fff;
}

.char {
  will-change: transform;
  display: inline-block;
}
</style>
