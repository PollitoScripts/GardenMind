import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null; // Guardamos el modelo para clonarlo rápido

// --- 1. CLASE FIREFLY (Tu lógica de Laravel mejorada) ---
class Firefly {
    constructor(model, x, y, z) {
        this.mesh = model.clone();
        this.position = new THREE.Vector3(x, y, z);
        
        // Velocidad inicial más calmada para evitar el caos
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02, 
            (Math.random() - 0.5) * 0.02, 
            (Math.random() - 0.5) * 0.02
        );
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 0.04; // Un poco más lento para que sea elegante
        this.maxForce = 0.002; // Menos fuerza = giros más amplios y menos "nerviosos"
        this.offset = Math.random() * Math.PI * 2;
        
        this.mesh.scale.set(0.12, 0.12, 0.12);
        this.mesh.position.copy(this.position);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                // ILUMINACIÓN BÁSICA: Para que no se vean negras
                child.material.emissiveIntensity = 0; 
                
                if (child.name.includes("Luz")) {
                    child.material.emissive = new THREE.Color(0xccff00);
                    child.material.emissiveIntensity = 5; // Mucho más brillo
                }
            }
        });

        scene.add(this.mesh);
    }

    update(time) {
        // 1. MOVIMIENTO: Solo cambiamos de dirección un poco para que no zig-zagueen
        if (Math.random() < 0.03) {
            let steer = new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            );
            this.acceleration.add(steer);
        }

        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0.01, this.maxSpeed); // Mínimo de velocidad para que no se paren
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);
        this.mesh.position.copy(this.position);
        
        // 2. ROTACIÓN: Usamos un slerp más lento (0.05) para que el giro sea de "avión"
        if (this.velocity.lengthSq() > 0.0001) {
            const tempMatrix = new THREE.Matrix4();
            const lookTarget = this.position.clone().add(this.velocity);
            tempMatrix.lookAt(lookTarget, this.position, new THREE.Vector3(0, 1, 0));
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(tempMatrix);
            
            this.mesh.quaternion.slerp(targetQuaternion, 0.05); // Giro muy suave
            this.mesh.rotateY(Math.PI); 
        }

        // 3. LATIDO TIPO CORAZÓN
        const pulse = Math.sin(time * 2.5 + this.offset); 
        const intensity = 3 + (pulse + 1) * 4; // Rango de 3 a 11 de brillo

        this.mesh.traverse((child) => {
            if (child.isMesh && child.name.includes("Luz")) {
                child.material.emissiveIntensity = intensity;
            }
        });

        // 4. LÍMITES (Rebote suave en lugar de seco)
        const limit = 7;
        if (Math.abs(this.position.x) > limit) this.velocity.x *= -0.5;
        if (this.position.y > 6 || this.position.y < 0.5) this.velocity.y *= -0.5;
        if (Math.abs(this.position.z) > limit) this.velocity.z *= -0.5;
    }
}

// --- 2. MOTOR DEL JARDÍN ---

export function initGarden() {
    scene = new THREE.Scene();
    
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (texture) => {
        scene.background = texture;
    });

    scene.fog = new THREE.FogExp2(0x050505, 0.05);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5; // Sube esto si las ves muy oscuras
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Sube a 1.5 o 2
    scene.add(ambientLight);

    camera.position.set(0, 2, 8);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // CARGA ÚNICA DEL MODELO
    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        for(let i = 0; i < 6; i++) {
            fireflies.push(new Firefly(
                fireflyModel, 
                (Math.random() - 0.5) * 5, 
                Math.random() * 3, 
                (Math.random() - 0.5) * 5
            ));
        }
    });

    window.addEventListener('resize', onWindowResize);
    animate();
}

export function addMemoryFirefly() {
    if (fireflyModel) {
        fireflies.push(new Firefly(fireflyModel, 0, 1, 0));
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    // Actualizamos todas las luciérnagas usando su clase
    fireflies.forEach(f => f.update(time));

    if (controls) controls.update();
    renderer.render(scene, camera);
}
