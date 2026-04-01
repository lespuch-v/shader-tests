out vec3 vObjectPos;
out vec3 vObjectNormal;

void main() {
  vObjectPos = position;
  vObjectNormal = normalize(normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
