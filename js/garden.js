import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null; 

class Firefly {
    constructor(model, x, y, z) {
        this.mesh = model.clone();
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
        this.phase = Math.random() * Math.PI * 2;
        
        this.mesh.scale.set(0.12, 0.12, 0.12);
        this.mesh.position.copy(this.position);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                // IMPORTANTE: Creamos un material nuevo que SI soporte emisión
                child.material = new THREE.MeshStandardMaterial({
                    map: child.material.map, // Mantenemos la textura si la tiene
                    color: child.material.color,
                    roughness: 0.7,
                    metalness: 0.2
                });
                
                if (child.name.toLowerCase().includes("luz")) {
                    // FORZAMOS EL COLOR LIMA NEÓN
                    child.material.color.set(0xccff00);
                    child.material.emissive.set(0xccff00);
                    child.material.emissiveIntensity = 50; // ¡Subidón de intensidad!
                } else {
                    child.material.color.set(0x111111); // Cuerpo casi negro
                    child.material.emissive.set(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
        scene.add(this.mesh);
    }

    update(time) {
        this.position.add(this.velocity);
        this.velocity.x += Math.sin(time * 0.4 + this.phase) * 0.002;
        this.velocity.y += Math.cos(time * 0.5 + this.phase) * 0.002;
        this.velocity.z += Math.sin(time * 0.3 + this.phase) * 0.002;
        this.velocity.clampLength(0, 0.09);
        this.mesh.position.copy(this.position);

        // Rotación suave
        const direction = this.velocity.clone().normalize();
        const targetRotationY = Math.atan2(direction.x, direction.z) + Math.PI;
        let diff = targetRotationY - this.mesh.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.mesh.rotation.y += diff * 0.05;

        // LATIDO AGRESIVO (Para que irradie)
        const pulse = Math.pow((Math.sin(time * 3 + this.phase) + 1) / 2, 4);
        const intensity = 10 + pulse * 80; // Oscila entre 10 y 90

        this.mesh.traverse((child) => {
            if (child.isMesh && child.name.toLowerCase().includes("luz")) {
                child.material.emissiveIntensity = intensity;
            }
        });

        // Límites
        const limit = 8;
        if (Math.abs(this.position.x) > limit) this.velocity.x *= -0.5;
        if (this.position.y > 6 || this.position.y < 0.5) this.velocity.y *= -0.5;
        if (Math.abs(this.position.z) > limit) this.velocity.z *= -0.5;
    }
}

export function initGarden() {
    scene = new THREE.Scene();

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (texture) => {
        scene.background = texture;
    });

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // ESTO ES CLAVE PARA QUE EL COLOR IRRADIE
    renderer.toneMapping = THREE.LinearToneMapping; // Cambiado a Linear para un brillo más crudo
    renderer.toneMappingExposure = 1.5; 

    document.getElementById('app-canvas').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
    scene.add(ambientLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        for(let i = 0; i < 10; i++) {
            fireflies.push(new Firefly(fireflyModel, (Math.random()-0.5)*15, Math.random()*4+1, (Math.random()-0.5)*10));
        }
    });

    window.addEventListener('resize', onWindowResize);
    animate();
}

export function addMemoryFirefly() {
    if (fireflyModel) fireflies.push(new Firefly(fireflyModel, 0, 2, 0));
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    fireflies.forEach(f => f.update(time));
    if (controls) controls.update();
    renderer.render(scene, camera);
}
