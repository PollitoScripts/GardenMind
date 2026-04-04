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

    scene.fog = new THREE.FogExp2(0x050505, 0.1);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    // Iluminación fuerte para no perder el modelo
    const ambientLight = new THREE.AmbientLight(0xffffff, 2); 
    scene.add(ambientLight);

    camera.position.set(0, 1, 5);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Solo cargamos luciérnagas
    for(let i = 0; i < 5; i++) {
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
    // RUTA CRÍTICA: Asegúrate que test3.glb esté en assets/models/
    loader.load('./assets/models/test3.glb', (gltf) => {
        const firefly = gltf.scene;
        firefly.position.set(x, y, z);
        
        // Probamos con escala 1.0. Si no se ve, súbela a 5.0 luego.
        firefly.scale.set(10, 10, 10); 

        firefly.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0xffff00);
                child.material.emissiveIntensity = 5;
            }
        });

        scene.add(firefly);
        fireflies.push(firefly);
        console.log("¡Luciérnaga test3.glb cargada con éxito!");
    }, undefined, (err) => {
        console.error("Error cargando test3.glb:", err);
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
    fireflies.forEach(f => {
        f.position.y += Math.sin(Date.now() * 0.001 + f.position.x) * 0.002;
    });
    if (controls) controls.update();
    renderer.render(scene, camera);
}
