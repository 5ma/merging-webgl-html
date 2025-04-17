import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import imagesLoaded from 'imagesloaded';
import FontFaceObserver from 'fontfaceobserver';
import fragment from './shaders/fragment.glsl'
import vertex from './shaders/vertex.glsl'
import ocean from '../img/sea.jpg'
import Scroll from './scroll'
import gsap from "gsap";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';

export default class Sketch {
  constructor(options) {
    this.container = options.dom
    
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    
    this.clock = new THREE.Clock() 
    this.elapsedTime = 0
    
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 100, 2000 )
    this.camera.position.z = 600

    const halfTheta = Math.atan((this.height/2)/this.camera.position.z)
    // atanの返り値はラジアンだが、three.js のカメラ設定では視野角（FOV）が degreeである必要があるため、degreeに変換する
    const halfThetaDegree = halfTheta * (180 / Math.PI)
    this.camera.fov = 2 * halfThetaDegree
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.container.appendChild( this.renderer.domElement );
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true

    this.images = [...document.querySelectorAll('img')]

    const fontOpen = new Promise (resolve => {
      new FontFaceObserver("Open Sans").load().then(() => {
        resolve() ;
      })
    })
    const fontPlayfair = new Promise (resolve => {
      new FontFaceObserver("Playfair Display").load().then(() => { resolve() })
    })
    // Preload images
    const preloadImages = new Promise((resolve, reject) => {
      imagesLoaded(document.querySelectorAll("img"), { background: true }, resolve);
    })

