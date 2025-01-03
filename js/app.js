import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import fragment from './shaders/fragment.glsl'
import vertex from './shaders/vertex.glsl'

export default class Sketch {
  constructor(options) {
    this.container = options.dom
    
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    
    this.clock = new THREE.Clock() 
    this.elapsedTime = 0
    
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 0.01, 10 )
    this.camera.position.z = 2
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    })
    this.container.appendChild( this.renderer.domElement );
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true

    this.resize()
    this.setupResize()
    this.addObjects()
    this.render()
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
  
  addObjects() {
    this.geometry = new THREE.PlaneGeometry(0.5, 0.5, 15, 15)
    this.material = new THREE.MeshNormalMaterial()
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fragmentShader: fragment,
      vertexShader: vertex,
      uniforms: {
        uTime: new THREE.Uniform(this.elapsedTime)
      },
      // wireframe: true
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
  dom: document.querySelector('#webgl')
})