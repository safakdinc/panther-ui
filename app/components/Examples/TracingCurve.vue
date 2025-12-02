<template>
  <div class="flex-1 relative" ref="trigger">
    <ClientOnly>
      <TracingCurveContainer
        :triggerElement="trigger"
        :curveData="curveData"
      ></TracingCurveContainer>
    </ClientOnly>
  </div>
</template>

<script setup>
const trigger = ref();
const curveData = ref([
  {
    line: {
      start: { x: 15, y: 0, z: 0 },
      end: { x: 60, y: 5, z: 0 },
      // Control points as percentages of container (x1, y1, x2, y2)
      x1: 30,
      y1: -30,
      x2: 70,
      y2: -20,
    },
    item: {
      title: "Step 1",
      subtitle: "Getting Started",
      texts: ["Begin your journey", "Explore the basics"],
    },
  },
  {
    line: {
      start: { x: 60, y: 5, z: 0 },
      end: { x: 85, y: 35, z: 0 },
      x1: 20,
      y1: 0,
      x2: 100,
      y2: 30,
    },
    item: {
      title: "Step 2",
      subtitle: "Building Skills",
      texts: ["Learn advanced techniques", "Practice regularly"],
    },
  },
  {
    line: {
      start: { x: 85, y: 35, z: 0 },
      end: { x: 50, y: 60, z: 0 },
      x1: 30,
      y1: 80,
      x2: 100,
      y2: 100,
    },
    item: {
      title: "Step 3",
      subtitle: "Applying Knowledge",
      texts: ["Work on real projects", "Collaborate with others"],
    },
  },
  {
    line: {
      start: { x: 50, y: 60, z: 0 },
      end: { x: 80, y: 95, z: 0 },
      x1: -50,
      y1: 50,
      x2: 100,
      y2: 100,
    },
    item: {
      title: "Step 4",
      subtitle: "Mastering the Craft",
      texts: ["Refine your skills", "Teach and mentor others"],
    },
  },
]);
</script>

<style lang="scss" scoped></style>
