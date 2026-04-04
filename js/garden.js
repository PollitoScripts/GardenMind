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

    scene.fog = new THREE.FogExp2(0x050505, 0.05);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2); 
    scene.add(ambientLight);

    camera.position.set(0, 1, 5);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0); 
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Spawneamos 5 iniciales
    for(let i = 0; i < 5; i++) {
        spawnFirefly(
            (Math.random() - 0.5) * 4,
            Math.random() * 2,
            (Math.random() - 0.5) * 4
        );
    }

    window.addEventListener('resize', onWindowResize);
    animate();
}

function spawnFirefly(x, y, z) {
    loader.load('./assets/models/test3.glb', (gltf) => {
        const firefly = gltf.scene;
        
        // ESCALA: 0.1 es un buen tamaño inicial
        firefly.scale.set(0.1, 0.1, 0.1); 

        // ROTACIÓN: Si aparecen de espaldas o al revés, ajusta estos valores
        firefly.rotation.y = Math.random() * Math.PI; 

        firefly.position.set(x, y, z);

        firefly.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0xffff00);
                child.material.emissiveIntensity = 5;
            }
        });

        scene.add(firefly);
        fireflies.push(firefly);
    }, undefined, (err) => console.error("Error cargando modelo:", err));
}

export function addMemoryFirefly() {
    // Cuando el usuario pulsa el botón, nace una en el centro
    spawnFirefly(0, 1, 0);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    fireflies.forEach((f, i) => {
        // Movimiento flotante
        f.position.y += Math.sin(time + i) * 0.003;
        f.position.x += Math.cos(time * 0.5 + i) * 0.001;
        
        // Parpadeo de intensidad
        f.traverse((child) => {
            if (child.isMesh) {
                child.material.emissiveIntensity = 2 + Math.sin(time * 3 + i) * 3;
            }
        });
    });

    if (controls) controls.update();
    renderer.render(scene, camera);
}
