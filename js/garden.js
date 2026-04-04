import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();

// --- TU LÓGICA DE CLASE ADAPTADA ---
class Firefly {
    constructor(model) {
        this.mesh = model.clone();
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            Math.random() * 5,
            (Math.random() - 0.5) * 10
        );
        this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02);
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 0.03 + Math.random() * 0.02;
        this.maxForce = 0.002;
        
        this.mesh.position.copy(this.position);
        this.mesh.scale.set(0.12, 0.12, 0.12); // Ajuste de escala
        
        // Brillo
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0xffff00);
                child.material.emissiveIntensity = 5;
            }
        });
        
        scene.add(this.mesh);
    }

    update() {
        // Algoritmo de Wander (Movimiento errático natural de tu código)
        let steer = new THREE.Vector3(
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01
        );
        
        this.acceleration.add(steer);
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);
        
        // Orientación: Mirar hacia donde va
        const target = this.position.clone().add(this.velocity);
        this.mesh.lookAt(target);
        this.mesh.rotateY(Math.PI); // Corrección de 180º que necesitábamos

        this.mesh.position.copy(this.position);
        
        // Reset de aceleración
        this.acceleration.multiplyScalar(0);

        // Rebote en los bordes (Para que no se pierdan)
        const limit = 6;
        if (Math.abs(this.position.x) > limit) this.velocity.x *= -1;
        if (Math.abs(this.position.y) > limit) this.velocity.y *= -1;
        if (Math.abs(this.position.z) > limit) this.velocity.z *= -1;
    }
}

// --- MOTOR DEL JARDÍN ---

export function initGarden() {
    scene = new THREE.Scene();
    
    // Fondo
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (t) => scene.background = t);

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

    // Cargamos el modelo una vez y creamos las instancias
    loader.load('./assets/models/test3.glb', (gltf) => {
        for(let i = 0; i < 8; i++) {
            fireflies.push(new Firefly(gltf.scene));
        }
    });

    window.addEventListener('resize', onWindowResize);
    animate();
}

export function addMemoryFirefly() {
    // Para simplificar, cargamos una nueva usando el mismo loader
    loader.load('./assets/models/test3.glb', (gltf) => {
        const f = new Firefly(gltf.scene);
        f.position.set(0, 1, 0);
        fireflies.push(f);
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Actualizar cada luciérnaga con su propia lógica interna
    fireflies.forEach(f => f.update());

    if (controls) controls.update();
    renderer.render(scene, camera);
}
