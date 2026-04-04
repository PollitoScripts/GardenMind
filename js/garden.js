import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, gardenModel;
const fireflies = [];

export function initGarden() {
    scene = new THREE.Scene();
    
    // --- 1. CARGAR EL FONDO (jardin-fondo.webp) ---
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (texture) => {
        scene.background = texture;
        // Si quieres que el fondo sea estático y no se mueva con la cámara:
        // scene.backgroundBlurriness = 0.1; 
    });

    // --- 2. AÑADIR NIEBLA (Para dar profundidad) ---
    // Color oscuro azulado para que combine con la noche
    scene.fog = new THREE.FogExp2(0x050505, 0.15);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true }); // Quitamos alpha:true para ver el fondo

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Post-procesamiento sencillo: Mejora el brillo de las luciérnagas
    renderer.toneMapping = THREE.ReinhardToneMapping;
    
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    // --- 3. ILUMINACIÓN AMBIENTAL ---
    // Luz de luna (Azul tenue)
    const moonLight = new THREE.DirectionalLight(0x2233ff, 0.5);
    moonLight.position.set(5, 10, 5);
    scene.add(moonLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 1.5); 
    scene.add(ambientLight);

    // --- 4. CARGA DEL MODELO (flower.glb) ---
    const loader = new GLTFLoader();
    loader.load('./assets/models/flower.glb', (gltf) => {
        gardenModel = gltf.scene;
        
        // Aplicamos un material un poco más brillante a la flor si es necesario
        gardenModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        gardenModel.scale.set(1.5, 1.5, 1.5);
        gardenModel.position.y = -1.2;
        scene.add(gardenModel);
    });

    camera.position.set(0, 2, 6);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true; 
    controls.autoRotateSpeed = 0.3; // Más lento para que sea relajante
    
    // Limitar el zoom para que no atraviesen el fondo
    controls.minDistance = 3;
    controls.maxDistance = 10;

    for(let i = 0; i < 12; i++) {
        spawnFirefly(
            (Math.random() - 0.5) * 8,
            Math.random() * 4,
            (Math.random() - 0.5) * 8
        );
    }

    window.addEventListener('resize', onWindowResize);
    animate();
}

function spawnFirefly(x, y, z) {
    const loader = new GLTFLoader();
    
    loader.load('./assets/models/test3.glb', (gltf) => {
        const firefly = gltf.scene;
        
        // 1. Posición inicial
        firefly.position.set(x, y, z);
        
        // 2. Escala (Ajusta este número si no se ve, prueba con 0.1 o 2.0)
        firefly.scale.set(0.5, 0.5, 0.5); 

        // 3. Datos para la animación
        firefly.userData = {
            angle: Math.random() * Math.PI * 2,
            speed: 0.005 + Math.random() * 0.01,
            offset: Math.random() * 1000
        };

        // 4. Hacer que el modelo brille (Si el modelo tiene materiales)
        firefly.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0xfdfbd3);
                child.material.emissiveIntensity = 2;
            }
        });

        scene.add(firefly);
        fireflies.push(firefly);
        
    }, undefined, (error) => {
        console.error("Error cargando la luciérnaga test3.glb:", error);
    });
}

export function addMemoryFirefly() {
    spawnFirefly(
        (Math.random() - 0.5) * 2, 
        1, 
        (Math.random() - 0.5) * 2
    );
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
        f.position.x += Math.cos(f.userData.angle * 0.5) * 0.002;
        
        // Parpadeo suave
        f.material.opacity = 0.3 + Math.sin((Date.now() + f.userData.offset) * 0.002) * 0.7;
        f.material.emissiveIntensity = f.material.opacity * 2;
    });

    if (controls) controls.update();
    renderer.render(scene, camera);
}
