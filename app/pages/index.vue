<template>
  <ClientOnly>
    <div class="flex flex-col h-screen w-full items-center justify-center relative">
      <InfiniteGrid
        :options="{
          baseCameraZ: 12,
          enablePostProcessing: true,
          postProcessParams: {
            vignetteDarkness: 0.0,
            vignetteOffset: 0.0,
          },
        }"
        :card-data
        @tileClicked="handleTileClicked"
        @tiles-loaded="onTilesLoaded"
      />
    </div>
    <span
      v-if="!tilesLoaded"
      class="fixed w-full h-full flex items-center justify-center text-lg font-semibold z-[51]"
    >
      Loading Tiles
    </span>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useFullscreen } from "@vueuse/core";
import { useTemplateRef } from "vue";

const el = useTemplateRef<HTMLElement>("el");

const { toggle } = useFullscreen(el);
const tilesLoaded = ref(false);
const startTime = ref<number>(0);
const router = useRouter();

// Start timing when component is mounted
onMounted(() => {
  startTime.value = performance.now();
  console.log("🚀 Page load started, timing tile loading...");
});

function handleTileClicked(event: CustomEvent) {
  const cardIndex = event.detail.cardIndex;
  if (!cardData[cardIndex]) return;
  const title = slugify(cardData[cardIndex].title);
  console.log("Tile clicked:", cardIndex, title, "Card:", cardData[cardIndex]);
  router.push(`/docs/components/${title}`);
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const cardData = [
  {
    title: "Animated Beam",
    badge: "New",
    image: "/photos/1.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKDEaWA19gQMAj1UXxmBvJT2f68zEnDpCLcwFG",
    description: "Revolutionary AI-powered analytics platform for enterprise solutions",
    tags: ["AI", "Analytics", "SaaS"],
    date: "2024",
  },
  {
    title: "Direction Aware Hover",
    badge: "Updated",
    description: "Comprehensive component library with modern UI patterns",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKaKUzIVblHbsAPcif8I0xZ6T5eFqJCYuWOnKy",
    tags: ["Design", "UI/UX", "React"],
    date: "2024",
  },
  {
    title: "Dock",
    badge: "Stable",
    image: "/photos/4.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jK0SWrqHt2ibjhcNTVgUyLzYKa4PuEeFxHBl9D",
    description: "High-performance API management and routing system",
    tags: ["Backend", "API", "Node.js"],
    date: "2024",
  },
  {
    title: "Flip Words",
    badge: "Live",
    image: "/photos/5.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKr5EWZWfpwZPMcy4Dso1eLEBUHIdVqF2vN5Kh",
    description: "Real-time monitoring dashboard with advanced analytics",
    tags: ["Frontend", "Vue.js", "Charts"],
    date: "2024",
  },
  {
    title: "Floating Cards",
    badge: "Optimized",
    image: "/photos/6.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKnJKROWNQGctLKZfsNXYCrPxVEBbMaAvmROSy",
    description: "Scalable database architecture with improved performance",
    tags: ["Database", "PostgreSQL"],
    date: "2024",
  },
  {
    title: "Gradient Card",
    badge: "Critical",
    image: "/photos/7.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKDKBGPF9gQMAj1UXxmBvJT2f68zEnDpCLcwFG",
    description: "Enhanced security framework with multi-factor auth",
    tags: ["Security", "Auth", "JWT"],
    date: "2023",
  },
  {
    title: "Grid Distortion",
    badge: "Automated",
    image: "/photos/8.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKtpQ6wiMc5OgDZ0fzqLB6dHXPYw42ahrTJMSn",
    description: "CI/CD pipeline implementation with Docker containers",
    tags: ["DevOps", "Docker", "K8s"],
    date: "2023",
  },
  {
    title: "Hero Parallax",
    badge: "Complete",
    image: "/photos/9.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jK30e2AkZBq6NAoyh2PYSTfVwbxFZOEHL350aQ",
    description: "Comprehensive testing suite with automated coverage",
    tags: ["Testing", "Jest", "Cypress"],
    date: "2023",
  },
  {
    title: "Hover Card",
    badge: "New",
    image: "/photos/10.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKq3lRipnt6uSCceH1pWE7JkosndUXv0AO3YBh",
    description: "Revolutionary AI-powered analytics platform for enterprise solutions",
    tags: ["AI", "Analytics", "SaaS"],
    date: "2024",
  },
  {
    title: "Parallax Image",
    badge: "Updated",
    image: "/photos/11.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKl0CEe8uPvX2hSbKNJrFfq8UVZeCEM4jtLuom",
    description: "Comprehensive component library with modern UI patterns",
    tags: ["Design", "UI/UX", "React"],
    date: "2024",
  },
  {
    title: "Animated Search Bar",
    badge: "Beta",
    image: "/photos/12.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKvaNtAuGXAF1xfQgIWncT6L2US5zBh0RtKvYE",
    description: "Cross-platform mobile application with native performance",
    tags: ["Mobile", "React Native"],
    date: "2024",
  },
  {
    title: "Text Reveal",
    badge: "Stable",
    image: "/photos/13.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jK80nwnESVfUuBHQs5aXPR30TrnoWAdFp9Dlvz",
    description: "High-performance API management and routing system",
    tags: ["Backend", "API", "Node.js"],
    date: "2024",
  },
  {
    title: "Animated Tooltip",
    badge: "Live",
    image: "/photos/14.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jK4YceBqzwpdjP61VLC4ik9sMHOvQ7WAutIfRU",
    description: "Real-time monitoring dashboard with advanced analytics",
    tags: ["Frontend", "Vue.js", "Charts"],
    date: "2024",
  },
  {
    title: "Tracing Beam",
    badge: "Optimized",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKKjgKROFcO1ftTGDUMz6khVoHSIYnX3ZbWgv8",
    image: "/photos/15.webp",
    description: "Scalable database architecture with improved performance",
    tags: ["Database", "PostgreSQL"],
    date: "2024",
  },
  {
    title: "Expandable Card",
    badge: "Critical",
    image: "/photos/16.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKozOysKxXBcnOW0taRPKUd3yYJNkLMSrGu7EA",

    description: "Enhanced security framework with multi-factor auth",
    tags: ["Security", "Auth", "JWT"],
    date: "2023",
  },
  {
    title: "3D Card",
    badge: "Automated",
    image: "/photos/8.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKKan4CtFcO1ftTGDUMz6khVoHSIYnX3ZbWgv8",
    description: "CI/CD pipeline implementation with Docker containers",
    tags: ["DevOps", "Docker", "K8s"],
    date: "2023",
  },
  {
    title: "3D Pin",
    badge: "Complete",
    image: "/photos/15.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jK5QbwvsowlZ71iUrJPAqNanWt2CbvsYg9jzTR",
    description: "Comprehensive testing suite with automated coverage",
    tags: ["Testing", "Jest", "Cypress"],
    date: "2023",
  },
  {
    title: "3D Carousel",
    badge: "Complete",
    image: "/photos/15.webp",
    video: "https://u3bgis1zx3.ufs.sh/f/G0WCOBl973jKv5riq3XAF1xfQgIWncT6L2US5zBh0RtKvYEl",
    description: "Comprehensive testing suite with automated coverage",
    tags: ["Testing", "Jest", "Cypress"],
    date: "2023",
  },
];

function onTilesLoaded() {
  tilesLoaded.value = true;

  const endTime = performance.now();
  const totalTime = endTime - startTime.value;

  console.log(
    `🎯 All tiles loaded in ${totalTime.toFixed(2)}ms (${(totalTime / 1000).toFixed(2)}s)`,
  );
}
</script>
