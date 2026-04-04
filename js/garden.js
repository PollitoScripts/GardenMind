import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null; 

// --- 1. GENERADOR DE TEXTURA DE BRILLO (El "Glow") ---
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(204, 255, 0, 1)'); // Lima centro
    gradient.addColorStop(0.2, 'rgba(204, 255, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparente borde
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

const glowTexture = createGlowTexture();

// --- 2. CLASE FIREFLY ---
class Firefly {
    constructor(model, x, y, z) {
        this.mesh = model.clone();
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
        this.phase = Math.random() * Math.PI * 2;
        this.glowSprite = null;

        this.mesh.scale.set(0.12, 0.12, 0.12);
        this.mesh.position.copy(this.position);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: child.name.toLowerCase().includes("luz") ? 0xccff00 : 0x050505,
                    emissive: child.name.toLowerCase().includes("luz") ? 0xccff00 : 0x000000,
                    emissiveIntensity: 2
                });

                if (child.name.toLowerCase().includes("luz")) {
                    // CREAMOS EL AURA DE LUZ (Sprite)
                    const spriteMat = new THREE.SpriteMaterial({ 
                        map: glowTexture, 
                        color: 0xccff00, 
                        transparent: true, 
                        blending: THREE.AdditiveBlending 
                    });
                    this.glowSprite = new THREE.Sprite(spriteMat);
                    this.glowSprite.scale.set(8, 8, 1); // Tamaño del resplandor
                    child.add(this.glowSprite); 
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
        this.velocity.clampLength(0, 0.08);
        this.mesh.position.copy(this.position);

        // Rotación
        const direction = this.velocity.clone().normalize();
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;

        // LATIDO DEL RESPLANDOR
        const pulse = Math.pow((Math.sin(time * 3 + this.phase) + 1) / 2, 4);
        if (this.glowSprite) {
            this.glowSprite.material.opacity = 0.2 + pulse * 0.8;
            const s = 4 + pulse * 10; // El aura crece y decrece
            this.glowSprite.scale.set(s, s, 1);
        }
    }
}

// --- 3. MOTOR ---
export function initGarden() {
    scene = new THREE.Scene();
    
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (t) => scene.background = t);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    controls = new OrbitControls(camera, renderer.domElement);
    
    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        for(let i = 0; i < 12; i++) {
            fireflies.push(new Firefly(fireflyModel, (Math.random()-0.5)*15, Math.random()*4+1, (Math.random()-0.5)*10));
        }
    });

    animate();
}

export function addMemoryFirefly() {
    if (fireflyModel) fireflies.push(new Firefly(fireflyModel, 0, 2, 0));
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    fireflies.forEach(f => f.update(time));
    renderer.render(scene, camera);
}
