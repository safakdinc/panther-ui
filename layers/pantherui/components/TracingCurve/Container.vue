<template>
  <div ref="itemsContainer" class="absolute top-0 left-0 opacity-0">
    <TracingCurveItem
      v-for="(data, index) in props.curveData"
      :key="index"
      :title="data.item.title"
      :subtitle="data.item.subtitle"
      :texts="data.item.texts"
    ></TracingCurveItem>
  </div>
  <div ref="threeContainer" class="three-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, type Ref, watch } from "vue";
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, CustomEase);

interface CurveLine {
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CurveItem {
  title: string;
  subtitle: string;
  texts: string[];
}

interface CurveData {
  line: CurveLine;
  item: CurveItem;
}

const props = defineProps<{
  curveData: CurveData[];
  triggerElement?: any;
}>();

const threeContainer = ref<HTMLElement | null>(null);
const itemsContainer = ref<HTMLElement | null>(null);

const scene = new THREE.Scene();
const renderer = new CSS3DRenderer();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const lines: Ref<CurveLine[]> = ref([]);

// Responsive scaling
const containerWidth = ref(0);
const containerHeight = ref(0);
const scaleFactor = ref(1);

const ANIMATION_DURATION = 0.15;
const SCROLL_TRIGGER_HEIGHT = 800;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// Camera movement multipliers for fine-tuning
const CAMERA_X_MULTIPLIER = 1.0; // Adjust to squeeze/expand X movement
const CAMERA_Z_MULTIPLIER = 1.0; // Adjust to squeeze/expand Z movement

function calculateScaleFactor() {
  if (!threeContainer.value) return 1;

  const containerRect = threeContainer.value.getBoundingClientRect();
  containerWidth.value = containerRect.width;
  containerHeight.value = containerRect.height;

  // Base scaling on width (1920px design)
  return containerRect.width / 1920;
}

// Sample points along cubic Bézier path for camera animation (responsive)
function sampleCurvePoints(curveData: CurveData[], samplesPerCurve = 100) {
  const allPoints: { x: number; z: number; curveIndex: number; t: number }[] = [];

  curveData.forEach((curve, curveIndex) => {
    // Convert percent to px for start/end
    const start = {
      x: (curve.line.start.x / 100) * containerWidth.value,
      y: (curve.line.start.y / 100) * containerHeight.value,
    };
    const end = {
      x: (curve.line.end.x / 100) * containerWidth.value,
      y: (curve.line.end.y / 100) * containerHeight.value,
    };
    // Control points are relative to the line vector
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const control1 = {
      x: start.x + (curve.line.x1 / 100) * dx,
      y: start.y + (curve.line.y1 / 100) * dy,
    };
    const control2 = {
      x: start.x + (curve.line.x2 / 100) * dx,
      y: start.y + (curve.line.y2 / 100) * dy,
    };

    for (let i = 0; i <= samplesPerCurve; i++) {
      const t = i / samplesPerCurve;
      // Cubic Bézier formula: B(t) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3
      const x =
        Math.pow(1 - t, 3) * start.x +
        3 * Math.pow(1 - t, 2) * t * control1.x +
        3 * (1 - t) * Math.pow(t, 2) * control2.x +
        Math.pow(t, 3) * end.x;
      const z =
        Math.pow(1 - t, 3) * start.y +
        3 * Math.pow(1 - t, 2) * t * control1.y +
        3 * (1 - t) * Math.pow(t, 2) * control2.y +
        Math.pow(t, 3) * end.y;
      allPoints.push({ x: x / 1.4, z, curveIndex, t: t + curveIndex });
    }
  });
  return allPoints;
}

// Create SVG path strings for custom eases
function createCustomEasePaths(curveData: CurveData[]) {
  const points = sampleCurvePoints(curveData, 200); // More samples for smoother ease

  if (points.length === 0) return { xPath: "M0,0 L1,1", zPath: "M0,0 L1,1" };

  // Normalize values for ease curves (0-1 range)
  const xValues = points.map((p) => p.x);
  const zValues = points.map((p) => p.z);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minZ = Math.min(...zValues);
  const maxZ = Math.max(...zValues);

  // Create SVG path strings for GSAP CustomEase
  let xPath = "";
  let zPath = "";

  points.forEach((point, index) => {
    const progress = index / (points.length - 1);

    // Normalize X and Z values to 0-1 range
    const normalizedX = maxX !== minX ? (point.x - minX) / (maxX - minX) : 0;
    const normalizedZ = maxZ !== minZ ? (point.z - minZ) / (maxZ - minZ) : 0;

    const command = index === 0 ? "M" : "L";
    xPath += `${command}${progress},${normalizedX} `;
    zPath += `${command}${progress},${normalizedZ} `;
  });

  // Clean up paths
  xPath = xPath.trim();
  zPath = zPath.trim();

  console.log("X Ease Path:", xPath);
  console.log("Z Ease Path:", zPath);

  return { xPath, zPath, minX, maxX, minZ, maxZ };
}

// Create custom ease functions with proper scaling
function createCustomEaseFunctions(curveData: CurveData[]) {
  const { xPath, zPath, minX, maxX, minZ, maxZ } = createCustomEasePaths(curveData);

  try {
    // Create custom ease functions
    const xEase = CustomEase.create("cameraPathX", xPath);
    const zEase = CustomEase.create("cameraPathZ", zPath);

    console.log("Custom X Ease created:", xEase);
    console.log("Custom Z Ease created:", zEase);

    return {
      xEase,
      zEase,
      minX,
      maxX,
      minZ,
      maxZ,
      xPath,
      zPath,
    };
  } catch (error) {
    console.error("Error creating custom ease:", error);
    // Fallback to linear ease
    return {
      xEase: "none",
      zEase: "none",
      minX,
      maxX,
      minZ,
      maxZ,
      xPath: "M0,0 L1,1",
      zPath: "M0,0 L1,1",
    };
  }
}

// Debug function to visualize the camera path (optional)
function debugCameraPath(curveData: CurveData[]): THREE.Line | null {
  if (!window.location.search.includes("debug=camera")) return null;

  const points = sampleCurvePoints(curveData, 50);
  console.log(
    "Camera path points:",
    points.map((p) => ({ x: p.x, z: p.z })),
  );

  // Create a visual debug line in Three.js
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(points.length * 3);

  points.forEach((point, i) => {
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = camera.position.y; // Use current camera Y
    positions[i * 3 + 2] = point.z;
  });

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
  const line = new THREE.Line(geometry, material);

  return line;
}

// Visualize the ease curves (for debugging)
function createEaseCurveVisualization(xPath: string, zPath: string): void {
  if (!window.location.search.includes("debug=ease")) return;

  // Create a container for the ease visualization
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    height: 200px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 10px;
    z-index: 1000;
    color: white;
    font-family: monospace;
    font-size: 12px;
  `;

  // Create SVG for X ease curve
  const xSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  xSvg.setAttribute("width", "280");
  xSvg.setAttribute("height", "80");
  xSvg.setAttribute("viewBox", "0 0 1 1");
  xSvg.style.cssText = "border: 1px solid #555; background: #222; margin: 5px 0;";

  const xPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
  xPathElement.setAttribute("d", xPath);
  xPathElement.setAttribute("stroke", "#ff6b35");
  xPathElement.setAttribute("stroke-width", "0.01");
  xPathElement.setAttribute("fill", "none");
  xSvg.appendChild(xPathElement);

  // Create SVG for Z ease curve
  const zSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  zSvg.setAttribute("width", "280");
  zSvg.setAttribute("height", "80");
  zSvg.setAttribute("viewBox", "0 0 1 1");
  zSvg.style.cssText = "border: 1px solid #555; background: #222; margin: 5px 0;";

  const zPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
  zPathElement.setAttribute("d", zPath);
  zPathElement.setAttribute("stroke", "#35ff6b");
  zPathElement.setAttribute("stroke-width", "0.01");
  zPathElement.setAttribute("fill", "none");
  zSvg.appendChild(zPathElement);

  // Add labels and content
  container.innerHTML = `
    <div style="margin-bottom: 5px; font-weight: bold;">Camera Ease Curves</div>
    <div style="margin-bottom: 3px; color: #ff6b35;">X Movement (Orange):</div>
  `;
  container.appendChild(xSvg);

  const zLabel = document.createElement("div");
  zLabel.style.cssText = "margin: 3px 0; color: #35ff6b;";
  zLabel.textContent = "Z Movement (Green):";
  container.appendChild(zLabel);
  container.appendChild(zSvg);

  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    background: #555;
    color: white;
    border: none;
    width: 20px;
    height: 20px;
    border-radius: 3px;
    cursor: pointer;
  `;
  closeBtn.onclick = () => container.remove();
  container.appendChild(closeBtn);

  document.body.appendChild(container);
}

// Initialize Three.js components
function initializeThreeJS() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  scene.rotation.x = Math.PI / -2;

