import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null;
let isCaptureMode = false;

// --- CONFIGURACIÓN GIST ---
const GIST_ID = '3ccd05b32cc7e4f18f01aecd71caf597';
const parte1 = "ghp_DTjpuK"; 
const parte2 = "aRVRTuM0UDDzrCCXSPM1Mm6u3bGVd9";
const DISPATCH_TOKEN = parte1 + parte2;
const REPO_OWNER = 'PollitoScripts';
const REPO_NAME = 'GardenMind';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const LIME = '#ccff00';

// --- 1. TEXTURA DE RESPLANDOR NEÓN ---
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

// --- 2. GESTIÓN DE BASE DE DATOS (GIST) ---
async function loadUniquePool() {
    try {
        const res = await fetch(`https://api.github.com/gists/${GIST_ID}`);
        const gist = await res.json();
        const db = JSON.parse(gist.files["memories.json"].content);

        window.availablePool = db.available;
        window.capturedMemories = db.captured;
        document.getElementById('jar-count').innerText = window.capturedMemories.length;
        return true;
    } catch (e) {
        console.error("Error cargando Gist:", e);
        return false;
    }
}

function spawnUniqueFireflies() {
    if (!fireflyModel) return;
    while (fireflies.length < 9 && window.availablePool.length > 0) {
        const randomIndex = Math.floor(Math.random() * window.availablePool.length);
        const data = window.availablePool.splice(randomIndex, 1)[0];
        
        // Nacen en un espacio muy pequeño (Radio de 8)
        const x = (Math.random() - 0.5) * 8;
        const y = Math.random() * 3 + 1; // Altura entre 1 y 4 metros
        const z = (Math.random() - 0.5) * 8;
        
        const f = new Firefly(fireflyModel, x, y, z, data);
        fireflies.push(f);
    }
}

// --- 3. INYECCIÓN DE UI Y ESTILOS ---
function injectUI() {
    const styles = `
        .game-ui { position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 15px; z-index: 100; pointer-events: auto; }
        .ui-btn { background: rgba(0,0,0,0.6); border: 1.5px solid ${LIME}; border-radius: 12px; padding: 10px; cursor: pointer; transition: 0.3s; backdrop-filter: blur(5px); }
        .ui-btn img { width: 50px; height: 50px; display: block; }
        .ui-btn.active { background: rgba(204, 255, 0, 0.4); box-shadow: 0 0 20px ${LIME}; transform: scale(1.1); }
        .count-badge { position: absolute; top: -5px; right: -5px; background: ${LIME}; color: black; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
        
        .toast { position: fixed; top: 30px; left: 50%; transform: translateX(-50%); background: ${LIME}; color: black; padding: 12px 30px; border-radius: 50px; font-weight: bold; opacity: 0; transition: 0.5s; z-index: 4000; pointer-events: none; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }

        .inventory-overlay { 
            position: fixed; inset: 0; background: radial-gradient(circle at center, #1a1a2e 0%, #020205 100%); 
            z-index: 2000; display: none; flex-direction: column; align-items: center; color: ${LIME}; font-family: sans-serif; overflow-y: auto; padding: 80px 20px 40px 20px;
        }
        .inventory-overlay.active { display: flex; }
        .inv-title { font-size: 32px; margin-bottom: 10px; text-shadow: 0 0 10px rgba(204,255,0,0.3); }
        .memories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 25px; width: 100%; max-width: 900px; margin-top: 40px; }
        
        .memory-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(204, 255, 0, 0.2); border-radius: 20px; padding: 25px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer; transition: 0.3s; }
        .memory-card:hover { background: rgba(204, 255, 0, 0.1); transform: translateY(-5px); border-color: ${LIME}; }

        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 3000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(10px); padding: 20px; }
        .modal-content { background: #16213e; padding: 35px; border-radius: 30px; border: 1px solid ${LIME}; width: 100%; max-width: 450px; text-align: center; color: white; position: relative; }
        .img-slot { width: 100%; height: 200px; border: 1px dashed rgba(204,255,0,0.4); border-radius: 20px; margin-bottom: 25px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-style: italic; overflow: hidden; }
        .img-slot img { width: 100%; height: 100%; object-fit: cover; }
        .close-btn { background: none; border: 1px solid ${LIME}; color: ${LIME}; border-radius: 50px; padding: 10px 25px; cursor: pointer; margin-top: 25px; transition: 0.2s; }
        .close-btn:hover { background: ${LIME}; color: black; }

        .cursor-net { position: fixed; width: 80px; height: 80px; pointer-events: none; z-index: 9999; display: none; margin-left: -40px; margin-top: -40px; transition: transform 0.05s ease-out; }
        .no-cursor, .no-cursor * { cursor: none !important; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const container = document.createElement('div');
    container.className = 'game-ui';
    container.innerHTML = `
        <button id="net-btn" class="ui-btn"><img src="./assets/images/net-icon.png"></button>
        <button id="jar-btn" class="ui-btn" style="position:relative;">
            <img src="./assets/images/jar-item.png">
            <div id="jar-count" class="count-badge">0</div>
        </button>
    `;
    document.body.appendChild(container);

    const netVisual = document.createElement('img');
    netVisual.id = 'net-cursor';
    netVisual.className = 'cursor-net';
    netVisual.src = './assets/images/net-icon.png';
    document.body.appendChild(netVisual);

    const toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.className = 'toast';
    toast.innerText = 'Recuerdo atrapado! ✨ Enviando a la nube...';
    document.body.appendChild(toast);

    const inv = document.createElement('div');
    inv.id = 'inv-overlay';
    inv.className = 'inventory-overlay';
    inv.innerHTML = `
        <button class="close-btn" style="margin: 0 0 40px 0;" onclick="document.getElementById('inv-overlay').classList.remove('active')">← Volver al Jardín</button>
        <h1 class="inv-title">❤️Mis Recuerdos Capturados❤️</h1>
        <p style="opacity: 0.7;">✨Momentos Mágicos Guardados✨</p>
        <div id="memories-grid" class="memories-grid"></div>
    `;
    document.body.appendChild(inv);

    const modal = document.createElement('div');
    modal.id = 'mem-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div id="m-img-slot" class="img-slot"></div>
            <h2 id="m-title" style="color:${LIME}; margin: 0 0 10px 0;"></h2>
            <p id="m-date" style="font-size:12px; opacity:0.6; margin-bottom: 20px;"></p>
            <p id="m-desc" style="font-size:14px; line-height: 1.6; opacity: 0.9;"></p>
            <button class="close-btn" onclick="document.getElementById('mem-modal').style.display='none'">Cerrar Detalle</button>
        </div>
    `;
    document.body.appendChild(modal);

    const netBtn = document.getElementById('net-btn');
    netBtn.onclick = () => {
        isCaptureMode = !isCaptureMode;
        netBtn.classList.toggle('active', isCaptureMode);
        controls.enabled = !isCaptureMode;
        if (isCaptureMode) {
            document.body.classList.add('no-cursor');
            netVisual.style.display = 'block';
        } else {
            document.body.classList.remove('no-cursor');
            netVisual.style.display = 'none';
        }
    };
    
    window.addEventListener('mousemove', (e) => {
        if (isCaptureMode) {
            netVisual.style.left = e.clientX + 'px';
            netVisual.style.top = e.clientY + 'px';
            const tilt = e.movementX * 0.6;
            netVisual.style.transform = `rotate(${tilt}deg)`;
        }
    });

    document.getElementById('jar-btn').onclick = openInventory;
}

