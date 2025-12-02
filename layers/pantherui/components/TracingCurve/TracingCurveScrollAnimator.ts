import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(ScrollTrigger, CustomEase);

import type { CurveData } from "./TracingCurveScene";

export interface TracingCurveScrollAnimatorOptions {
  curveData: CurveData[];
  threeContainer: HTMLElement;
  getCamera: () => any;
}

export class TracingCurveScrollAnimator {
  private options: TracingCurveScrollAnimatorOptions;
  private ANIMATION_DURATION = 0.15;
  private SCROLL_TRIGGER_HEIGHT = 800;

  constructor(options: TracingCurveScrollAnimatorOptions) {
    this.options = options;
  }

  setupScrollTriggers() {
    const items = this.options.threeContainer.querySelectorAll(".item");
    this.options.curveData.forEach((data, index) => {
      this.createLineScrollTrigger(index, items, data);
    });
  }

  createLineScrollTrigger(index: number, items: NodeListOf<Element>, data: CurveData) {
    const orangeLine = document.querySelector(`.orange-path-${index}`) as SVGPathElement | null;
    if (!orangeLine) return;
    const length = orangeLine.getTotalLength();
    gsap.set(orangeLine, {
      strokeDasharray: length,
      strokeDashoffset: length,
    });
    const camera = this.options.getCamera();
    const totalMovement = this.calculateCumulativePosition(index);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: this.options.threeContainer,
        start: `top+=${index * this.SCROLL_TRIGGER_HEIGHT} top`,
        end: `top+=${(index + 1) * this.SCROLL_TRIGGER_HEIGHT}`,
        scrub: true,
        pin: true,
        pinSpacing: true,
        // scroller: custom scroller if needed
      },
    });
    tl.to(orangeLine, { strokeDashoffset: 0, ease: "none" });
    tl.to(
      camera.position,
      {
        x: totalMovement.x,
        ease: "power2.out",
      },
      "<",
    ).to(
      camera.position,
      {
        z: totalMovement.y,
        ease: "power2.out",
      },
      "<",
    );
  }

  calculateCumulativePosition(index: number) {
    const totalMovement = { x: 0, y: 0 };
    for (let i = 0; i <= index; i++) {
      const data = this.options.curveData[i];
      if (!data) continue;
      totalMovement.x += data.line.end.x - data.line.start.x;
      totalMovement.y += data.line.end.y - data.line.start.y;
    }
    return {
      x: totalMovement.x / 1.4,
      y: totalMovement.y,
    };
  }

  clearScrollTriggers() {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
}
