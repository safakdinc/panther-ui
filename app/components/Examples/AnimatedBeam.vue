<template>
  <div
    class="flex-1 flex items-center justify-between space-y-8 max-w-[750px] min-h-full px-[8px]
      lg:px-[120px]"
  >
    <animated-beam-wrapper class="flex-1 h-full flex items-center justify-between">
      <div class="w-full h-full flex items-center justify-between">
        <div class="flex flex-col gap-10">
          <div ref="item" v-for="img in row1" class="w-14 aspect-square rounded-full bg-white p-2">
            <img :src="'/animatedbeam/' + img" class="w-full h-full object-contain object-center" />
          </div>
        </div>
        <img
          ref="center"
          src="/animatedbeam/panther.png"
          class="w-20 aspect-square rounded-full object-cover object-center"
        />

        <div class="flex flex-col gap-10">
          <div ref="item" v-for="img in row2" class="w-14 aspect-square rounded-full bg-white p-2">
            <img :src="'/animatedbeam/' + img" class="w-full h-full object-contain object-center" />
          </div>
        </div>
      </div>
      <AnimatedBeamLine
        v-for="(el, index) in item"
        :key="index"
        :from="el"
        :to="center"
        :curvature="calculateCurvature(index)"
      />
    </animated-beam-wrapper>
  </div>
</template>

<script setup>
const row1 = ["/pinia.png", "/vue.png", "/nuxt.png"];
const row2 = ["/supabase.png", "/threejs.png", "/tailwind.png"];

const item = ref([]);

function calculateCurvature(index) {
  const itemsPerRow = item.value.length / 2;
  const positionInRow = index % itemsPerRow;

  const middleIndex = (itemsPerRow - 1) / 2;
  2;
  const curvature = (middleIndex - positionInRow) * -30;

  return curvature;
}

onMounted(() => {
  nextTick(() => {
    console.log("Items:", item.value);
  });
});
const center = useTemplateRef("center");
</script>
