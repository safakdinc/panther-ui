<template>
  <NuxtLink
    :to="props.data.path"
    class="w-full min-h-[185px] h-full flex flex-col gap-[8px] px-[24px] py-[32px] rounded-lg
      container"
    :class="{ 'items-end': props.right }"
    style="border: 1px solid rgb(255 255 255 / 0.3)"
  >
    <div
      class="p-[8px] aspect-square flex justify-center items-center rounded-full w-fit mb-[16px]"
      style="background-color: #27272a"
    >
      <i v-if="props.right" class="fa fa-chevron-right"></i>
      <i v-else class="fa fa-chevron-left"></i>
    </div>
    <div class="font-[600] text-xl">{{ props.data.title }}</div>
    <div
      style="color: var(--text-gray)"
      class="description text-sm"
      :class="{ 'text-end': props.right }"
    >
      {{ props.data.description }}
    </div>
  </NuxtLink>
</template>

<script setup>
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  right: {
    type: Boolean,
    default: true,
  },
});
</script>

<style lang="scss" scoped>
.container {
  transition: color 0.2s ease-out;
  &:hover {
    color: var(--primary);
  }
}
</style>
