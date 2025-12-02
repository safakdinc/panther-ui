<template>
  <div class="texture-swap">
    <canvas ref="canvas" />

    <div class="controls">
      <div class="control-group">
        <button @click="triggerTransition">Start Glitch Transition</button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import gsap from "gsap";

// Reactive state
const canvas = ref(null);
const progress = ref(0);
const error = ref("");

// WebGL state
let gl = null;
let program = null;
let texture1 = null;
let texture2 = null;
let animationId = null;
let startTime = Date.now();
let texturesLoaded = 0;

// Simple vertex shader
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Fragment shader
const fragmentShaderSource = `
precision highp float;

uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform float u_progress;
uniform float u_time;
uniform float u_band_height; 

varying vec2 v_texCoord;

// --------------------------------------------------------
// Custom rounding functions from the original shader
// --------------------------------------------------------

float _round(float n) {
    return floor(n + 0.5);
}

vec2 _round(vec2 n) {
    return floor(n + 0.5);
}

// --------------------------------------------------------
// Glitch core (Adapted from the original shader)
// --------------------------------------------------------

float rand(vec2 co){
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

const float glitchScale = 1.0; 

vec2 glitchCoord(vec2 p, vec2 gridSize) {
    vec2 coord = floor(p / gridSize) * gridSize;
    coord += (gridSize / 2.0);
    return coord;
}

struct GlitchSeed {
    vec2 seed;
    float prob;
};

GlitchSeed glitchSeed(vec2 p, float speed) {
    float seedTime = floor(u_time * speed);
    vec2 seed = vec2(
        1.0 + mod(seedTime / 100.0, 100.0),
        1.0 + mod(seedTime, 100.0)
    ) / 100.0;
    seed += p;

    float prob = 1.0; 

    return GlitchSeed(seed, prob);
}

float shouldApply(GlitchSeed seed) {
    return _round(
        mix(
            mix(rand(seed.seed), 1.0, seed.prob - 0.5),
            0.0,
            (1.0 - seed.prob) * 0.5
        )
    );
}

// --------------------------------------------------------
// Glitch effects (Adapted from the original shader)
// --------------------------------------------------------

vec4 swapCoords(vec2 seed, vec2 groupSize, vec2 subGrid, vec2 blockSize) {
    vec2 rand2 = vec2(rand(seed), rand(seed + 0.1));
    vec2 range = subGrid - (blockSize - 1.0);
    vec2 coord = floor(rand2 * range) / subGrid;
    vec2 bottomLeft = coord * groupSize;
    vec2 realBlockSize = (groupSize / subGrid) * blockSize;
    vec2 topRight = bottomLeft + realBlockSize;
    topRight -= groupSize / 2.0;
    bottomLeft -= groupSize / 2.0;
    return vec4(bottomLeft, topRight);
}

float isInBlock(vec2 pos, vec4 block) {
    vec2 a = sign(pos - block.xy);
    vec2 b = sign(block.zw - pos);
    return min(sign(a.x + a.y + b.x + b.y - 3.0), 0.0);
}

vec2 moveDiff(vec2 pos, vec4 swapA, vec4 swapB) {
    vec2 diff = swapB.xy - swapA.xy;
    return diff * isInBlock(pos, swapA);
}

void swapBlocks(inout vec2 xy, vec2 groupSize, vec2 subGrid, vec2 blockSize, vec2 seed, float apply) {
    vec2 groupOffset = glitchCoord(xy, groupSize);
    vec2 pos = xy - groupOffset;
    
    vec2 seedA = seed * groupOffset;
    vec2 seedB = seed * (groupOffset + 0.1);
    
    vec4 swapA = swapCoords(seedA, groupSize, subGrid, blockSize);
    vec4 swapB = swapCoords(seedB, groupSize, subGrid, blockSize);
    
    vec2 newPos = pos;
    newPos += moveDiff(pos, swapA, swapB) * apply;
    newPos += moveDiff(pos, swapB, swapA) * apply;
    pos = newPos;
    
    xy = pos + groupOffset;
}

void staticNoise(inout vec2 p, vec2 groupSize, float grainSize, float contrast) {
    GlitchSeed seedA = glitchSeed(glitchCoord(p, groupSize), 5.0);
    seedA.prob *= 0.5;
    if (shouldApply(seedA) == 1.0) {
        GlitchSeed seedB = glitchSeed(glitchCoord(p, vec2(grainSize)), 5.0);
        vec2 offset = vec2(rand(seedB.seed), rand(seedB.seed + 0.1));
        offset = _round(offset * 2.0 - 1.0); 
        offset *= contrast;
        p += offset;
    }
}

void glitchStatic(inout vec2 p) {
    staticNoise(p, vec2(0.5, 0.25/2.0) * glitchScale, 0.2 * glitchScale, 2.0);
}

void glitchColor(inout vec3 color) {
    vec2 p = v_texCoord;
    vec2 groupSize = vec2(0.75, 0.125) * glitchScale;
    vec2 subGrid = vec2(0.0, 6.0);
    float speed = 5.0;
    GlitchSeed seed = glitchSeed(glitchCoord(p, groupSize), speed);
    seed.prob *= 0.3;
    if (shouldApply(seed) == 1.0) {
        vec2 co = mod(p, groupSize) / groupSize;
        co *= subGrid;
        float a = max(co.x, co.y);
        color *= min(floor(mod(a, 2.0)), 1.0) * 10.0;
    }
}

// --------------------------------------------------------
// Main function
// --------------------------------------------------------
void main() {
    vec2 uv = v_texCoord;
    vec2 p = uv; 

    // Define the moving glitch band.
    float bandStart = (1.0 - u_progress) * (1.0 + u_band_height);
    float bandEnd = bandStart - u_band_height;

    // Check if the current pixel is within the glitch band
    bool isInBand = uv.y <= bandStart && uv.y >= bandEnd;

    // Get the base colors from the textures
    vec3 color1 = texture2D(u_texture1, uv).rgb;
    vec3 color2 = texture2D(u_texture2, uv).rgb;

    vec3 finalColor;

    if (uv.y > bandStart) {
        // Area above the band: still texture 1
        finalColor = color1;
    } else if (uv.y < bandEnd) {
        // Area below the band: fully transitioned to texture 2
        finalColor = color2;
    } else {
        // Inside the glitch band:
        // 1. Apply glitch effects to the UV coordinates
        
        float scale = glitchScale;
        float speed = 5.0;
        
        vec2 groupSize;
        vec2 subGrid;
        vec2 blockSize;
        GlitchSeed seed;
        float apply;
        
        groupSize = vec2(0.6) * scale;
        subGrid = vec2(2.0);
        blockSize = vec2(1.0);
        seed = glitchSeed(glitchCoord(p, groupSize), speed);
        apply = shouldApply(seed);
        swapBlocks(p, groupSize, subGrid, blockSize, seed.seed, apply);
        
        groupSize = vec2(0.8) * scale;
        subGrid = vec2(3.0);
        blockSize = vec2(1.0);
        seed = glitchSeed(glitchCoord(p, groupSize), speed);
        apply = shouldApply(seed);
        swapBlocks(p, groupSize, subGrid, blockSize, seed.seed, apply);
    
        groupSize = vec2(0.2) * scale;
        subGrid = vec2(6.0);
        blockSize = vec2(1.0);
        seed = glitchSeed(glitchCoord(p, groupSize), speed);
        float apply2 = shouldApply(seed);
        swapBlocks(p, groupSize, subGrid, blockSize, (seed.seed + 1.0), apply * apply2);
        swapBlocks(p, groupSize, subGrid, blockSize, (seed.seed + 2.0), apply * apply2);
        swapBlocks(p, groupSize, subGrid, blockSize, (seed.seed + 3.0), apply * apply2);
        swapBlocks(p, groupSize, subGrid, blockSize, (seed.seed + 4.0), apply * apply2);
        swapBlocks(p, groupSize, subGrid, blockSize, (seed.seed + 5.0), apply * apply2);
        
        groupSize = vec2(1.2, 0.2) * scale;
        subGrid = vec2(9.0, 2.0);
        blockSize = vec2(3.0, 1.0);
        seed = glitchSeed(glitchCoord(p, groupSize), speed);
        apply = shouldApply(seed);
        swapBlocks(p, groupSize, subGrid, blockSize, seed.seed, apply);
        
        glitchStatic(p);
        
        // 2. Sample the textures with the glitched UVs
        vec3 glitchedColor1 = texture2D(u_texture1, p).rgb;
        vec3 glitchedColor2 = texture2D(u_texture2, p).rgb;

        // 3. Blend between the glitched textures
        float bandProgress = (uv.y - bandEnd) / u_band_height;
        finalColor = mix(glitchedColor2, glitchedColor1, bandProgress);

        // 4. Apply the color glitch
        glitchColor(finalColor);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
    error.value = "Shader compilation failed";
    gl.deleteShader(shader);
    return null;
  }

  return shader;
};

const createProgram = (gl, vertexShader, fragmentShader) => {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program linking error:", gl.getProgramInfoLog(program));
    error.value = "Shader program linking failed";
    gl.deleteProgram(program);
    return null;
  }

  return program;
};

const loadTexture = (gl, url) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([128, 128, 128, 255]),
  );

  const image = new Image();
  image.crossOrigin = "anonymous";

  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    texturesLoaded++;
    if (texturesLoaded === 2) {
      // Updated count for 2 textures
      error.value = "";
      console.log("All textures loaded successfully");
      render();
    }
  };

  image.onerror = () => {
    error.value = `Failed to load image: ${url}`;
    console.error("Failed to load image:", url);
  };

  image.src = url;
  return texture;
};

const setupWebGL = () => {
  const canvasEl = canvas.value;
  gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");

  if (!gl) {
    error.value = "WebGL not supported in this browser";
    return false;
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) {
    return false;
  }

  program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) {
    return false;
  }

  // Load only two textures
  texture1 = loadTexture(gl, "/photos/1.webp");
  texture2 = loadTexture(gl, "/photos/2.webp");
  // Removed texture3

  // Create fullscreen quad
  const positions = new Float32Array([
    // Position, TexCoord
    -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1, 1,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);

  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

  return true;
};

const render = () => {
  if (!gl || !program) return;

  const canvasEl = canvas.value;
  if (canvasEl.width !== canvasEl.clientWidth || canvasEl.height !== canvasEl.clientHeight) {
    canvasEl.width = canvasEl.clientWidth;
    canvasEl.height = canvasEl.clientHeight;
    gl.viewport(0, 0, canvasEl.width, canvasEl.height);
  }

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  const progressLocation = gl.getUniformLocation(program, "u_progress");
  const texture1Location = gl.getUniformLocation(program, "u_texture1");
  const texture2Location = gl.getUniformLocation(program, "u_texture2");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const bandHeightLocation = gl.getUniformLocation(program, "u_band_height");

  gl.uniform1f(timeLocation, (Date.now() - startTime) / 1000);
  gl.uniform1f(bandHeightLocation, 0.2);
  gl.uniform1f(progressLocation, parseFloat(progress.value));

  // Bind the correct textures
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture1);
  gl.uniform1i(texture1Location, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture2);
  gl.uniform1i(texture2Location, 1);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  animationId = requestAnimationFrame(render);
};

// Function to swap the textures
const swapTextures = () => {
  // A temporary reference to hold the current texture2
  const tempTexture = texture2;
  // texture2 becomes the new texture1 for the next transition
  texture2 = texture1;
  // texture1 gets the old texture2
  texture1 = tempTexture;
};

// Function to trigger the GSAP animation
const triggerTransition = () => {
  if (gsap.isTweening(progress)) return;

  gsap.to(progress, {
    value: 1,
    duration: 1.5,
    ease: "power2.inOut",
    onComplete: () => {
      progress.value = 0;
      swapTextures();
    },
  });
};

// Auto-play the transitions every few seconds
let intervalId;
const startAutoPlay = () => {
  intervalId = setInterval(() => {
    triggerTransition();
  }, 3000); // Trigger every 3 seconds
};

onMounted(() => {
  if (setupWebGL()) {
    startAutoPlay();
  }
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<style scoped>
.texture-swap {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #000;
  font-family: "Courier New", monospace;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.controls {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
  color: white;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  min-width: 250px;
  text-align: center;
}

.control-group {
  margin-bottom: 15px;
}

.control-group button {
  background-color: #00ff41;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-family: inherit;
  font-size: 16px;
  border-radius: 5px;
  transition: transform 0.2s;
}

.control-group button:active {
  transform: scale(0.95);
}

.error {
  color: #ff4444;
  font-size: 12px;
  margin-top: 10px;
  padding: 10px;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 4px;
}
</style>
