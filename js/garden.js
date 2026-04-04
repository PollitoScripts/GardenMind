import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let masterModel = null; // Guardamos el modelo base aquí
let proceduralGlow = null;

// --- 1. FUNCIÓN PARA EL TEXTURE GLOW (TU LÓGICA DE LARAVEL) ---
const createGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
};

// --- 2. CLASE FIREFLY (TRADUCCIÓN LITERAL LARAVEL) ---
class Firefly {
    constructor(model, glowTexture, x, y, z) {
        this.obj = model.clone();
        this.glows = [];
        this.glowSprite = null;
        this.phase = Math.random() * Math.PI * 2;
        this.isCaptured = false;

        // Posición: si pasamos x,y,z las usamos, si no, aleatorio (como en tu init)
        this.position = new THREE.Vector3(
            x !== undefined ? x : (Math.random() - 0.5) * 15,
            y !== undefined ? y : Math.random() * 4 + 1,
            z !== undefined ? z : (Math.random() - 0.5) * 12
        );
        
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
        );

        this.obj.position.copy(this.position);
        this.obj.scale.set(0.12, 0.12, 0.12);

        this.obj.traverse((child) => {
            if (child.isMesh) {
                const c = child.material.color;
                const esLaLuz = child.name.toLowerCase().includes('luz') || (c.g > 0.5 && c.b < 0.4);
                
                if (esLaLuz) {
                    const colorOriginal = c.clone();
                    const blinkingMat = new THREE.MeshBasicMaterial({ 
                        color: new THREE.Color(0x000000), 
                        side: THREE.DoubleSide 
                    });
                    child.material = blinkingMat;

                    const spriteMat = new THREE.SpriteMaterial({ 
                        map: glowTexture, 
                        color: colorOriginal, 
                        transparent: true, 
                        blending: THREE.AdditiveBlending, 
                        depthWrite: false 
                    });
                    const glowSprite = new THREE.Sprite(spriteMat);
                    glowSprite.scale.set(6, 6, 1);
                    child.add(glowSprite);

                    this.glowSprite = glowSprite;
                    this.glows.push({ material: blinkingMat, targetColor: colorOriginal });
                } else {
                    child.material = child.material.clone();
                }
            }
        });

        scene.add(this.obj);
    }

    update(time) {
        if (this.isCaptured) return;

        this.obj.position.add(this.velocity);
        this.velocity.x += Math.sin(time * 0.4 + this.phase) * 0.002;
        this.velocity.y += Math.cos(time * 0.5 + this.phase) * 0.002;
        this.velocity.z += Math.sin(time * 0.3 + this.phase) * 0.002;
        this.velocity.clampLength(0, 0.09);

        // Límites
        const maxX = 10, minX = -10, maxY = 6, minY = 1, maxZ = 5, minZ = -8;
        if (this.obj.position.x > maxX) this.velocity.x -= 0.006;
        if (this.obj.position.x < minX) this.velocity.x += 0.006;
        if (this.obj.position.y > maxY) this.velocity.y -= 0.006;
        if (this.obj.position.y < minY) this.velocity.y += 0.006;
        if (this.obj.position.z > maxZ) this.velocity.z -= 0.006;
        if (this.obj.position.z < minZ) this.velocity.z += 0.006;

        // Rotación
        const direction = this.velocity.clone().normalize();
        const targetRotationY = Math.atan2(direction.x, direction.z) + Math.PI;
        let diff = targetRotationY - this.obj.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.obj.rotation.y += diff * 0.05;

        // Flash agresivo
        const intensidad = Math.pow((Math.sin(time * 3 + this.phase) + 1) / 2, 5);
        if (this.glows) {
            this.glows.forEach(g => g.material.color.lerpColors(new THREE.Color(0x000000), g.targetColor, intensidad));
        }
        if (this.glowSprite) {
            const glowOpacidad = intensidad > 0.01 ? Math.min(1, intensidad * 1.5) : 0;
            this.glowSprite.material.opacity = glowOpacidad;
            this.glowSprite.scale.set(0.5 + (intensidad * 9), 0.5 + (intensidad * 9), 1);
        }
    }
}

// --- 3. EXPORTS PARA EL FRONTEND ---

export function initGarden() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 25);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    proceduralGlow = createGlowTexture();

    loader.load('./assets/models/test3.glb', (gltf) => {
        masterModel = gltf.scene;
        for (let i = 0; i < 12; i++) {
            fireflies.push(new Firefly(masterModel, proceduralGlow));
        }
    });

    // Controles para poder mover la cámara
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    window.addEventListener('resize', onWindowResize);
    animate();
}

// ESTA ES LA FUNCIÓN QUE TE DABA EL ERROR PORQUE FALTABA EL EXPORT
export function addMemoryFirefly() {
    if (masterModel && proceduralGlow) {
        // Creamos una nueva en el centro (0, 1, 0)
        fireflies.push(new Firefly(masterModel, proceduralGlow, 0, 1, 0));
        console.log("Nueva luciérnaga de recuerdo añadida!");
    }
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
