import * as THREE from 'three';

// Technical environment used only when a local HDR cannot be loaded.
export function daylightEnvironment(renderer) {
  const environment = new THREE.Scene();
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 direction; void main(){
      vec3 d=normalize(direction);
      vec3 horizon=vec3(0.77,0.83,0.87), zenith=vec3(0.43,0.60,0.75), ground=vec3(0.24,0.26,0.28);
      vec3 sky=mix(horizon,zenith,pow(max(d.y,0.0),0.65));
      float cloud=smoothstep(0.25,0.9,sin(d.x*7.0+d.z*2.0)*cos(d.z*5.0-d.x*3.0));
      sky=mix(sky,vec3(0.93,0.94,0.94),cloud*0.4*max(d.y,0.0));
      vec3 color=mix(ground,sky,smoothstep(-0.08,0.12,d.y));
      float sun=pow(max(dot(d,normalize(vec3(-0.26,0.93,0.27))),0.0),180.0);
      gl_FragColor=vec4(color+vec3(4.5,4.3,4.0)*sun,1.0);
    }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(80, 24, 12), material);
  environment.add(sphere);
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(environment, 0.04, 0.1, 120);
  generator.dispose(); sphere.geometry.dispose(); material.dispose();
  return target;
}

