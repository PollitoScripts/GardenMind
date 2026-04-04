import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null; 

// --- 1. CLASE FIREFLY (Vuelo Suave y Contraste Alto) ---
class Firefly {
    constructor(model, x, y, z) {
        this.mesh = model.clone();
        this.position = new THREE.Vector3(x, y, z);
        
        // Velocidad inicial suave para evitar el caos
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.03, 
            (Math.random() - 0.5) * 0.03, 
            (Math.random() - 0.5) * 0.03
        );
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 0.04; 
        this.maxForce = 0.005; // Fuerza de giro suave
        this.offset = Math.random() * Math.PI * 2;
        
        this.mesh.scale.set(0.12, 0.12, 0.12);
        this.mesh.position.copy(this.position);

        // --- CALIBRACIÓN DE COLORES (Contraste Máximo) ---
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone(); // Material único por bicho
                
                if (child.name.includes("Luz")) {
                    // LA LUZ: Verde-Lima Neón muy saturado
                    child.material.color.set(0xccff00); 
                    child.material.emissive.set(0xccff00);
                    child.material.emissiveIntensity = 20; // Brillo base muy alto
                } else {
                    // EL CUERPO: Negro absoluto para que la luz destaque
                    child.material.color.set(0x000000); 
                    child.material.emissiveIntensity = 0;
                    child.material.roughness = 1; // Mate, no brilla con la luz ambiental
                }
            }
        });

        scene.add(this.mesh);
    }

    update(time) {
        // 1. MOVIMIENTO (Wander suave)
        // Solo cambiamos de dirección el 2% de las veces para que vuelen más "recto"
        if (Math.random() < 0.02) {
            let steer = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            );
            this.acceleration.add(steer);
        }

        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0.01, this.maxSpeed); // Evitamos que se paren
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);
        this.mesh.position.copy(this.position);
        
        // 2. --- ROTACIÓN SUAVE (Elimina el nerviosismo de cabeza) ---
        if (this.velocity.lengthSq() > 0.001) {
            // Creamos una matriz temporal para calcular hacia dónde debería mirar
            const tempMatrix = new THREE.Matrix4();
            const targetPos = this.position.clone().add(this.velocity);
            
            //lookAt(target, eye, up)
            tempMatrix.lookAt(targetPos, this.position, new THREE.Vector3(0, 1, 0));
            
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(tempMatrix);
            
            // Interpolar: 0.05 es la suavidad del giro. 
            // Si quieres que gire más lento y natural, baja a 0.03.
            this.mesh.quaternion.slerp(targetQuaternion, 0.05);
            
            // Corrección de 180º para que la cabeza vaya delante
            this.mesh.rotateY(Math.PI); 
        }

        // 3. --- EFECTO LATIDO CORAZÓN (Intensidad Bestial) ---
        const pulse = Math.sin(time * 2.5 + this.offset); 
        // Normalizamos el valor de 0 a 1 y escalamos de 10 a 30 de brillo
        const intensity = 10 + (pulse + 1) * 10; 

        this.mesh.traverse((child) => {
            if (child.isMesh && child.name.includes("Luz")) {
                child.material.emissiveIntensity = intensity;
            }
        });

        // 4. LÍMITES (Rebote suave)
        const limit = 7;
        if (Math.abs(this.position.x) > limit) this.velocity.x *= -0.8;
        if (this.position.y > 6 || this.position.y < 0.5) this.velocity.y *= -0.8;
        if (Math.abs(this.position.z) > limit) this.velocity.z *= -0.8;
    }
}

// --- 2. MOTOR DEL JARDÍN (Init y Animate) ---

export function initGarden() {
    scene = new THREE.Scene();
    
    // Fondo
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (texture) => {
        scene.background = texture;
    });

    // Niebla sutil
    scene.fog = new THREE.FogExp2(0x050505, 0.03);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Configuración de ToneMapping para el brillo (Bloom natural)
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2; 
    
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    // Luz ambiental muy tenue para que el cuerpo negro no se aclare
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Sube a 0.3 o 0.5 si están DEMASIADO oscuras
    scene.add(ambientLight);

    camera.position.set(0, 2, 8);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // CARGA ÚNICA DEL MODELO
    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        // Spawneamos 6 iniciales en posiciones aleatorias
        for(let i = 0; i < 6; i++) {
            fireflies.push(new Firefly(
                fireflyModel, 
                (Math.random() - 0.5) * 8, 
                Math.random() * 4, 
                (Math.random() - 0.5) * 8
            ));
        }
    });

    window.addEventListener('resize', onWindowResize);
    animate();
}

export function addMemoryFirefly() {
    if (fireflyModel) {
        // Nace una en el centro al pulsar el botón
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
