import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null; 

// --- 1. CLASE FIREFLY (Lógica Laravel + Brillo Irradiante) ---
class Firefly {
    constructor(model, x, y, z) {
        this.mesh = model.clone();
        this.position = new THREE.Vector3(x, y, z);
        
        // Tu lógica de velocidad original de Laravel
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05, 
            (Math.random() - 0.5) * 0.05, 
            (Math.random() - 0.5) * 0.05
        );
        this.phase = Math.random() * Math.PI * 2;
        
        this.mesh.scale.set(0.12, 0.12, 0.12);
        this.mesh.position.copy(this.position);

        // --- CONFIGURACIÓN DE MATERIALES ---
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                
                // Buscamos la parte "Luz" según tu captura de Blender
                if (child.name.toLowerCase().includes("luz")) {
                    child.material.color.set(0xccff00); // Verde-Amarillo
                    child.material.emissive.set(0xccff00);
                    child.material.emissiveIntensity = 20; // Brillo base fuerte
                } else {
                    // Cuerpo oscuro pero con un toque de color para que no sea un hueco negro
                    child.material.color.set(0x111111); 
                    child.material.emissiveIntensity = 0;
                }
            }
        });

        scene.add(this.mesh);
    }

    update(time) {
        // --- MOVIMIENTO (Tu lógica exacta de Laravel) ---
        this.position.add(this.velocity);
        this.velocity.x += Math.sin(time * 0.4 + this.phase) * 0.002;
        this.velocity.y += Math.cos(time * 0.5 + this.phase) * 0.002;
        this.velocity.z += Math.sin(time * 0.3 + this.phase) * 0.002;
        this.velocity.clampLength(0, 0.09);

        this.mesh.position.copy(this.position);

        // --- ROTACIÓN (atan2 para que miren al frente sin vibrar) ---
        const direction = this.velocity.clone().normalize();
        const targetRotationY = Math.atan2(direction.x, direction.z) + Math.PI;
        let diff = targetRotationY - this.mesh.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.mesh.rotation.y += diff * 0.05;

        // --- EFECTO CORAZÓN PALPITANTE ---
        // Usamos una potencia para que el "latido" sea más orgánico (rápido al brillar, suave al apagar)
        const pulse = Math.pow((Math.sin(time * 2.5 + this.phase) + 1) / 2, 3);
        const intensity = 5 + pulse * 40; // Oscila entre 5 y 45 de brillo

        this.mesh.traverse((child) => {
            if (child.isMesh && child.name.toLowerCase().includes("luz")) {
                child.material.emissiveIntensity = intensity;
            }
        });

        // --- LÍMITES DEL JARDÍN ---
        const limitX = 10, limitY = 6, limitZ = 8;
        if (Math.abs(this.position.x) > limitX) this.velocity.x *= -0.5;
        if (this.position.y > limitY || this.position.y < 0.5) this.velocity.y *= -0.5;
        if (Math.abs(this.position.z) > limitZ) this.velocity.z *= -0.5;
    }
}

// --- 2. MOTOR DEL JARDÍN ---

export function initGarden() {
    scene = new THREE.Scene();

    // Carga de Fondo
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (texture) => {
        scene.background = texture;
    });

    // Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 12);

    // Renderer con Bloom/Brillo habilitado
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Configuración vital para que el "emissive" brille de verdad
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 2.0; 

    document.getElementById('app-canvas').appendChild(renderer.domElement);

    // Luz ambiental (ajustada para que el fondo se vea pero no mate el brillo)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); 
    scene.add(ambientLight);

    // Controles
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Carga del Modelo
    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        for(let i = 0; i < 10; i++) {
            fireflies.push(new Firefly(
                fireflyModel, 
                (Math.random() - 0.5) * 15, 
                Math.random() * 4 + 1, 
                (Math.random() - 0.5) * 10
            ));
        }
    });

    window.addEventListener('resize', onWindowResize);
    animate();
}

export function addMemoryFirefly() {
    if (fireflyModel) {
        fireflies.push(new Firefly(fireflyModel, 0, 2, 0));
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