  camera.position.set(-300, containerWidth.value / 3, 0);
  camera.rotation.x = Math.PI / -4;
}

// Process curve data into line objects
function processCurveData(): void {
  lines.value = props.curveData.map((data) => ({
    start: { ...data.line.start },
    end: { ...data.line.end },
    x1: data.line.x1,
    y1: data.line.y1,
    x2: data.line.x2,
    y2: data.line.y2,
  }));
}

// Calculate curved path for SVG

// Utility for cubic Bézier path and control points using explicit control points
interface CubicBezierInfo {
  path: string;
  control1: { x: number; y: number };
  control2: { x: number; y: number };
  start: { x: number; y: number };
  end: { x: number; y: number };
}

/**
 * Returns SVG path string and control points for a cubic Bézier curve.
 * Control points are given as absolute coordinates.
 */
function getCubicBezierInfo(
  start: { x: number; y: number },
  end: { x: number; y: number },
  control1: { x: number; y: number },
  control2: { x: number; y: number },
): CubicBezierInfo {
  const path = `M ${start.x},${start.y} C ${control1.x},${control1.y} ${control2.x},${control2.y} ${end.x},${end.y}`;
  return { path, control1, control2, start, end };
}

// Create SVG element with path
function createSVGElement(
  start: { x: number; y: number },
  end: { x: number; y: number },
  control1: { x: number; y: number },
  control2: { x: number; y: number },
  index: number,
): { svgElement: SVGSVGElement; bbox: DOMRect } {
  // Scale coordinates
  const scaledStart = {
    x: (start.x * containerWidth.value) / 100,
    y: (start.y * containerHeight.value) / 100,
  };
  const scaledEnd = {
    x: (end.x * containerWidth.value) / 100,
    y: (end.y * containerHeight.value) / 100,
  };

  const dx = scaledEnd.x - scaledStart.x;
  const dy = scaledEnd.y - scaledStart.y;
  console.log("DX:", dx, "DY:", dy);
  const scaledControl1 = {
    x: scaledStart.x + (control1.x / 100) * dx,
    y: scaledStart.y + (control1.y / 100) * dy,
  };
  const scaledControl2 = {
    x: scaledStart.x + (control2.x / 100) * dx,
    y: scaledStart.y + (control2.y / 100) * dy,
  };

  // Use cubic Bézier utility
  const bezier = getCubicBezierInfo(scaledStart, scaledEnd, scaledControl1, scaledControl2);

  const svgElement = document.createElementNS(SVG_NAMESPACE, "svg");
  configureSVGElement(svgElement);

  // Create white base path
  const basePath = createSVGPath(bezier.path, "white", "4");
  svgElement.appendChild(basePath);

  // Create orange animated path
  const orangePath = createSVGPath(bezier.path, "orange", "4");
  orangePath.classList.add(`orange-path-${index}`);
  svgElement.appendChild(orangePath);

  // Draw lines to both control points
  const controlLine1 = document.createElementNS(SVG_NAMESPACE, "line");
  controlLine1.setAttribute("x1", scaledStart.x.toString());
  controlLine1.setAttribute("y1", scaledStart.y.toString());
  controlLine1.setAttribute("x2", scaledControl1.x.toString());
  controlLine1.setAttribute("y2", scaledControl1.y.toString());
  controlLine1.setAttribute("stroke", "red");
  controlLine1.setAttribute("stroke-width", "2");
  svgElement.appendChild(controlLine1);

  const controlLine2 = document.createElementNS(SVG_NAMESPACE, "line");
  controlLine2.setAttribute("x1", scaledEnd.x.toString());
  controlLine2.setAttribute("y1", scaledEnd.y.toString());
  controlLine2.setAttribute("x2", scaledControl2.x.toString());
  controlLine2.setAttribute("y2", scaledControl2.y.toString());
  controlLine2.setAttribute("stroke", "red");
  controlLine2.setAttribute("stroke-width", "2");
  svgElement.appendChild(controlLine2);

  // Draw the control points
  const controlCircle1 = document.createElementNS(SVG_NAMESPACE, "circle");
  controlCircle1.setAttribute("cx", scaledControl1.x.toString());
  controlCircle1.setAttribute("cy", scaledControl1.y.toString());
  controlCircle1.setAttribute("r", "8");
  controlCircle1.setAttribute("fill", "red");
  svgElement.appendChild(controlCircle1);

  const controlCircle2 = document.createElementNS(SVG_NAMESPACE, "circle");
  controlCircle2.setAttribute("cx", scaledControl2.x.toString());
  controlCircle2.setAttribute("cy", scaledControl2.y.toString());
  controlCircle2.setAttribute("r", "8");
  controlCircle2.setAttribute("fill", "red");
  svgElement.appendChild(controlCircle2);

  // Optionally, draw start/end points for clarity
  const startCircle = document.createElementNS(SVG_NAMESPACE, "circle");
  startCircle.setAttribute("cx", scaledStart.x.toString());
  startCircle.setAttribute("cy", scaledStart.y.toString());
  startCircle.setAttribute("r", "5");
  startCircle.setAttribute("fill", "blue");
  svgElement.appendChild(startCircle);

  const endCircle = document.createElementNS(SVG_NAMESPACE, "circle");
  endCircle.setAttribute("cx", scaledEnd.x.toString());
  endCircle.setAttribute("cy", scaledEnd.y.toString());
  endCircle.setAttribute("r", "5");
  endCircle.setAttribute("fill", "green");
  svgElement.appendChild(endCircle);

  // Get bounding box
  document.body.appendChild(svgElement);
  const bbox = orangePath.getBBox();
  svgElement.remove();

  return { svgElement, bbox };
}

