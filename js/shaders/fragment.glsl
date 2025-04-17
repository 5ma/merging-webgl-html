uniform float uTime;
uniform sampler2D uImage;

varying float vNoise;
varying vec2 vUv;

void main() {
  vec2 newUv = vUv;
  vec4 oceanView = texture2D(uImage, newUv);

  // gl_FragColor = vec4(finalColor, 1.0);
  gl_FragColor = oceanView;
  gl_FragColor.rgb += 0.01 * vec3(vNoise);
  // gl_FragColor = vec4(vUv, 0.0, 1.0);
  // gl_FragColor = vec4(vNoise,0.0, 0.0, 1.0);
}