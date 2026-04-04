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
    }, undefined, (err) => console.error("Error cargando fondo:", err));

    // Niebla para suavizar el horizonte
    scene.fog = new THREE.FogExp2(0x050505, 0.1);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    // --- 2. ILUMINACIÓN (Vital para ver el modelo .glb) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 2); 
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x2233ff, 1);
    moonLight.position.set(5, 10, 5);
    scene.add(moonLight);

    camera.position.set(0, 1, 4);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    // --- 3. GENERAR LUCIÉRNAGAS INICIALES ---
    for(let i = 0; i < 8; i++) {
        spawnFirefly(
            (Math.random() - 0.5) * 6,
            Math.random() * 2,
            (Math.random() - 0.5) * 6
        );
    }

    window.addEventListener('resize', onWindowResize);
    animate();
}

function spawnFirefly(x, y, z) {
    // IMPORTANTE: Asegúrate de que el nombre sea exacto en tu carpeta assets/models/
    loader.load('./assets/models/test3.glb', (gltf) => {
        const firefly = gltf.scene;
        
        firefly.position.set(x, y, z);
        
        // AJUSTE DE ESCALA: Si no se ve, prueba a subir este número a 2.0 o 5.0
        firefly.scale.set(0.8, 0.8, 0.8); 

        firefly.userData = {
            angle: Math.random() * Math.PI * 2,
            speed: 0.005 + Math.random() * 0.01,
            offset: Math.random() * 1000
        };

        // Aplicar brillo a los materiales del modelo
        firefly.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0xffff00);
                child.material.emissiveIntensity = 2;
                child.material.transparent = true;
            }
        });

        scene.add(firefly);
        fireflies.push(firefly);
        console.log("Luciérnaga test3.glb añadida");
    }, undefined, (err) => {
        console.error("No se pudo cargar test3.glb. Revisa si el archivo existe en assets/models/", err);
    });
}

export function addMemoryFirefly() {
    // Crea una nueva al centro cuando el usuario escribe un recuerdo
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
        
        // Animación de parpadeo individual
        f.traverse((child) => {
            if (child.isMesh) {
                const opacity = 0.4 + Math.sin((Date.now() + f.userData.offset) * 0.002) * 0.6;
                child.material.opacity = opacity;
                child.material.emissiveIntensity = opacity * 4;
            }
        });
    });

    if (controls) controls.update();
    renderer.render(scene, camera);
}
