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
        this.offset = Math.random() * 100;
        
        this.mesh.scale.set(0.12, 0.12, 0.12);
        this.mesh.position.copy(this.position);

        // Aplicar brillo inicial
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone(); // Material único por bicho
                child.material.emissive = new THREE.Color(0xffff00);
                child.material.emissiveIntensity = 5;
            }
        });

        scene.add(this.mesh);
    }

    update(time) {
        // 1. Wander: Cambia de dirección suavemente (Solo el 5% de los frames)
        if (Math.random() < 0.05) {
            let steer = new THREE.Vector3(
                (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 0.03
            );
            this.acceleration.add(steer);
        }

        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);

        // 2. Posición
        this.mesh.position.copy(this.position);
        
        // 3. --- ROTACIÓN SUAVE (Adiós a los trompicones) ---
        if (this.velocity.lengthSq() > 0.001) {
            // Creamos una matriz temporal para calcular hacia dónde debería mirar
            const tempMatrix = new THREE.Matrix4();
            const targetPos = this.position.clone().add(this.velocity);
            
            tempMatrix.lookAt(targetPos, this.position, new THREE.Vector3(0, 1, 0));
            
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(tempMatrix);
            
            // Interpolar: 0.1 es la suavidad. 
            // Si quieres que gire más lento y natural, baja a 0.05.
            this.mesh.quaternion.slerp(targetQuaternion, 0.1);
            
            // Aplicamos la corrección de la cabeza (si es necesaria)
            this.mesh.rotateY(Math.PI); 
        }

        // 4. Parpadeo y Límites (igual que antes)
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.material.emissiveIntensity = 2 + Math.sin(time * 4 + this.offset) * 4;
            }
        });

        const limit = 6;
        if (Math.abs(this.position.x) > limit) this.velocity.x *= -1;
        if (this.position.y > 6 || this.position.y < 0.5) this.velocity.y *= -1;
        if (Math.abs(this.position.z) > limit) this.velocity.z *= -1;
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