// --- 4. LÓGICA DE INVENTARIO ---

function openInventory() {
    // --- NUEVO: Limpiamos la red antes de mostrar el inventario ---
    disableCaptureMode(); 
    const grid = document.getElementById('memories-grid');
    grid.innerHTML = '';
    window.capturedMemories.forEach((mem) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.innerHTML = `
            <img src="./assets/images/jar-item.png" style="width:60px; margin-bottom:15px;">
            <p style="font-weight:bold; margin:0;">${mem.title}</p>
            <p style="font-size:11px; opacity:0.6; margin-top:5px;">Recuerdo #${mem.id}</p>
        `;
        card.onclick = () => {
            disableCaptureMode();
            document.getElementById('m-img-slot').innerHTML = mem.img ? `<img src="${mem.img}">` : "Sin imagen";
            document.getElementById('m-title').innerText = mem.title;
            document.getElementById('m-desc').innerText = mem.desc;
            document.getElementById('mem-modal').style.display = 'flex';
        };
        grid.appendChild(card);
    });
    document.getElementById('inv-overlay').classList.add('active');
}

function disableCaptureMode() {
    isCaptureMode = false;
    
    // 1. Quitar clase de cursor invisible
    document.body.classList.remove('no-cursor');
    
    // 2. Ocultar la red visual
    const netVisual = document.getElementById('net-cursor');
    if (netVisual) netVisual.style.display = 'none';
    
    // 3. Quitar el brillo/estado activo del botón de la red
    const netBtn = document.getElementById('net-btn');
    if (netBtn) netBtn.classList.remove('active');
    
    // 4. Reactivar los controles de la cámara (OrbitControls)
    if (controls) controls.enabled = true;
    
    console.log("Modo captura desactivado automáticamente.");
}

