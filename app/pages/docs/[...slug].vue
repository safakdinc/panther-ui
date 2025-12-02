<template>
  <div v-if="page" :key="$route.fullPath" class="flex-1 overflow-hidden">
    <div class="w-full flex flex-col gap-[8px] relative pb-[32px]">
      <div class="font-bold text-lg">
        <h1>{{ page.title }}</h1>
      </div>
      <div class="text-[var(--text-gray)] mb-[24px]">
        <p>{{ page.description }}</p>
      </div>
      <div
        class="w-full h-[1px] absolute bottom-0 left-0"
        style="background-color: rgb(255 255 255/ 0.3)"
      ></div>
    </div>
    <ContentRenderer :value="page" class="flex flex-col gap-[8px] content-renderer-wrapper" />
    <div class="w-full grid grid-cols-8 gap-8 mt-[48px]">
      <div class="col-span-8 sm:col-span-4 md:col-span-3">
        <NavigateButton v-if="prev" :right="false" :data="prev"></NavigateButton>
      </div>
      <div class="col-span-2 hidden md:block"></div>
      <div class="col-span-8 sm:col-span-4 md:col-span-3">
        <NavigateButton v-if="next" :data="next"></NavigateButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/content.scss";

const { path } = useRoute();
const route = useRoute();

const slugs = useRoute().params.slug;

// Get the current page
const { data: page } = await useAsyncData(`content-${path}`, () =>
  queryCollection("docs")
    .path(`/docs${slugs.map((slug) => `/${slug}`).join("")}`)
    .first(),
);

// Get surrounding pages for navigation
const { data: surroundings, refresh } = await useAsyncData(`surround-${path}`, () => {
  if (!page.value?.path) return null;
  return queryCollectionItemSurroundings("docs", page.value.path, {
    before: 1,
    after: 1,
    fields: ["title", "description"],
  });
});
console.log("Surroundings:", surroundings.value);
// Extract prev and next from surroundings
const prev = computed(() => surroundings.value?.[0]);
const next = computed(() => surroundings.value?.[1]);
</script>
