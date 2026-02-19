// Fluid Noise Background — WebGL Fragment Shader
// Full-screen fBm (fractional Brownian motion) noise field
// animated over time, colored cyan ↔ magenta on dark background.
// Drop-in replacement: just needs a <canvas id="bg-canvas"> in the DOM.

(function () {
    const canvas = document.getElementById('bg-canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { console.warn('WebGL not supported'); return; }

    // ── Shaders ────────────────────────────────────────────────────────────────

    const VS = `
        attribute vec2 a_pos;
        void main() {
            gl_Position = vec4(a_pos, 0.0, 1.0);
        }
    `;

    // fBm fluid noise — 6 octaves, domain-warped twice for ink swirl effect
    const FS = `
        precision highp float;

        uniform vec2  u_res;
        uniform float u_time;

        // ── Value noise hash ──────────────────────────────────────────────────
        vec2 hash2(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)),
                     dot(p, vec2(269.5, 183.3)));
            return fract(sin(p) * 43758.5453);
        }

        // ── Smooth value noise ────────────────────────────────────────────────
        float vnoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);   // smoothstep

            float a = fract(sin(dot(i + vec2(0,0), vec2(127.1,311.7))) * 43758.5453);
            float b = fract(sin(dot(i + vec2(1,0), vec2(127.1,311.7))) * 43758.5453);
            float c = fract(sin(dot(i + vec2(0,1), vec2(127.1,311.7))) * 43758.5453);
            float d = fract(sin(dot(i + vec2(1,1), vec2(127.1,311.7))) * 43758.5453);

            return mix(mix(a, b, u.x),
                       mix(c, d, u.x), u.y);
        }

        // ── fBm — 6 octaves ───────────────────────────────────────────────────
        float fbm(vec2 p) {
            float v = 0.0, amp = 0.5, freq = 1.0;
            for (int i = 0; i < 6; i++) {
                v    += amp  * vnoise(p * freq);
                freq *= 2.1;
                amp  *= 0.48;
            }
            return v;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / u_res;
            // aspect-correct, centered
            vec2 p  = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0) * 2.8;

            float t = u_time * 0.022;   // very slow global drift

            // ── Domain warp pass 1 ────────────────────────────────────────────
            vec2 q = vec2(fbm(p + vec2(0.0,  0.0) + t),
                          fbm(p + vec2(5.2,  1.3) + t * 0.5));

            // ── Domain warp pass 2 (deeper swirl) ────────────────────────────
            vec2 r = vec2(fbm(p + 3.8 * q + vec2(1.7, 9.2) + t * 0.3),
                          fbm(p + 3.8 * q + vec2(8.3, 2.8) + t * 0.3));

            // ── Single noise value driving color ─────────────────────────────
            float n = fbm(p + 3.2 * r + t * 0.2);

            // ── Color mapping ─────────────────────────────────────────────────
            // n ≈ 0..1  →  dark bg → cyan → magenta → deep violet → bg
            vec3 bg  = vec3(0.010, 0.010, 0.035);
            vec3 c1  = vec3(0.00,  0.45,  0.55);   // cyan (dimmed)
            vec3 c2  = vec3(0.45,  0.00,  0.55);   // magenta (dimmed)
            vec3 c3  = vec3(0.15,  0.00,  0.28);   // deep violet (dimmed)

            // Three-stop gradient
            vec3 col = bg;
            col = mix(col, c1,  smoothstep(0.30, 0.52, n));
            col = mix(col, c2,  smoothstep(0.50, 0.68, n));
            col = mix(col, c3,  smoothstep(0.66, 0.80, n));
            col = mix(col, bg,  smoothstep(0.78, 0.95, n));

            // Subtle luminance boost at hotspots
            col += 0.03 * vec3(n * n);

            // Soft vignette
            float vig = 1.0 - 0.55 * dot(uv - 0.5, uv - 0.5) * 3.2;
            col *= clamp(vig, 0.0, 1.0);

            gl_FragColor = vec4(col, 1.0);
        }
    `;

    // ── Compile shaders ────────────────────────────────────────────────────────
    function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
            console.error(gl.getShaderInfoLog(s));
        return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER,   VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // ── Full-screen quad ───────────────────────────────────────────────────────
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
        gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    // ── Resize ─────────────────────────────────────────────────────────────────
    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // ── Render loop ────────────────────────────────────────────────────────────
    function animate(now) {
        gl.uniform1f(uTime, now * 0.001);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
})();