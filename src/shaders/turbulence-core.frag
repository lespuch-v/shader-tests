precision highp float;

uniform float uTime;
uniform vec2 uResolution;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 O = vec4(0.0);
  vec2 I = vUv * uResolution;

  vec2 v = uResolution.xy;
  vec2 p = (I + I - v) / v.y / 0.3;

  float i = 0.0;
  for (; i < 9.0; i += 1.0) {
    v = p;

    float f = 0.0;
    for (; f < 9.0; f += 1.0) {
      float stepIndex = f + 1.0;
      v += sin(v.yx * stepIndex + i + 1.0 + uTime) / stepIndex;
    }

    O += (cos(i + 1.0 + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / 6.0 / length(v);
  }

  fragColor = tanh(O * O);
}