    // フォントの読み込みや画像の読み込みが全て完了した後に実行
    const allDone = [fontOpen, fontPlayfair, preloadImages]
    this.currentScroll = 0

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    Promise.all(allDone).then(() => {
      this.scroll = new Scroll()

      this.mouseMovement()
      this.addImages()
      this.setPosition()
      this.resize()
      this.setupResize()
      // this.addObjects()
      this.composerPass()
      this.render()
    })
  }

  mouseMovement() {
    window.addEventListener('mousemove', (event) => {
      this.pointer.x = ( event.clientX / this.width ) * 2 - 1;
      this.pointer.y = - ( event.clientY / this.height ) * 2 + 1;

      this.raycaster.setFromCamera( this.pointer, this.camera );

      // calculate objects intersecting the picking ray
      const intersects = this.raycaster.intersectObjects( this.scene.children );

      if (intersects.length) {
        const targetObj = intersects[0].object;
        targetObj.material.uniforms.uHover.value = intersects[0].uv
      }
    }, false)
  }
  
  setupResize() {
    window.addEventListener('resize', this.resize.bind(this))
  }
  
  resize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
  }

  addImages() {
    this.material = new THREE.ShaderMaterial({
      // side: THREE.DoubleSide,
      fragmentShader: fragment,
      vertexShader: vertex,
      uniforms: {
        uTime: new THREE.Uniform(this.elapsedTime),
        uImage: new THREE.Uniform(0),
        uHover: new THREE.Uniform(new THREE.Vector2(0.5, 0.5)),
        uHoverState: new THREE.Uniform(0)
      },
      // wireframe: true,
      transparent: true,
    })

    this.materials = []
    this.imageStore = this.images.map((img) => {
      const bounds = img.getBoundingClientRect()
      const texture = new THREE.Texture(img)
      // texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true

      const material = this.material.clone()
      material.uniforms.uImage.value = texture
      this.materials.push(material)

      img.addEventListener('mouseenter', () => {
        gsap.to(material.uniforms.uHoverState, {
          value: 1,
          duration: 1,
          overwrite: true
        })
      })
      img.addEventListener('mouseleave', () => {
        gsap.to(material.uniforms.uHoverState, {
          value: 0,
          duration: 1,
          overwrite: true
        })
      })

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(bounds.width, bounds.height, 10, 10),
        material
      )
      this.scene.add(mesh)

      return {
        img,
        mesh,
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height
      }
    })

    console.log(this.imageStore)
  }

  composerPass(){
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    //custom shader pass
    var counter = 0.0;
    this.myEffect = {
      uniforms: {
        "tDiffuse": { value: null },
        "scrollSpeed": { value: null },
        "uAmount": { value: 0.5 },
        "uAngle": { value: 15 },
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 newPosition = position;
        gl_Position = projectionMatrix 
          * modelViewMatrix 
          * vec4( newPosition, 1.0 );
      }
      `,
      fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float scrollSpeed;
      uniform float uAmount;
      uniform float uAngle;
      varying vec2 vUv;
      void main(){
        vec2 offset = uAmount * vec2(cos(uAngle), sin(uAngle));

        vec4 cr = texture2D(tDiffuse, vUv + offset);
        vec4 cga = texture2D(tDiffuse, vUv);
        vec4 cb = texture2D(tDiffuse, vUv - offset);

        vec4 finalColor = vec4(cr.r, cga.g, cb.b, cga.a);

        // 下部（vUv.y > 0.6）のみ適用、それ以外は元の色を使う
        float edge = smoothstep(0.6, 0.65, vUv.y); // ふわっと適用
        gl_FragColor = mix(cga, finalColor, edge);

        // distortion
        vec2 newUV = vUv;
        float area = smoothstep(0.5, 0.0, vUv.y);
        area = pow(area, 4.0);
        newUV.x += (0.5 - vUv.x) * 0.15 * area * scrollSpeed;
        finalColor = mix(cga, finalColor, area);
        
        gl_FragColor = finalColor;
        // gl_FragColor = vec4(area, 0.0, 0.0, 1.0);
      }
      `
    }

    this.customPass = new ShaderPass(this.myEffect);
    this.customPass.renderToScreen = false;
    this.composer.addPass(this.customPass);

    // add glitch effect pass
    // this.glitchPass = new GlitchPass();
    // this.glitchPass.goWild = false; // You can toggle this dynamically
    // this.customPass.renderToScreen = true;
    // this.composer.addPass(this.glitchPass);

    // this.rgbShiftPass = new ShaderPass(RGBShiftShader);
    // this.rgbShiftPass.uniforms['amount'].value = 0.8; // 色ズレの強さ
    // this.customPass.renderToScreen = true;
    // this.composer.addPass(this.rgbShiftPass);
  }

  setPosition() {
    // three.js内のmeshのpositionを実際のhtml上の画像の位置に合わせる
    // three.jsは画面の中心が(0,0)かつmeshの中心がpositionとなっているが、htmlでは画面の左上が(0,0)になり、要素の左上の基準位置とするためそれらを調整
    this.imageStore.forEach((item) => {
      item.mesh.position.y = this.currentScroll - item.top + (this.height * 0.5) - item.height * 0.5;
      item.mesh.position.x = item.left - (this.width * 0.5) + item.width * 0.5;
    })
  }
  
  addObjects() {
    this.geometry = new THREE.PlaneGeometry(100, 100, 10, 10)
    // this.geometry = new THREE.SphereGeometry(0.4, 40, 40)
    this.material = new THREE.MeshNormalMaterial()
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fragmentShader: fragment,
      vertexShader: vertex,
      uniforms: {
        uTime: new THREE.Uniform(this.elapsedTime),
        uOceanTexture: new THREE.Uniform(new THREE.TextureLoader().load(ocean)),
      },
      wireframe: true,
      transparent: true,
    })

    this.mesh = new THREE.Mesh( this.geometry, this.material )
    this.scene.add(this.mesh)
  }
  
  render() {
    this.elapsedTime = this.clock.getElapsedTime()

    this.scroll.render()
    this.currentScroll = this.scroll.scrollToRender
    this.setPosition()

    // this.customPass.uniforms.scrollSpeed.value = this.scroll.speedTarget
    // this.glitchPass.goWild = this.scroll.speedTarget > 0.05;
    // this.rgbShiftPass.uniforms['amount'].value = 0.8 * this.scroll.speedTarget; // 色ズレの強さ

    for (let i = 0; i < this.materials.length; i++) {
      this.materials[i].uniforms.uTime.value = this.elapsedTime;
    }

    // this.mesh.rotation.x = this.elapsedTime / 2000
    // this.mesh.rotation.y = this.elapsedTime / 1000
    
    // update uniforms
    // this.material.uniforms.uTime.value = this.elapsedTime
    this.controls.update()

    // this.renderer.render(this.scene, this.camera)
    this.composer.render()
    window.requestAnimationFrame(this.render.bind(this))
  }
}

new Sketch({
  dom: document.querySelector('#container')
})