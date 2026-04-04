import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null; 
let memoryCounter = 0; // Contador de recuerdos para la UI

// --- 1. CONFIGURACIÓN DE UI (CSS DINÁMICO) ---
function injectUIStyles() {
    const styles = `
        /* Contenedor principal para los botones flotantes */
        .floting-ui-container {
            position: absolute;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px; /* Espacio entre botones */
            z-index: 1000; /* Asegura que esté por encima del canvas */
        }

        /* Estilo general de los botones flotantes */
        .ui-btn {
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            transition: transform 0.2s ease, opacity 0.2s ease;
            position: relative; /* Para el contador */
        }

        .ui-btn:hover {
            transform: scale(1.1);
        }

        .ui-btn:active {
            transform: scale(0.95);
        }

        /* Tamaño de las imágenes de icono */
        .ui-btn img {
            width: 70px; /* Tamaño grande y claro */
            height: 70px;
            display: block;
        }

        /* Contador de recuerdos sobre el tarro */
        .memory-count {
            position: absolute;
            top: -10px;
            right: -10px;
            background-color: #ffd700; /* Dorado */
            color: black;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-family: Arial, sans-serif;
            font-size: 16px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

// --- 2. CONFIGURACIÓN DE UI (CREACIÓN DE HTML) ---
function createUI() {
    // Inyectamos los estilos primero
    injectUIStyles();

    // Contenedor principal
    const uiContainer = document.createElement('div');
    uiContainer.className = 'floting-ui-container';

    // BOTÓN 1: LA RED (Captura diaria)
    const btnNet = document.createElement('button');
    btnNet.className = 'ui-btn';
    btnNet.title = 'Capturar Recuerdo Diario'; // Tooltip
    btnNet.onclick = function() {
        console.log("Iniciando modo captura diaria...");
        // Aquí debes añadir tu lógica para iniciar la captura:
        // Ej: cambiar el cursor por una red, activar raycaster para clicks en luciérnagas, etc.
        // let captureActive = true; 
    };

    const imgNet = document.createElement('img');
    imgNet.src = './assets/images/net-icon.png'; // Ruta a tu imagen de la red
    imgNet.alt = 'Red de captura';
    btnNet.appendChild(imgNet);
    uiContainer.appendChild(btnNet);


    // BOTÓN 2: EL TARRO (Acceso al Inventario / Spawn)
    const btnJar = document.createElement('button');
    btnJar.className = 'ui-btn';
    btnJar.id = 'btn-jar'; // ID para actualizar contador
    btnJar.title = 'Ver Inventario / Crear Recuerdo'; // Tooltip
    btnJar.onclick = function() {
        // Enlaza a tu función existente que crea la luciérnaga
        addMemoryFirefly(); 
        
        // Actualizamos contador de UI para dar feedback visual
        memoryCounter++;
        updateMemoryCountUI();
    };

    const imgJar = document.createElement('img');
    imgJar.src = './assets/images/jar-item.png'; // Ruta a tu imagen del tarro
    imgJar.alt = 'Tarro de recuerdos';
    btnJar.appendChild(imgJar);

    // Contador flotante sobre el tarro
    const countSpan = document.createElement('span');
    countSpan.className = 'memory-count';
    countSpan.id = 'memory-count-span';
    countSpan.innerText = memoryCounter;
    btnJar.appendChild(countSpan);

    uiContainer.appendChild(btnJar);

    // Añadimos todo al cuerpo del documento (flotando sobre el canvas)
    document.body.appendChild(uiContainer);
}

// Función auxiliar para actualizar el contador de la UI
function updateMemoryCountUI() {
    const countSpan = document.getElementById('memory-count-span');
    if (countSpan) {
        countSpan.innerText = memoryCounter;
    }
}


// --- 3. CLASE FIREFLY (Se mantiene igual, funcional) ---
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
    gradient.addColorStop(0.2, 'rgba(204, 255, 0, 1)'); 
    gradient.addColorStop(0.5, 'rgba(204, 255, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

const glowTexture = createGlowTexture();

class Firefly {
    constructor(model, x, y, z) {
        this.mesh = model.clone();
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
        this.phase = Math.random() * Math.PI * 2;
        this.glowSprite = null;

        this.mesh.scale.set(0.15, 0.15, 0.15);
        this.mesh.position.copy(this.position);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                const materialName = child.material.name;
                const isLightSource = child.name.toLowerCase().includes("luz") || materialName.includes("004");

                if (isLightSource) {
                    child.material = new THREE.MeshBasicMaterial({ color: 0xccff00 });

                    const spriteMat = new THREE.SpriteMaterial({ 
                        map: glowTexture, 
                        color: 0xccff00, 
                        transparent: true, 
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    this.glowSprite = new THREE.Sprite(spriteMat);
                    this.glowSprite.scale.set(12, 12, 1);
                    child.add(this.glowSprite);
                } else {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 1 });
                }
            }
        });
        scene.add(this.mesh);
    }

    update(time) {
        this.position.add(this.velocity);
        this.velocity.x += Math.sin(time * 0.4 + this.phase) * 0.002;
        this.velocity.y += Math.cos(time * 0.5 + this.phase) * 0.002;
        this.velocity.z += Math.sin(time * 0.3 + this.phase) * 0.002;
        this.velocity.clampLength(0.01, 0.08);
        this.mesh.position.copy(this.position);

        const direction = this.velocity.clone().normalize();
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;

        const pulse = Math.pow((Math.sin(time * 3 + this.phase) + 1) / 2, 4);
        if (this.glowSprite) {
            this.glowSprite.material.opacity = 0.4 + (pulse * 0.6);
            const s = 8 + (pulse * 10); 
            this.glowSprite.scale.set(s, s, 1);
        }
    }
}

// --- 4. MOTOR PRINCIPAL ---
export function initGarden() {
    scene = new THREE.Scene();
    
    // Configuración de UI flotante al inicio
    createUI(); 

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (t) => { scene.background = t; });

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Habilitamos alpha para UI
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        for(let i = 0; i < 12; i++) {
            fireflies.push(new Firefly(fireflyModel, (Math.random()-0.5)*18, Math.random()*5+1, (Math.random()-0.5)*12));
        }
    });

    animate();
}

// Vinculado ahora al botón del tarro
export function addMemoryFirefly() {
    if (fireflyModel) fireflies.push(new Firefly(fireflyModel, 0, 2, 0));
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    fireflies.forEach(f => f.update(time));
    if (controls) controls.update();
    renderer.render(scene, camera);
}