// Configure SVG element properties
function configureSVGElement(svgElement: SVGSVGElement): void {
  svgElement.classList.add("overflow-visible");
  svgElement.setAttribute("width", "100%");
  svgElement.setAttribute("height", "100%");

  Object.assign(svgElement.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
  });
}

// Create SVG path element
function createSVGPath(pathData: string, color: string, strokeWidth: string): SVGPathElement {
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", pathData);
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", strokeWidth);
  path.setAttribute("fill", "none");
  return path;
}

// Position CSS3D object for items
function createCSS3DObjectForItem(
  line: CurveLine,
  item: Element | null | undefined,
): CSS3DObject | null {
  if (!item || !threeContainer.value) return null;
  // Cast to HTMLElement for CSS3DObject
  const cssObject = new CSS3DObject(item as HTMLElement);
  const itemRect = (item as HTMLElement).getBoundingClientRect();
  const containerRect = threeContainer.value.getBoundingClientRect();
  // Base position
  cssObject.position.x = (line.start.x / 100) * containerWidth.value - containerRect.width / 2;
  cssObject.position.y = -((line.start.y / 100) * containerHeight.value - containerRect.height / 2);
  cssObject.position.z = 0;
  cssObject.rotation.x = Math.PI / 4;
  // Adjust for item dimensions
  cssObject.position.x += itemRect.width / 2;
  cssObject.position.y += (itemRect.height / 2) * Math.sin(Math.PI / 4);
  cssObject.position.z += (itemRect.height / 2) * Math.cos(Math.PI / 4);
  return cssObject;
}

