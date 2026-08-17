/* StarSight WebGL2 Star Renderer
 * GPU-first point-sprite renderer for the normal 2D sky map.
 * Falls back cleanly to the existing Canvas 2D star renderer when WebGL2 is unavailable.
 */
(function () {
  'use strict';

  const VERTEX = `#version 300 es
  precision highp float;
  in float aRaDeg;
  in float aDecDeg;
  in float aMag;
  in float aTemp;
  in float aNamed;

  uniform float uLstDeg;
  uniform float uLatRad;
  uniform float uRotateDeg;
  uniform float uPanX;
  uniform float uPanY;
  uniform float uZoom;
  uniform float uVisualZoom;
  uniform float uViewportW;
  uniform float uViewportH;
  uniform float uDpr;
  uniform float uMoving;
  uniform float uLodMag;
  uniform float uStarDim;
  uniform float uTime;
  uniform float uPhotoreal;
  uniform float uArMode;
  uniform float uArZoom;

  out float vMag;
  out float vTemp;
  out float vAlpha;
  out float vTwinkle;
  out float vNamed;
  out vec2 vScreen;

  const float PI = 3.141592653589793;

  void main() {
    // J2000 RA/Dec are used for the GPU path, matching the fast catalogue path
    // already used by the existing renderer for the faint/expanded catalogue.
    float dec = radians(aDecDeg);
    float H = radians(uLstDeg - aRaDeg);
    float sLat = sin(uLatRad);
    float cLat = cos(uLatRad);
    float sDec = sin(dec);
    float cDec = cos(dec);
    float sH = sin(H);
    float cH = cos(H);

    float sinAlt = sDec * sLat + cDec * cLat * cH;
    float alt = asin(clamp(sinAlt, -1.0, 1.0));
    float az = atan(sH, cH * sLat - tan(dec) * cLat) + PI;
    if (az < 0.0) az += 2.0 * PI;
    if (az >= 2.0 * PI) az -= 2.0 * PI;

    // Atmospheric refraction approximation, matching the normal-map intent.
    float altDeg = degrees(alt);
    if (altDeg > -1.0 && altDeg < 90.0) {
      float refr = 1.02 / tan(radians(altDeg + 10.3 / (altDeg + 5.11))) / 60.0;
      altDeg += refr;
    }

    bool visible = altDeg >= 0.0;
    bool lodVisible = (aMag <= uLodMag) || (aNamed > 0.5);
    if (!visible || !lodVisible) {
      gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      vMag = aMag; vTemp = aTemp; vTwinkle = 1.0; vNamed = aNamed;
      vScreen = vec2(-9999.0);
      return;
    }

    float zoom = (uArMode > 0.5) ? uArZoom : uZoom;
    float r = max(uViewportW, uViewportH) * 0.85 * zoom;
    float dist = (90.0 - altDeg) / 90.0 * r;
    float angle = az + radians(uRotateDeg);
    float x = uViewportW * 0.5 + uPanX + dist * sin(angle);
    float y = uViewportH * 0.5 + uPanY - dist * cos(angle);

    bool onScreen = x > -80.0 && x < uViewportW + 80.0 && y > -80.0 && y < uViewportH + 80.0;
    if (!onScreen) {
      gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      vMag = aMag; vTemp = aTemp; vTwinkle = 1.0; vNamed = aNamed;
      vScreen = vec2(-9999.0);
      return;
    }

    float ndcX = (x / uViewportW) * 2.0 - 1.0;
    float ndcY = 1.0 - (y / uViewportH) * 2.0;
    gl_Position = vec4(ndcX, ndcY, 0.0, 1.0);

    // One GPU point per star. The fragment shader turns it into a soft photographic star.
    float base = max(0.75, (3.55 - aMag) * 1.35);
    float faintBoost = clamp((5.8 - aMag) / 3.0, 0.0, 1.0);
    float size = base + faintBoost * 0.55;
    if (uVisualZoom > 1.0) size *= (0.9 + 0.1 * min(uVisualZoom, 4.0));
    if (uMoving > 0.5) size *= 0.92;
    if (uArMode > 0.5) size *= 1.15;
    gl_PointSize = clamp(size * uDpr * 3.2, 1.2 * uDpr, 34.0 * uDpr);

    float alpha = clamp((4.8 - aMag) / 4.4, 0.035, 1.0);
    alpha *= uStarDim;
    if (uPhotoreal < 0.5) alpha *= 0.92;
    vAlpha = alpha;
    vMag = aMag;
    vTemp = aTemp;
    vNamed = aNamed;
    float tw = sin(uTime * 2.3 + aRaDeg * 0.11 + aDecDeg * 0.17) * 0.08;
    vTwinkle = 1.0 + tw * clamp((3.0 - aMag) / 3.0, 0.0, 1.0);
    vScreen = vec2(x, y);
  }`;

  const FRAGMENT = `#version 300 es
  precision highp float;
  in float vMag;
  in float vTemp;
  in float vAlpha;
  in float vTwinkle;
  in float vNamed;
  in vec2 vScreen;
  uniform float uPhotoreal;
  uniform float uMoving;
  uniform float uStarDim;
  out vec4 outColor;

  vec3 starColor(float t) {
    if (t <= 0.0) return vec3(0.91, 0.91, 0.93);
    if (t > 30000.0) return vec3(0.61, 0.69, 1.0);
    if (t > 10000.0) return vec3(0.67, 0.75, 1.0);
    if (t > 7500.0) return vec3(0.78, 0.86, 1.0);
    if (t > 6000.0) return vec3(1.0, 1.0, 1.0);
    if (t > 5200.0) return vec3(1.0, 1.0, 0.78);
    if (t > 3700.0) return vec3(1.0, 0.90, 0.59);
    return vec3(1.0, 0.71, 0.47);
  }

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;

    vec3 c = starColor(vTemp);
    float core = smoothstep(0.34, 0.0, d);
    float halo = smoothstep(1.0, 0.06, d);
    float photographic = (uPhotoreal > 0.5) ? 1.0 : 0.0;

    float bright = clamp((2.8 - vMag) / 3.0, 0.0, 1.0);
    float haloStrength = mix(0.38, 0.78, bright) * photographic;
    if (uMoving > 0.5) haloStrength *= 0.28;

    float alpha = vAlpha * vTwinkle;
    vec3 color = c * (0.55 + 0.45 * core);
    color += vec3(1.0) * core * (0.25 + bright * 0.55);
    alpha *= max(core * 1.35, halo * haloStrength);

    if (vMag > 3.0) {
      alpha *= mix(0.72, 1.0, core);
    }

    outColor = vec4(color, alpha);
  }`;

  function compile(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const msg = gl.getShaderInfoLog(s) || 'Unknown shader error';
      gl.deleteShader(s);
      throw new Error(msg);
    }
    return s;
  }

  function link(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const msg = gl.getProgramInfoLog(p) || 'Unknown program link error';
      gl.deleteProgram(p);
      throw new Error(msg);
    }
    return p;
  }

  function createRenderer(canvas) {
    if (!canvas) return null;
    let gl;
    try { gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, desynchronized: true, premultipliedAlpha: true }); }
    catch (e) { return null; }
    if (!gl) return null;

    let program, buffer;
    try {
      program = link(gl, compile(gl, gl.VERTEX_SHADER, VERTEX), compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      buffer = gl.createBuffer();
    } catch (e) {
      console.warn('StarSight WebGL renderer unavailable:', e);
      return null;
    }

    const loc = {
      ra: gl.getAttribLocation(program, 'aRaDeg'),
      dec: gl.getAttribLocation(program, 'aDecDeg'),
      mag: gl.getAttribLocation(program, 'aMag'),
      temp: gl.getAttribLocation(program, 'aTemp'),
      named: gl.getAttribLocation(program, 'aNamed')
    };
    const uniNames = ['uLstDeg','uLatRad','uRotateDeg','uPanX','uPanY','uZoom','uVisualZoom','uViewportW','uViewportH','uDpr','uMoving','uLodMag','uStarDim','uTime','uPhotoreal','uArMode','uArZoom'];
    const uni = {};
    uniNames.forEach(n => uni[n] = gl.getUniformLocation(program, n));

    let data = new Float32Array(0);
    let count = 0;
    let enabled = true;
    let dpr = 1;
    let lastCatalog = null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    }

    function uploadStars(stars) {
      if (!stars || stars === lastCatalog) return;
      lastCatalog = stars;
      data = new Float32Array(stars.length * 5);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const k = i * 5;
        data[k] = Number.isFinite(s.ra) ? s.ra : 0;
        data[k + 1] = Number.isFinite(s.dec) ? s.dec : 0;
        data[k + 2] = Number.isFinite(s.mag) ? s.mag : 6;
        data[k + 3] = Number.isFinite(s.temp) ? s.temp : 6000;
        data[k + 4] = s.name ? 1 : 0;
      }
      count = stars.length;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    function draw(opts) {
      if (!enabled || !count || !opts || opts.arMode) {
        if (opts && opts.arMode) gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }
      resize();
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const stride = 5 * 4;
      gl.enableVertexAttribArray(loc.ra); gl.vertexAttribPointer(loc.ra, 1, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(loc.dec); gl.vertexAttribPointer(loc.dec, 1, gl.FLOAT, false, stride, 4);
      gl.enableVertexAttribArray(loc.mag); gl.vertexAttribPointer(loc.mag, 1, gl.FLOAT, false, stride, 8);
      gl.enableVertexAttribArray(loc.temp); gl.vertexAttribPointer(loc.temp, 1, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(loc.named); gl.vertexAttribPointer(loc.named, 1, gl.FLOAT, false, stride, 16);

      gl.uniform1f(uni.uLstDeg, opts.lstDeg);
      gl.uniform1f(uni.uLatRad, opts.latRad);
      gl.uniform1f(uni.uRotateDeg, opts.rotateDeg);
      gl.uniform1f(uni.uPanX, opts.panX);
      gl.uniform1f(uni.uPanY, opts.panY);
      gl.uniform1f(uni.uZoom, opts.zoom);
      gl.uniform1f(uni.uVisualZoom, opts.visualZoom);
      gl.uniform1f(uni.uViewportW, opts.cssW);
      gl.uniform1f(uni.uViewportH, opts.cssH);
      gl.uniform1f(uni.uDpr, dpr);
      gl.uniform1f(uni.uMoving, opts.moving ? 1 : 0);
      gl.uniform1f(uni.uLodMag, opts.lodMag);
      gl.uniform1f(uni.uStarDim, opts.starDim);
      gl.uniform1f(uni.uTime, opts.time);
      gl.uniform1f(uni.uPhotoreal, opts.photoreal ? 1 : 0);
      gl.uniform1f(uni.uArMode, 0);
      gl.uniform1f(uni.uArZoom, 1);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);
    window.addEventListener('resize', resize, { passive: true });

    return {
      active: true,
      uploadStars,
      draw,
      resize,
      setEnabled(v) { enabled = !!v; if (!enabled) { gl.clear(gl.COLOR_BUFFER_BIT); } },
      get gl() { return gl; },
      destroy() { if (ro) ro.disconnect(); gl.deleteBuffer(buffer); gl.deleteProgram(program); }
    };
  }

  window.createStarSightWebGLRenderer = createRenderer;
})();