function showToast(msg) {
    const t = document.getElementById('toast-msg');
    if(msg) t.innerText = msg;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

// --- 5. CLASE FIREFLY ---
class Firefly {
    constructor(model, x, y, z, data) {
        this.data = data;
        this.group = new THREE.Group();
        this.mesh = model.clone();
        this.mesh.scale.set(0.15, 0.15, 0.15);
        this.group.add(this.mesh);
        this.group.position.set(x, y, z);
        
        this.phase = Math.random() * Math.PI * 2;
        this.velocity = new THREE.Vector3((Math.random()-0.5)*0.05, (Math.random()-0.5)*0.05, (Math.random()-0.5)*0.05);
        this.group.userData = { isFirefly: true, parentRef: this };
        this.glowSprite = null;

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.userData = { isFirefly: true, parentRef: this };
                const isLightSource = child.name.toLowerCase().includes("luz") || child.material.name.includes("004");
                if (isLightSource) {
                    child.material = new THREE.MeshBasicMaterial({ color: this.data.color || LIME });
                    const spriteMat = new THREE.SpriteMaterial({ 
                        map: glowTexture, 
                        color: this.data.color || LIME, 
                        transparent: true, 
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    this.glowSprite = new THREE.Sprite(spriteMat);
                    this.glowSprite.position.set(0, 0.5, -1.2); 
                    child.add(this.glowSprite);
                } else {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 1 });
                }
            }
        });
        scene.add(this.group);
    }

   update(time) {
    this.group.position.add(this.velocity);

    // --- LÍMITES DE VUELO DEL JARDÍN ---
    // X: Izquierda/Derecha, Y: Altura, Z: Profundidad
    const bounds = { x: 12, y: 8, z: 10 };

    // Rebote en los bordes del jardín (X y Z)
    if (Math.abs(this.group.position.x) > bounds.x) {
        this.velocity.x *= -1; // Rebote total
        this.group.position.x = Math.sign(this.group.position.x) * bounds.x;
    }
    if (Math.abs(this.group.position.z) > bounds.z) {
        this.velocity.z *= -1;
        this.group.position.z = Math.sign(this.group.position.z) * bounds.z;
    }

    // Límite de altura (Y) - No bajar del suelo (0.5) ni subir demasiado (12)
    if (this.group.position.y > bounds.y || this.group.position.y < 0.8) {
        this.velocity.y *= -1;
        this.group.position.y = Math.max(0.8, Math.min(this.group.position.y, bounds.y));
    }
    // -----------------------------------

    this.velocity.x += Math.sin(time * 0.4 + this.phase) * 0.002;
    this.velocity.y += Math.cos(time * 0.5 + this.phase) * 0.002;
    this.velocity.z += Math.sin(time * 0.3 + this.phase) * 0.002;
    this.velocity.clampLength(0.01, 0.08);

    const direction = this.velocity.clone().normalize();
    this.group.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;

    const pulse = Math.pow((Math.sin(time * 3 + this.phase) + 1) / 2, 4);
    if (this.glowSprite) {
        this.glowSprite.material.opacity = 0.4 + (pulse * 0.6);
        const s = 10 + (pulse * 12); 
        this.glowSprite.scale.set(s, s, 1);
    }
}
    async capture() {
        scene.remove(this.group);
        const index = fireflies.indexOf(this);
        if (index > -1) fireflies.splice(index, 1);
        
        // Notificar a GitHub Actions
        fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${DISPATCH_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                event_type: 'firefly_caught',
                client_payload: { id: this.data.id }
            })
        });

        window.capturedMemories.push(this.data);
        document.getElementById('jar-count').innerText = window.capturedMemories.length;
        showToast(`¡Recuerdo "${this.data.title}" capturado! ✨`);
        
        spawnUniqueFireflies();
    }
}

// --- 6. MOTOR DEL JARDÍN ---
export async function initGarden() {
    // 1. IMPORTANTE: Primero inyectamos la interfaz (HTML/CSS)
    // para que existan los elementos 'jar-count', etc.
    injectUI();

    // 2. Cargamos los datos del Gist
    const ready = await loadUniquePool();
    if (!ready) {
        console.error("No se pudo cargar el Pool de luciérnagas.");
        return;
    }

    // 3. Iniciamos Three.js normalmente
    scene = new THREE.Scene();

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (t) => { scene.background = t; });

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    const container = document.getElementById('app-canvas');
    if (container) container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 4. Cargamos el modelo y usamos la función de pool único
    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        // En lugar de un bucle for simple, usamos tu nueva función
        spawnUniqueFireflies();
    });

    window.addEventListener('click', (e) => {
        if (!isCaptureMode) return;
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hit = intersects.find(i => i.object.userData && i.object.userData.isFirefly);
        if (hit) hit.object.userData.parentRef.capture();
    });

    // --- MANEJO DE REDIMENSIÓN ---
    window.addEventListener('resize', () => {
        // 1. Actualizar el tamaño del renderizador
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 2. Actualizar la relación de aspecto de la cámara
        camera.aspect = window.innerWidth / window.innerHeight;
    
        // 3. Aplicar los cambios en la proyección de la cámara
        camera.updateProjectionMatrix();
        
        console.log("Cámara y renderizador ajustados al nuevo tamaño.");
    });
    
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;
        fireflies.forEach(f => f.update(time));
        if (controls && controls.enabled) controls.update();
        renderer.render(scene, camera);
    }
    animate();
    console.log("Jardín sincronizado con Gist inicializado.");
}