// Create and add all curved lines to scene
function createCurvedLines(): void {
  const items = itemsContainer.value?.querySelectorAll(".item") ?? [];
  lines.value.forEach((line, index) => {
    console.log("Creating line for index:", index, line);
    const { svgElement } = createSVGElement(
      line.start,
      line.end,
      { x: line.x1, y: line.y1 },
      { x: line.x2, y: line.y2 },
      index,
    );
    // Cast svgElement to HTMLElement for CSS3DObject
    const svgObject = new CSS3DObject(svgElement as unknown as HTMLElement);
    const itemObject = createCSS3DObjectForItem(line, items[index]);
    scene.add(svgObject);
    if (itemObject) scene.add(itemObject);
  });
}

// Calculate cumulative camera position
function calculateCumulativePosition(index: number): { x: number; y: number } {
  const totalMovement = { x: 0, y: 0 };
  for (let i = 0; i <= index; i++) {
    const data = props.curveData[i];
    if (!data) continue;
    totalMovement.x += data.line.end.x - data.line.start.x;
    totalMovement.y += data.line.end.y - data.line.start.y;
  }
  return {
    x: totalMovement.x / 1.4,
    y: totalMovement.y,
  };
}

function animateItemOpen(item: Element): void {
  const elements = getItemElements(item);
  const tl = gsap.timeline();
  tl.to(elements.container, { translateY: 0, duration: ANIMATION_DURATION })
    .to(elements.circle, { scale: 1, duration: ANIMATION_DURATION }, "<")
    .to(elements.line, { maxHeight: 170, duration: ANIMATION_DURATION }, "<")
    .to(elements.text, { opacity: 1, duration: ANIMATION_DURATION }, "<")
    .to(
      elements.paragraphs,
      {
        opacity: 1,
        translateX: 0,
        duration: ANIMATION_DURATION,
      },
      "<+=0.1",
    );
}

