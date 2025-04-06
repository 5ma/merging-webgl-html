uniform float uTime;
uniform sampler2D uOceanTexture;

varying float vNoise;
varying vec2 vUv;

void main() {
  vec3 color1 = vec3(0.0, 1.0, 0.0);
  vec3 color2 = vec3(1.0, 1.0, 1.0);
  vec3 finalColor = mix(color1, color2, (vNoise + 1.0) * 0.5);

  vec2 newUv = vUv;
  newUv = vec2(vUv.x, vUv.y + 0.1 * sin(newUv.x * 10.0));

  vec4 oceanColor = texture2D(uOceanTexture, newUv);

  // gl_FragColor = vec4(finalColor, 1.0);
  // gl_FragColor = oceanColor;
  gl_FragColor = vec4(vUv, 0.0, 1.0);
  // gl_FragColor = vec4(vNoise);
}