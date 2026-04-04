import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();

export function initGarden() {
    scene = new THREE.Scene();
    
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (texture) => {
        scene.background = texture;
    });

    // Reducimos un poco la niebla para que no "se coma" a las luciérnagas de lejos
    scene.fog = new THREE.FogExp2(0x050505, 0.05);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2); 
    scene.add(ambientLight);

    // --- CÁMARA Y CONTROLES ---
    camera.position.set(0, 1, 5); 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // ESTO ES CLAVE: Obliga a la cámara a mirar al centro donde spawnean
    controls.target.set(0, 0, 0); 
    
    // Rotación automática más lenta y elegante
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Solo cargamos 5 luciérnagas iniciales cerca del centro
    for(let i = 0; i < 5; i++) {
        spawnFirefly(
            (Math.random() - 0.5) * 3, // Más cerca del centro (x)
            Math.random() * 1.5,       // Altura razonable (y)
            (Math.random() - 0.5) * 3  // Más cerca del centro (z)
        );
    }

    window.addEventListener('resize', onWindowResize);
    animate();
}

function spawnFirefly(x, y, z) {
    loader.load('./assets/models/test3.glb', (gltf) => {
        const firefly = gltf.scene;
        
        // 1. ESCALA: Prueba con 0.15. Si se ve muy pequeña, sube a 0.3
        firefly.scale.set(0.15, 0.15, 0.15); 

        // 2. ROTACIÓN: Corrige la orientación (puedes probar con .x o .y)
        // Si está cabeza abajo, usa firefly.rotation.x = Math.PI;
        firefly.rotation.y = Math.random() * Math.PI; 

        firefly.position.set(x, y, z);

        firefly.traverse((child) => {
            if (child.isMesh) {
                // Brillo intenso para que destaque sobre el fondo
                child.material.emissive = new THREE.Color(0xffff00);
                child.material.emissiveIntensity = 5;
            }
        });

        scene.add(firefly);
        fireflies.push(firefly);
    });
}

export function addMemoryFirefly() {
    spawnFirefly(0, 1, 0);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001; // Tiempo actual en segundos

    fireflies.forEach((f, index) => {
        // Movimiento de flotación (arriba/abajo)
        f.position.y += Math.sin(time + index) * 0.002;
        
        // Movimiento lateral suave (para que no parezcan estatuas)
        f.position.x += Math.cos(time * 0.5 + index) * 0.001;
        
        // Rotación sutil para dar vida
        f.rotation.z = Math.sin(time * 0.8 + index) * 0.1;

        // Parpadeo de la luz
        f.traverse((child) => {
            if (child.isMesh) {
                child.material.emissiveIntensity = 2 + Math.sin(time * 2 + index) * 3;
            }
        });
    });

    if (controls) controls.update();
    renderer.render(scene, camera);
}
