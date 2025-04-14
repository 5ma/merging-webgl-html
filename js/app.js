import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import imagesLoaded from 'imagesloaded';
import FontFaceObserver from 'fontfaceobserver';
import fragment from './shaders/fragment.glsl'
import vertex from './shaders/vertex.glsl'
import ocean from '../img/sea.jpg'

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
    Promise.all(allDone).then(() => {
      this.addImages()
      this.setPosition()
      this.resize()
      this.setupResize()
      this.addObjects()
      this.render()
    })
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
    this.imageStore = this.images.map((img) => {
      const bounds = img.getBoundingClientRect()
      const texture = new THREE.Texture(img)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(bounds.width, bounds.height, 1, 1),
        new THREE.MeshBasicMaterial({
          map: texture
        })
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

  setPosition() {
    // three.js内のmeshのpositionを実際のhtml上の画像の位置に合わせる
    // three.jsは画面の中心が(0,0)かつmeshの中心がpositionとなっているが、htmlでは画面の左上が(0,0)になり、要素の左上の基準位置とするためそれらを調整
    this.imageStore.forEach((item) => {
      item.mesh.position.y = -item.top + (this.height * 0.5) - item.height * 0.5;
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
    
    this.mesh.rotation.x = this.elapsedTime / 2000
    this.mesh.rotation.y = this.elapsedTime / 1000
    
    // update uniforms
    this.material.uniforms.uTime.value = this.elapsedTime
    
    this.controls.update()

    this.renderer.render(this.scene, this.camera)
    window.requestAnimationFrame(this.render.bind(this))
  }
}

new Sketch({
  dom: document.querySelector('#container')
})