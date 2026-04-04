import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();

export function initGarden() {
    scene = new THREE.Scene();
    
    // --- 1. CARGAR EL FONDO ---
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (texture) => {
        scene.background = texture;
    });

    scene.fog = new THREE.FogExp2(0x050505, 0.1);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    // --- 2. ILUMINACIÓN (Aumentada para ver el modelo) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 2); 
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x2233ff, 1);
    moonLight.position.set(5, 10, 5);
    scene.add(moonLight);

    camera.position.set(0, 1, 4);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Generar 10 luciérnagas iniciales usando tu modelo test3.glb
    for(let i = 0; i < 10; i++) {
        spawnFirefly(
            (Math.random() - 0.5) * 5,
            Math.random() * 2,
            (Math.random() - 0.5) * 5
        );
    }

    window.addEventListener('resize', onWindowResize);
    animate();
}

function spawnFirefly(x, y, z) {
    // Usamos la ruta corregida para GitHub Pages
    loader.load('./assets/models/test3.glb', (gltf) => {
        const firefly = gltf.scene;
        
        firefly.position.set(x, y, z);
        
        // --- ESCALA --- 
        // Si no se ve, prueba a cambiar 0.5 por 1 o 2 para descartar que sea pequeña
        firefly.scale.set(0.5, 0.5, 0.5); 

        firefly.userData = {
            angle: Math.random() * Math.PI * 2,
            speed: 0.005 + Math.random() * 0.01,
            offset: Math.random() * 1000
        };

        // Hacer que el modelo brille (Emisivo)
        firefly.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0xffff00);
                child.material.emissiveIntensity = 2;
            }
        });

        scene.add(firefly);
        fireflies.push(firefly);
    }, undefined, (err) => {
        console.error("Error cargando test3.glb:", err);
    });
}

export function addMemoryFirefly() {
    spawnFirefly(0, 0.5, 0);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    fireflies.forEach(f => {
        f.userData.angle += f.userData.speed;
        f.position.y += Math.sin(f.userData.angle) * 0.003;
        
        // Parpadeo suave
        f.traverse((child) => {
            if (child.isMesh) {
                const opacity = 0.4 + Math.sin((Date.now() + f.userData.offset) * 0.002) * 0.6;
                child.material.transparent = true;
                child.material.opacity = opacity;
                child.material.emissiveIntensity = opacity * 3;
            }
        });
    });

    if (controls) controls.update();
    renderer.render(scene, camera);
}
