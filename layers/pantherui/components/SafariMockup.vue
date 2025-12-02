<template>
  <div class="w-full px-[24px] h-[860px] relative">
    <div
      class="absolute top-0 left-0 border border-white/20 rounded-xl w-full h-full"
      style="
        background: rgb(3, 3, 3);
        box-shadow:
          rgba(255, 255, 255, 0.12) 0px 0.5px 0.5px 0px inset,
          rgba(6, 6, 5, 0.56) 0px 24px 56px 0px,
          rgba(6, 6, 5, 0.2) 0px 12px 40px 0px,
          rgba(6, 6, 5, 0.16) 0px 6px 12px 0px,
          rgba(6, 6, 5, 0.08) 0px 1px 4px 0px,
          rgba(6, 6, 5, 0.88) 0px 0px 0px 0.745px;
        opacity: 1;
        transform: none;
      "
    >
      <div class="flex w-full">
        <div class="flex gap-2 h-[40px] items-center pl-3 pr-7">
          <div class="size-4 rounded-full" style="background-color: rgb(237, 104, 94)"></div>
          <div class="size-4 rounded-full" style="background-color: rgb(245, 189, 80)"></div>
          <div class="size-4 rounded-full" style="background-color: rgb(97, 196, 84)"></div>
        </div>
        <div class="w-full h-[40px] relative">
          <picture
            ><source
              srcset="/assets/browser-tab.avif, /assets/browser-tab.avif 2x"
              type="image/avif" />
            <source
              srcset="/assets/browser-tab.webp, /assets/browser-tab.webp 2x"
              type="image/webp" />
            <img alt="Analytics" class="overlay" src="/assets/browser-tab.webp"
          /></picture>
          <div
            class="absolute top-0 left-0 pl-11 h-full flex items-center text-[12px]/[20px]
              font-[510] text-[#E3E3E3]"
          >
            Analytics
          </div>
        </div>
      </div>
      <picture
        ><source srcset="/assets/browser-2.avif, /assets/browser-2.avif 2x" type="image/avif" />
        <source srcset="/assets/browser-2.webp, /assets/browser-2.webp 2x" type="image/webp" />
        <img
          alt="Analytics"
          class="bg-[#1A1A1A] rounded-t-2xl rounded-b-14 w-full h-full object-contain"
          height="604"
          width="900"
          src="/assets/browser-2.webp"
      /></picture>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
