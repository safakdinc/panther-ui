// Texture transition shader (Shadertoy-style)
// Uses two input textures (iChannel0 = /photos/1.webp, iChannel1 = /photos/2.webp)

#ifdef GL_ES
precision mediump float;
#endif

uniform vec3 iResolution;
uniform float iTime;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

// Helpers
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

// grid-based pseudo-random block offset
vec2 blockOffset(vec2 uv, vec2 grid, float seed){
    vec2 g = floor(uv * grid);
    vec2 id = g + seed;
    float r1 = rand(id);
    float r2 = rand(id + 0.1234);
    // offset in -0.5..0.5 block space
    vec2 offs = (vec2(r1, r2) - 0.5) / grid;
    return offs;
}

// Apply block-swap distortion depending on strength
vec2 glitchUV(vec2 uv, float strength, float time){
    // multiple scales of blocky swapping
    vec2 uv2 = uv;
    float s = strength;
    // three passes with different grid sizes
    for(int i=0;i<3;i++){
        float scale = mix(8.0, 32.0, float(i)/2.0);
        vec2 grid = vec2(scale);
        vec2 offs = blockOffset(uv2, grid, floor(time * (1.0 + float(i))));
        // randomly decide to swap whole block
        float prob = smoothstep(0.0, 1.0, rand(floor(uv2 * grid) + time));
        // apply offset scaled by strength and probability
        uv2 += offs * s * prob;
    }
    // subtle per-pixel noise
    uv2 += (vec2(rand(uv2+time), rand(uv2-time)) - 0.5) * 0.002 * s;
    return uv2;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord.xy / iResolution.xy;
    // keep aspect
    uv.y = 1.0 - uv.y;

    // transition progress 0..1 looping
    float loopDur = 4.0; // seconds per full transition
    float t = mod(iTime, loopDur) / loopDur;
    // easing
    float progress = smoothstep(0.0, 1.0, t);

    // make a triangular progress (0 -> 1 -> 0) if you want back-and-forth
    // float progress = 1.0 - abs(1.0 - 2.0 * t);

    // strength peaks in middle of transition
    float strength = sin(progress * 3.14159);

    // compute distorted UVs for both textures
    vec2 uvA = glitchUV(uv, 1.0 - progress, iTime);
    vec2 uvB = glitchUV(uv, progress, iTime + 10.0);

    vec4 colA = texture2D(iChannel0, uvA);
    vec4 colB = texture2D(iChannel1, uvB);

    // cross-fade with additional color glitching
    vec4 base = mix(colA, colB, progress);

    // apply contrast/pulse around the mid transition
    float pulse = 1.0 + 0.15 * strength;
    base.rgb = pow(base.rgb, vec3(1.0 / pulse));

    // optional chromatic split effect at mid-transition
    float chroma = smoothstep(0.3, 0.7, progress);
    if(chroma > 0.0){
        float shift = 0.004 * strength;
        float r = texture2D(iChannel1, uvB + vec2(shift,0.0)).r;
        float g = texture2D(iChannel1, uvB).g;
        float b = texture2D(iChannel1, uvB - vec2(shift,0.0)).b;
        base.rgb = mix(base.rgb, vec3(r,g,b), chroma * 0.6);
    }

    fragColor = vec4(base.rgb, 1.0);
}

// Shadertoy entry point
void main(){
    vec2 fragCoord = gl_FragCoord.xy;
    vec4 outCol;
    mainImage(outCol, fragCoord);
    gl_FragColor = outCol;
}
