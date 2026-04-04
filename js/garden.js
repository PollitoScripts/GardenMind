import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null;

// --- 1. TEXTURA DE RESPLANDOR (BRILLO NEÓN) ---
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
    gradient.addColorStop(0.2, 'rgba(204, 255, 0, 1)'); 
    gradient.addColorStop(0.5, 'rgba(204, 255, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

const glowTexture = createGlowTexture();

// --- 2. CLASE FIREFLY (Ajustada a tu modelo real) ---
class Firefly {
    constructor(model, x, y, z) {
        this.mesh = model.clone();
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
        this.phase = Math.random() * Math.PI * 2;
        this.glowSprite = null;

        this.mesh.scale.set(0.15, 0.15, 0.15);
        this.mesh.position.copy(this.position);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                // LÓGICA DE DETECCIÓN SEGÚN TU BLENDER:
                // 1. Si el nombre del objeto contiene "Luz"
                // 2. O si el nombre del material es "M_Firefly.004" (el de la bola verde)
                const materialName = child.material.name;
                const isLightSource = child.name.toLowerCase().includes("luz") || materialName.includes("004");

                if (isLightSource) {
                    // La parte física de la bombilla
                    child.material = new THREE.MeshBasicMaterial({ color: 0xccff00 });

                    // EL RESPLANDOR IRRADIANTE (Sprite)
                    const spriteMat = new THREE.SpriteMaterial({ 
                        map: glowTexture, 
                        color: 0xccff00, 
                        transparent: true, 
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    this.glowSprite = new THREE.Sprite(spriteMat);
                    this.glowSprite.scale.set(12, 12, 1); // Tamaño del brillo
                    child.add(this.glowSprite);
                } else {
                    // El resto (Cuerpo, Alas, Ojos) -> Negro mate
                    child.material = new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 1 });
                }
            }
        });
        scene.add(this.mesh);
    }

    update(time) {
        // Movimiento Laravel
        this.position.add(this.velocity);
        this.velocity.x += Math.sin(time * 0.4 + this.phase) * 0.002;
        this.velocity.y += Math.cos(time * 0.5 + this.phase) * 0.002;
        this.velocity.z += Math.sin(time * 0.3 + this.phase) * 0.002;
        this.velocity.clampLength(0.01, 0.08);
        this.mesh.position.copy(this.position);

        // Rotación
        const direction = this.velocity.clone().normalize();
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;

        // Latido del brillo
        const pulse = Math.pow((Math.sin(time * 3 + this.phase) + 1) / 2, 4);
        if (this.glowSprite) {
            this.glowSprite.material.opacity = 0.4 + (pulse * 0.6);
            const s = 8 + (pulse * 10); 
            this.glowSprite.scale.set(s, s, 1);
        }
    }
}

// --- 3. MOTOR ---
export function initGarden() {
    scene = new THREE.Scene();
    
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (t) => { scene.background = t; });

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    // Luz ambiental para ver siluetas
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        for(let i = 0; i < 12; i++) {
            fireflies.push(new Firefly(fireflyModel, (Math.random()-0.5)*18, Math.random()*5+1, (Math.random()-0.5)*12));
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
    if (controls) controls.update();
    renderer.render(scene, camera);
}
