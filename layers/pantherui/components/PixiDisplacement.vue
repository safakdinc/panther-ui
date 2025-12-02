<template>
  <div ref="pixiContainer" style="width: 100%; height: 100%"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Application, MeshPlane, Texture, Assets } from "pixi.js";

const pixiContainer = ref<HTMLDivElement | null>(null);
let app: Application | null = null;

onMounted(async () => {
  await nextTick();
  if (!pixiContainer.value) return;

  app = new Application();
  await app.init({ background: "#1099bb", resizeTo: pixiContainer.value });
  pixiContainer.value.appendChild(app.canvas);

  const texture = await Assets.load(
    "https://images.pexels.com/photos/33164259/pexels-photo-33164259.jpeg",
  );

  const verticesX = 50;
  const verticesY = 10;
  const planeWidth = app.screen.width;
  const planeHeight = app.screen.height;

  const plane = new MeshPlane({
    texture,
    verticesX,
    verticesY,
  });

  plane.width = planeWidth;
  plane.height = planeHeight;
  plane.x = 0;
  plane.y = 0;
  plane.pivot.set(0, 0);

  // Access the position buffer correctly (Pixi v8)
  const buffer = plane.geometry.getBuffer("aPosition");
  const verts = buffer.data;

  // Bell curve bend: use a Gaussian function for the y offset
  const arcHeight = 80; // max arc height in px
  const centerX = planeWidth / 2;
  const sigma = 0.35; // controls bell width (0.3-0.5 is good)
  for (let ix = 0; ix < verticesX; ix++) {
    for (let iy = 0; iy < verticesY; iy++) {
      const i = (iy * verticesX + ix) * 5;
      const x = verts[i];
      const norm = (x - centerX) / centerX; // -1 (left) to 1 (right)
      verts[i + 1] += -arcHeight * Math.exp(-0.5 * Math.pow(norm / sigma, 2)); // Bell curve
    }
  }
  buffer.update(); // Notify Pixi that data changed

  app.stage.addChild(plane);
});

onBeforeUnmount(() => {
  if (app) {
    app.destroy();
    app = null;
  }
});
</script>

<style scoped>
div {
  width: 100%;
  height: 400px;
  background: #222;
  position: relative;
  overflow: hidden;
}
canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>