// Animate item closing
function animateItemClose(item: Element): void {
  const elements = getItemElements(item);
  const tl = gsap.timeline();
  const lineHeight = elements.line.getBoundingClientRect().height / 2;
  tl.to(elements.container, { translateY: lineHeight, duration: ANIMATION_DURATION })
    .to(elements.circle, { scale: 0, duration: ANIMATION_DURATION }, "<")
    .to(elements.line, { maxHeight: 0, duration: ANIMATION_DURATION }, "<")
    .to(elements.text, { opacity: 0, duration: 0.02 }, "<")
    .to(
      elements.paragraphs,
      {
        opacity: 0,
        translateX: -20,
        duration: 0.02,
      },
      "<+=0.1",
    );
}

// Get item DOM elements
function getItemElements(item: Element): {
  container: Element;
  circle: Element;
  line: Element;
  text: Element;
  paragraphs: NodeListOf<Element>;
} {
  return {
    container: item.querySelector(".container")!,
    circle: item.querySelector(".circle")!,
    line: item.querySelector(".line")!,
    text: item.querySelector(".text")!,
    paragraphs: item.querySelectorAll(".paragraph"),
  };
}

// Initialize item states
function initializeItemStates(): void {
  const items = threeContainer.value?.querySelectorAll(".item") ?? [];
  items.forEach((item) => {
    const elements = getItemElements(item);
    gsap.set(elements.container, { translateY: 85 });
    gsap.set(elements.circle, { scale: 0 });
    gsap.set(elements.line, { maxHeight: 0 });
    gsap.set(elements.text, { opacity: 0 });
    gsap.set(elements.paragraphs, { opacity: 0, translateX: -20 });
  });
}

