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
        firefly.scale.set(0.1, 0.1, 0.1); 
        firefly.position.set(x, y, z);

        // Guardamos direcciones aleatorias únicas para cada luciérnaga
        firefly.userData = {
            velX: (Math.random() - 0.5) * 0.02,
            velY: (Math.random() - 0.5) * 0.02,
            velZ: (Math.random() - 0.5) * 0.02,
            offset: Math.random() * 100,
            radius: 0.15 // Radio de "cuerpo" para evitar colisiones
        };

        firefly.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0xffff00);
                child.material.emissiveIntensity = 5;
            }
        });

        scene.add(firefly);
        fireflies.push(firefly);
    });
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

    fireflies.forEach((f1, i) => {
        // 1. MOVIMIENTO BASE (Vuelo aleatorio)
        // Usamos ruido de seno para que el giro no sea brusco
        f1.position.x += f1.userData.velX + Math.sin(time + f1.userData.offset) * 0.005;
        f1.position.y += f1.userData.velY + Math.cos(time * 0.8 + f1.userData.offset) * 0.005;
        f1.position.z += f1.userData.velZ + Math.sin(time * 0.5 + f1.userData.offset) * 0.005;

        // 2. EVITAR OBSTRUCCIONES (Colisión simple)
        for (let j = i + 1; j < fireflies.length; j++) {
            const f2 = fireflies[j];
            const dist = f1.position.distanceTo(f2.position);
            const minDist = 0.4; // Distancia mínima entre ellas

            if (dist < minDist) {
                // Si están muy cerca, se empujan en direcciones opuestas
                const push = new THREE.Vector3().subVectors(f1.position, f2.position).normalize().multiplyScalar(0.01);
                f1.position.add(push);
                f2.position.sub(push);
            }
        }

        // 3. LÍMITES DE VUELO (Para que no se escapen al infinito)
        const limit = 5;
        if (Math.abs(f1.position.x) > limit) f1.userData.velX *= -1;
        if (Math.abs(f1.position.y) > limit) f1.userData.velY *= -1;
        if (Math.abs(f1.position.z) > limit) f1.userData.velZ *= -1;

        // 4. ORIENTACIÓN (Hacer que miren a donde vuelan)
        // Opcional: f1.rotation.y += 0.01; 

        // 5. PARPADEO
        f1.traverse((child) => {
            if (child.isMesh) {
                child.material.emissiveIntensity = 2 + Math.sin(time * 4 + f1.userData.offset) * 4;
            }
        });
    });

    if (controls) controls.update();
    renderer.render(scene, camera);
}
