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
        
        // Mantenemos la escala en 0.1 o ajusta según prefieras
        firefly.scale.set(0.1, 0.1, 0.1); 
        firefly.position.set(x, y, z);

        // --- AUMENTAMOS LA VELOCIDAD ---
        // (Math.random() - 0.5) * 0.06 dará valores entre -0.03 y 0.03 (el triple que antes)
        firefly.userData = {
            velX: (Math.random() - 0.5) * 0.06,
            velY: (Math.random() - 0.5) * 0.06,
            velZ: (Math.random() - 0.5) * 0.06,
            offset: Math.random() * 100
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
        // 1. MOVIMIENTO BASE
        f1.position.x += f1.userData.velX;
        f1.position.y += f1.userData.velY;
        f1.position.z += f1.userData.velZ;

        // 2. EVITAR OBSTRUCCIONES (Lógica de colisiones anterior)
        for (let j = i + 1; j < fireflies.length; j++) {
            const f2 = fireflies[j];
            const dist = f1.position.distanceTo(f2.position);
            const minDist = 0.4; // Distancia mínima entre ellas

            if (dist < minDist) {
                // Si están muy cerca, se empujan suavemente
                const push = new THREE.Vector3().subVectors(f1.position, f2.position).normalize().multiplyScalar(0.01);
                f1.position.add(push);
                f2.position.sub(push);
            }
        }

        // 3. LÍMITES DE VUELO (Rebote)
        const limit = 5;
        if (Math.abs(f1.position.x) > limit) f1.userData.velX *= -1;
        if (Math.abs(f1.position.y) > limit) f1.userData.velY *= -1;
        if (Math.abs(f1.position.z) > limit) f1.userData.velZ *= -1;

        // 4. --- ORIENTACIÓN AL FRENTE (lookAt) ---
        // Creamos un punto temporal en el espacio que represente la dirección de avance
        // Es la posición actual + el vector de velocidad
        const targetPoint = new THREE.Vector3(
            f1.position.x + f1.userData.velX,
            f1.position.y + f1.userData.velY,
            f1.position.z + f1.userData.velZ
        );
        
        // Obligamos al modelo a mirar a ese punto
        f1.lookAt(targetPoint);
        
        // Si tu modelo 'test3.glb' aparece de espaldas o cabeza abajo por defecto,
        // quizás tengas que corregir su rotación local. Prueba a añadir esto si se ve raro:
        // f1.rotateY(Math.PI); // Gira 180 grados si miren hacia atrás
        // f1.rotateX(Math.PI / 2); // Gira si aparecen de cabeza

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
