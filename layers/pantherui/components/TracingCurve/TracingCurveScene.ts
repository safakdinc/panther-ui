
import { TracingCurveScrollAnimator } from "./TracingCurveScrollAnimator";
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, CustomEase);

export interface CurveLine {
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  curvature: { x: number; y: number };
}

export interface CurveItem {
  title: string;
  subtitle: string;
  texts: string[];
}

export interface CurveData {
  line: CurveLine;
  item: CurveItem;
}

export interface TracingCurveSceneOptions {
  curveData: CurveData[];
  triggerElement?: any;
  itemsContainer: HTMLElement;
  threeContainer: HTMLElement;
}


export class TracingCurveScene {
  public scene: THREE.Scene;
  public renderer: CSS3DRenderer;
  public camera: THREE.PerspectiveCamera;
  public lines: CurveLine[] = [];
  public originalCurveData: CurveData[];
  public options: TracingCurveSceneOptions;
  public animationFrameId: number | null = null;
  private scrollAnimator: TracingCurveScrollAnimator | null = null;

  static ANIMATION_DURATION = 0.15;
  static SCROLL_TRIGGER_HEIGHT = 800;
  static SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  constructor(options: TracingCurveSceneOptions) {
    this.options = options;
    this.originalCurveData = JSON.parse(JSON.stringify(options.curveData));
    this.scene = new THREE.Scene();
    this.renderer = new CSS3DRenderer();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.initializeThreeJS();
    this.processCurveData();
    this.scrollAnimator = null;
  }

  getScaleFactor() {
    let maxX = 0;
    this.originalCurveData.forEach((data) => {
      maxX = Math.max(maxX, data.line.start.x, data.line.end.x);
    });
    if (maxX === 0) return 1;
    const availableWidth = window.innerWidth * 0.95;
    return availableWidth / maxX;
  }

  getScaledCurveData() {
    const scale = this.getScaleFactor();
    return this.originalCurveData.map((data) => ({
      line: {
        start: {
          x: data.line.start.x * scale,
          y: data.line.start.y * scale,
          z: data.line.start.z * scale,
        },
        end: {
          x: data.line.end.x * scale,
          y: data.line.end.y * scale,
          z: data.line.end.z * scale,
        },
        curvature: {
          x: data.line.curvature.x * scale,
          y: data.line.curvature.y * scale,
        },
      },
      item: { ...data.item },
    }));
  }

  initializeThreeJS() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.scene.rotation.x = Math.PI / -2;
    this.camera.position.set(window.innerWidth / 10, window.innerWidth / 3.5, 0);
    this.camera.rotation.x = Math.PI / -4;
  }

  processCurveData() {
    this.lines = this.getScaledCurveData().map((data) => ({
      start: { ...data.line.start },
      end: { ...data.line.end },
      curvature: { ...data.line.curvature },
    }));
  }

  calculateCurvedPath(start: { x: number; y: number }, end: { x: number; y: number }, curvature: { x: number; y: number }) {
    const midX = (start.x + end.x) / 2;
    const controlX = midX + curvature.x;
    const controlY = start.y - curvature.y;
    return `M ${start.x},${start.y} Q ${controlX},${controlY} ${end.x},${end.y}`;
  }

  createSVGElement(start: { x: number; y: number }, end: { x: number; y: number }, curvature: { x: number; y: number }, index: number) {
    const svgElement = document.createElementNS(TracingCurveScene.SVG_NAMESPACE, "svg") as SVGSVGElement;
    this.configureSVGElement(svgElement);
    const pathData = this.calculateCurvedPath(start, end, curvature);
    const basePath = this.createSVGPath(pathData, "white", "4");
    svgElement.appendChild(basePath);
    const orangePath = this.createSVGPath(pathData, "orange", "4") as SVGPathElement;
    orangePath.classList.add(`orange-path-${index}`);
    svgElement.appendChild(orangePath);
    document.body.appendChild(svgElement);
    const bbox = orangePath.getBBox();
    svgElement.remove();
    return { svgElement, bbox };
  }

  configureSVGElement(svgElement: SVGSVGElement) {
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

  createSVGPath(pathData: string, color: string, strokeWidth: string) {
    const path = document.createElementNS(TracingCurveScene.SVG_NAMESPACE, "path");
    path.setAttribute("d", pathData);
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", strokeWidth);
    path.setAttribute("fill", "none");
    return path;
  }

  createCSS3DObjectForItem(line: CurveLine, item: Element | null | undefined) {
    if (!item || !this.options.threeContainer) return null;
    const cssObject = new CSS3DObject(item as HTMLElement);
    const itemRect = (item as HTMLElement).getBoundingClientRect();
    const containerRect = this.options.threeContainer.getBoundingClientRect();
    cssObject.position.x = line.start.x - containerRect.width / 2;
    cssObject.position.y = -(line.start.y - containerRect.height / 2);
    cssObject.position.z = 0;
    cssObject.rotation.x = Math.PI / 4;
    cssObject.position.x += itemRect.width / 2;
    cssObject.position.y += (itemRect.height / 2) * Math.sin(Math.PI / 4);
    cssObject.position.z += (itemRect.height / 2) * Math.cos(Math.PI / 4);
    return cssObject;
  }

  createCurvedLines() {
    const items = this.options.itemsContainer?.querySelectorAll(".item") ?? [];
    this.lines.forEach((line, index) => {
      const { svgElement } = this.createSVGElement(line.start, line.end, line.curvature, index);
      const svgObject = new CSS3DObject(svgElement as unknown as HTMLElement);
      const itemObject = this.createCSS3DObjectForItem(line, items[index]);
      this.scene.add(svgObject);
      if (itemObject) this.scene.add(itemObject);
    });
    // Setup scroll triggers after lines are created
    if (!this.scrollAnimator) {
      this.scrollAnimator = new TracingCurveScrollAnimator({
        curveData: this.originalCurveData,
        threeContainer: this.options.threeContainer,
        getCamera: () => this.camera,
      });
    }
    this.scrollAnimator.setupScrollTriggers();
  }

  clearScene() {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    if (this.scrollAnimator) {
      this.scrollAnimator.clearScrollTriggers();
    }
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.clearScene();
    this.processCurveData();
    this.createCurvedLines();
    // You may want to re-setup scroll triggers here if needed
    ScrollTrigger.refresh();
  }

  mount() {
    this.options.threeContainer.appendChild(this.renderer.domElement);
    this.createCurvedLines();
    this.animate();
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  unmount() {
    window.removeEventListener("resize", this.handleResize.bind(this));
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.clearScene();
    if (this.scrollAnimator) {
      this.scrollAnimator.clearScrollTriggers();
      this.scrollAnimator = null;
    }
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
  }
}