// Create scroll trigger for individual line
function createLineScrollTrigger(index: number): void {
  const items = threeContainer.value?.querySelectorAll(".item") ?? [];
  const orangeLine = document.querySelector(`.orange-path-${index}`) as SVGPathElement | null;
  if (!orangeLine) return;
  const length = orangeLine.getTotalLength();
  const lineData = props.curveData[index]?.line;
  const totalMovement = calculateCumulativePosition(index);
  gsap.set(orangeLine, {
    strokeDasharray: length,
    strokeDashoffset: length,
  });
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: threeContainer.value,
      start: `top+=${index * SCROLL_TRIGGER_HEIGHT} top`,
      end: `top+=${(index + 1) * SCROLL_TRIGGER_HEIGHT}`,
      scrub: true,
      scroller: props.triggerElement,
      onEnter: () => items[index] && animateItemOpen(items[index]),
      onEnterBack: () => items[index] && animateItemOpen(items[index]),
      onLeaveBack: () => items[index] && animateItemClose(items[index]),
      onLeave: () => items[index] && animateItemClose(items[index]),
    },
  });
  tl.to(orangeLine, { strokeDashoffset: 0, ease: "none" });
}

// Setup all scroll triggers
function setupScrollTriggers(): void {
  initializeItemStates();
  lines.value.forEach((_, index) => {
    createLineScrollTrigger(index);
  });
}

// Create main scroll trigger for pinning (responsive)
function createMainScrollTrigger(): void {
  // Create custom ease functions based on our curve data
  const { xEase, zEase, minX, maxX, minZ, maxZ, xPath, zPath } = createCustomEaseFunctions(
    props.curveData,
  );

  // Use scaled values
  const cameraStartX = camera.position.x;
  const cameraStartZ = camera.position.z;
  const cameraEndX =
    cameraStartX + ((maxX ?? 0) - (minX ?? 0)) * scaleFactor.value * CAMERA_X_MULTIPLIER;
  const cameraEndZ =
    cameraStartZ + ((maxZ ?? 0) - (minZ ?? 0)) * scaleFactor.value * CAMERA_Z_MULTIPLIER;

  const tl = gsap.timeline();
  tl.to(
    camera.position,
    {
      x: cameraEndX,
      ease: xEase,
      duration: 1,
    },
    0,
  );
  tl.to(
    camera.position,
    {
      z: cameraEndZ,
      ease: zEase,
      duration: 1,
    },
    0,
  );
  // Calculate total height to match individual line triggers exactly
  const totalScrollHeight = lines.value.length * SCROLL_TRIGGER_HEIGHT;
  ScrollTrigger.create({
    animation: tl,
    trigger: threeContainer.value,
    start: "top top",
    end: `+=${totalScrollHeight}`,
    scrub: 2,
    pin: true,
    pinSpacing: true,
    pinSpacer: ".pin-spacer",
    scroller: props.triggerElement,
    onUpdate: (self) => {},
  });
}

function recreateVisualization() {
  // Clear existing elements
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  // Recreate with new dimensions
  createCurvedLines();

  // Update camera path
  const debugLine = debugCameraPath(props.curveData);
  if (debugLine) scene.add(debugLine);
}

// Handle window resize
function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  scaleFactor.value = calculateScaleFactor();
  recreateVisualization();

  ScrollTrigger.refresh();
}

// Animation loop
function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Component lifecycle

onMounted(() => {
  scaleFactor.value = calculateScaleFactor();
  initializeThreeJS();
  processCurveData();
  if (threeContainer.value) {
    threeContainer.value.appendChild(renderer.domElement);
  }
  // Add debug camera path visualization if debug mode is enabled
  const debugLine = debugCameraPath(props.curveData);
  if (debugLine) {
    scene.add(debugLine);
  }
  // Create ease curve visualization if debug mode is enabled
  if (window.location.search.includes("debug=ease")) {
    const { xPath, zPath } = createCustomEasePaths(props.curveData);
    createEaseCurveVisualization(xPath, zPath);
  }
  setTimeout(() => {
    setupScrollTriggers();
    createMainScrollTrigger();
  }, 100);
  createCurvedLines();
  animate();
  window.addEventListener("resize", handleResize);
});

// Watch for prop changes and recalculate scale
watch(
  () => props.curveData,
  () => {
    scaleFactor.value = calculateScaleFactor();
    recreateVisualization();
  },
  { deep: true },
);

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.items-container {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
