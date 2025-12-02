<template>
  <span
    ref="containerRef"
    :class="parentClassName"
    :style="wrapperStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    v-bind="$attrs"
  >
    <!-- Screen reader text -->
    <span :style="srOnlyStyle">{{ displayText }}</span>

    <!-- Visible animated text -->
    <span aria-hidden="true">
      <span v-for="(char, index) in displayTextArray" :key="index" :class="getCharClass(index)">
        {{ char }}
      </span>
    </span>
  </span>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { gsap } from "gsap";

// Props
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  speed: {
    type: Number,
    default: 150,
  },
  maxIterations: {
    type: Number,
    default: 2,
  },
  sequential: {
    type: Boolean,
    default: false,
  },
  revealDirection: {
    type: String,
    default: "start",
    validator: (value) => ["start", "end", "center"].includes(value),
  },
  useOriginalCharsOnly: {
    type: Boolean,
    default: false,
  },
  characters: {
    type: String,
    default: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+",
  },
  className: {
    type: String,
    default: "",
  },
  parentClassName: {
    type: String,
    default: "",
  },
  encryptedClassName: {
    type: String,
    default: "",
  },
  animateOn: {
    type: String,
    default: "view",
    validator: (value) => ["hover", "view"].includes(value),
  },
});

// Reactive state
const displayText = ref(props.text);
const isHovering = ref(false);
const isScrambling = ref(false);
const revealedIndices = ref(new Set());
const hasAnimated = ref(false);
const containerRef = ref(null);

// Non-reactive refs for cleanup
let timeline = null;
let observer = null;

// Computed properties
const displayTextArray = computed(() => displayText.value.split(""));

const wrapperStyle = computed(() => ({
  display: "inline-block",
  whiteSpace: "pre-wrap",
}));

const srOnlyStyle = computed(() => ({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  border: 0,
}));

// Methods
const handleMouseEnter = () => {
  if (props.animateOn === "hover") {
    isHovering.value = true;
  }
};

const handleMouseLeave = () => {
  if (props.animateOn === "hover") {
    isHovering.value = false;
  }
};

const getCharClass = (index) => {
  const isRevealedOrDone =
    revealedIndices.value.has(index) || !isScrambling.value || !isHovering.value;
  return isRevealedOrDone ? props.className : props.encryptedClassName;
};

const getNextIndex = (revealedSet) => {
  const textLength = props.text.length;
  switch (props.revealDirection) {
    case "start":
      return revealedSet.size;
    case "end":
      return textLength - 1 - revealedSet.size;
    case "center": {
      const middle = Math.floor(textLength / 2);
      const offset = Math.floor(revealedSet.size / 2);
      const nextIndex = revealedSet.size % 2 === 0 ? middle + offset : middle - offset - 1;

      if (nextIndex >= 0 && nextIndex < textLength && !revealedSet.has(nextIndex)) {
        return nextIndex;
      }

      for (let i = 0; i < textLength; i++) {
        if (!revealedSet.has(i)) return i;
      }
      return 0;
    }
    default:
      return revealedSet.size;
  }
};

const getAvailableChars = () => {
  return props.useOriginalCharsOnly
    ? Array.from(new Set(props.text.split(""))).filter((char) => char !== " ")
    : props.characters.split("");
};

const shuffleText = (originalText, currentRevealed) => {
  const availableChars = getAvailableChars();

  if (props.useOriginalCharsOnly) {
    const positions = originalText.split("").map((char, i) => ({
      char,
      isSpace: char === " ",
      index: i,
      isRevealed: currentRevealed.has(i),
    }));

    const nonSpaceChars = positions.filter((p) => !p.isSpace && !p.isRevealed).map((p) => p.char);

    for (let i = nonSpaceChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonSpaceChars[i], nonSpaceChars[j]] = [nonSpaceChars[j], nonSpaceChars[i]];
    }

    let charIndex = 0;
    return positions
      .map((p) => {
        if (p.isSpace) return " ";
        if (p.isRevealed) return originalText[p.index];
        return nonSpaceChars[charIndex++];
      })
      .join("");
  } else {
    return originalText
      .split("")
      .map((char, i) => {
        if (char === " ") return " ";
        if (currentRevealed.has(i)) return originalText[i];
        return availableChars[Math.floor(Math.random() * availableChars.length)];
      })
      .join("");
  }
};

const startAnimation = () => {
  isScrambling.value = true;
  // Kill any existing timeline
  if (timeline) {
    timeline.kill();
  }

  // Staggered reveal logic: reveal one letter at a time
  const totalChars = props.text.length;
  const perCharDuration = props.speed / 1000;
  const newTimeline = gsap.timeline({
    onComplete: () => {
      isScrambling.value = false;
      displayText.value = props.text;
      revealedIndices.value = new Set(Array.from({ length: totalChars }, (_, i) => i));
    },
  });

  // For each character, add a step to reveal it
  for (let i = 0; i < totalChars; i++) {
    newTimeline.to(
      {},
      {
        duration: perCharDuration,
        onStart: () => {
          // Reveal next character in order (staggered)
          const newRevealed = new Set(revealedIndices.value);
          newRevealed.add(i);
          revealedIndices.value = newRevealed;
          displayText.value = shuffleText(props.text, newRevealed);
        },
        onUpdate: () => {
          // Keep scrambling unrevealed chars
          displayText.value = shuffleText(props.text, revealedIndices.value);
        },
      },
    );
  }

  timeline = newTimeline;
};

const stopAnimation = () => {
  if (timeline) {
    timeline.kill();
  }
  displayText.value = props.text;
  revealedIndices.value = new Set();
  isScrambling.value = false;
};

const setupIntersectionObserver = () => {
  const observerCallback = (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !hasAnimated.value) {
        isHovering.value = true;
        hasAnimated.value = true;
      }
    });
  };

  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  observer = new IntersectionObserver(observerCallback, observerOptions);
  if (containerRef.value) {
    observer.observe(containerRef.value);
  }
};

const cleanup = () => {
  if (timeline) {
    timeline.kill();
  }
  if (observer && containerRef.value) {
    observer.unobserve(containerRef.value);
  }
};

// Watchers (equivalent to useEffect)
watch(isHovering, (newVal) => {
  if (newVal) {
    startAnimation();
  } else {
    stopAnimation();
  }
});

watch(
  () => props.text,
  (newVal) => {
    displayText.value = newVal;
    revealedIndices.value = new Set();
  },
);

// Lifecycle hooks
onMounted(() => {
  if (props.animateOn === "view") {
    setupIntersectionObserver();
  }
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
/* Add any component-specific styles here if needed */
</style>
