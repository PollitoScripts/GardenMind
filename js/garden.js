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
        this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 0.05;
        this.maxForce = 0.005;
        this.offset = Math.random() * Math.PI * 2; // Offset para que no todas palpiten igual
        
        this.mesh.scale.set(0.12, 0.12, 0.12);
        this.mesh.position.copy(this.position);

        // --- BUSCAMOS LA PARTE "LUZ" ESPECÍFICAMENTE ---
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                // Clonamos el material para que cada luciérnaga sea independiente
                child.material = child.material.clone();
                
                // Si es la parte de la luz, le damos el color irradiante
                if (child.name.includes("Luz")) {
                    child.material.emissive = new THREE.Color(0xccff00); // Verde-Amarillo neón
                    child.material.emissiveIntensity = 2;
                } else {
                    // El resto del cuerpo no brilla y es más oscuro
                    child.material.emissiveIntensity = 0;
                    child.material.color.set(0x111111); // Un gris muy oscuro casi negro
                }
            }
        });

        scene.add(this.mesh);
    }

    update(time) {
        // 1. Lógica de movimiento (la que ya tenías)
        if (Math.random() < 0.05) {
            let steer = new THREE.Vector3((Math.random()-0.5)*0.03, (Math.random()-0.5)*0.03, (Math.random()-0.5)*0.03);
            this.acceleration.add(steer);
        }
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);
        this.mesh.position.copy(this.position);
        
        // 2. Rotación suave (Slerp)
        if (this.velocity.lengthSq() > 0.0001) {
            const tempMatrix = new THREE.Matrix4();
            tempMatrix.lookAt(this.position.clone().add(this.velocity), this.position, new THREE.Vector3(0, 1, 0));
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(tempMatrix);
            this.mesh.quaternion.slerp(targetQuaternion, 0.1);
            this.mesh.rotateY(Math.PI); 
        }

        // 3. --- EFECTO CORAZÓN PALPITANTE ---
        // Math.sin crea la curva, el 'offset' hace que no palpiten a la vez
        const pulse = Math.sin(time * 2 + this.offset); 
        // Normalizamos el valor para que vaya de 1 a 5 (siempre brillando)
        const intensity = 2 + (pulse + 1) * 2; 

        this.mesh.traverse((child) => {
            if (child.isMesh && child.name.includes("Luz")) {
                child.material.emissiveIntensity = intensity;
            }
        });

        // 4. Límites
        const limit = 6;
        if (Math.abs(this.position.x) > limit) this.velocity.x *= -1;
        if (this.position.y > 6 || this.position.y < 0.5) this.velocity.y *= -1;
        if (Math.abs(this.position.z) > limit) this.velocity.z *= -1;
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 2); 
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
