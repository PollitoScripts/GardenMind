import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null;
let caughtCount = 0;
let isCaptureMode = false;
const capturedMemories = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const LIME = '#ccff00';

// --- 1. TEXTURA DE RESPLANDOR (LA QUE TE GUSTA) ---
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

// --- 2. INTERFAZ ---
function injectUI() {
    const styles = `
        .game-ui { position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 15px; z-index: 100; pointer-events: auto; }
        .ui-btn { background: rgba(0,0,0,0.6); border: 1.5px solid ${LIME}; border-radius: 12px; padding: 10px; cursor: pointer; transition: 0.3s; backdrop-filter: blur(5px); }
        .ui-btn img { width: 50px; height: 50px; display: block; }
        .ui-btn.active { background: rgba(204, 255, 0, 0.4); box-shadow: 0 0 20px ${LIME}; transform: scale(1.1); }
        .count-badge { position: absolute; top: -5px; right: -5px; background: ${LIME}; color: black; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
        .toast { position: fixed; top: 30px; left: 50%; transform: translateX(-50%); background: ${LIME}; color: black; padding: 12px 30px; border-radius: 50px; font-weight: bold; opacity: 0; transition: 0.5s; z-index: 4000; pointer-events: none; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        .inventory-overlay { position: fixed; inset: 0; background: radial-gradient(circle at center, #1a1a2e 0%, #020205 100%); z-index: 2000; display: none; flex-direction: column; align-items: center; color: ${LIME}; font-family: sans-serif; overflow-y: auto; padding: 80px 20px 40px 20px; }
        .inventory-overlay.active { display: flex; }
        .inv-title { font-size: 32px; margin-bottom: 10px; text-shadow: 0 0 10px rgba(204,255,0,0.3); }
        .memories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 25px; width: 100%; max-width: 900px; margin-top: 40px; }
        .memory-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(204, 255, 0, 0.2); border-radius: 20px; padding: 25px; text-align: center; cursor: pointer; transition: 0.3s; }
        .memory-card:hover { background: rgba(204, 255, 0, 0.1); transform: translateY(-5px); border-color: ${LIME}; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 3000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(10px); padding: 20px; }
        .modal-content { background: #16213e; padding: 35px; border-radius: 30px; border: 1px solid ${LIME}; width: 100%; max-width: 450px; text-align: center; color: white; position: relative; }
        .close-btn { background: none; border: 1px solid ${LIME}; color: ${LIME}; border-radius: 50px; padding: 10px 25px; cursor: pointer; margin-top: 25px; transition: 0.2s; }
        .close-btn:hover { background: ${LIME}; color: black; }
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

    const toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.className = 'toast';
    toast.innerText = 'Recuerdo atrapado...';
    document.body.appendChild(toast);

    const inv = document.createElement('div');
    inv.id = 'inv-overlay';
    inv.className = 'inventory-overlay';
    inv.innerHTML = `
        <button class="close-btn" style="margin: 0 0 40px 0;" onclick="document.getElementById('inv-overlay').classList.remove('active')">← Volver al Jardín</button>
        <h1 class="inv-title">Mis Luces Guardadas</h1>
        <div id="memories-grid" class="memories-grid"></div>
    `;
    document.body.appendChild(inv);

    const modal = document.createElement('div');
    modal.id = 'mem-modal';
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-content"><h2 id="m-title" style="color:${LIME}"></h2><p id="m-date"></p><button class="close-btn" onclick="document.getElementById('mem-modal').style.display='none'">Cerrar</button></div>`;
    document.body.appendChild(modal);

    document.getElementById('net-btn').onclick = (e) => {
        isCaptureMode = !isCaptureMode;
        e.currentTarget.classList.toggle('active', isCaptureMode);
        controls.enabled = !isCaptureMode;
        document.body.style.cursor = isCaptureMode ? 'crosshair' : 'default';
    };
    document.getElementById('jar-btn').onclick = openInventory;
}

function openInventory() {
    const grid = document.getElementById('memories-grid');
    grid.innerHTML = '';
    capturedMemories.forEach((mem, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.innerHTML = `<p>Recuerdo #${index + 1}</p>`;
        card.onclick = () => {
            document.getElementById('m-title').innerText = `Luz #${index + 1}`;
            document.getElementById('m-date').innerText = `Guardado el ${mem.date}`;
            document.getElementById('mem-modal').style.display = 'flex';
        };
        grid.appendChild(card);
    });
    document.getElementById('inv-overlay').classList.add('active');
}

function showToast() {
    const t = document.getElementById('toast-msg');
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

// --- 3. CLASE FIREFLY (MEZCLA PERFECTA) ---
class Firefly {
    constructor(model, x, y, z) {
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
                    child.material = new THREE.MeshBasicMaterial({ color: 0xccff00 });

                    const spriteMat = new THREE.SpriteMaterial({ 
                        map: glowTexture, 
                        color: 0xccff00, 
                        transparent: true, 
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    this.glowSprite = new THREE.Sprite(spriteMat);
                    
                    // --- AQUÍ EL AJUSTE PARA EL "CULO" ---
                    // x=0 (centro), y=0.5 (un poco arriba), z=-1.2 (hacia atrás)
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
        // Movimiento
        this.group.position.add(this.velocity);
        this.velocity.x += Math.sin(time * 0.4 + this.phase) * 0.002;
        this.velocity.y += Math.cos(time * 0.5 + this.phase) * 0.002;
        this.velocity.z += Math.sin(time * 0.3 + this.phase) * 0.002;
        this.velocity.clampLength(0.01, 0.08);

        // Rotación
        const direction = this.velocity.clone().normalize();
        this.group.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;

        // Latido del brillo (Copiado de tu código favorito)
        const pulse = Math.pow((Math.sin(time * 3 + this.phase) + 1) / 2, 4);
        if (this.glowSprite) {
            this.glowSprite.material.opacity = 0.4 + (pulse * 0.6);
            const s = 10 + (pulse * 12); // Brillo mucho más grande
            this.glowSprite.scale.set(s, s, 1);
        }
    }

    capture() {
        scene.remove(this.group);
        const index = fireflies.indexOf(this);
        if (index > -1) fireflies.splice(index, 1);
        const now = new Date();
        capturedMemories.push({ date: now.toLocaleDateString(), time: now.toLocaleTimeString() });
        caughtCount++;
        document.getElementById('jar-count').innerText = caughtCount;
        showToast();
    }
}

// --- 4. MOTOR PRINCIPAL ---
export function initGarden() {
    scene = new THREE.Scene();
    injectUI();

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/jardin-fondo.webp', (t) => { scene.background = t; });

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        for(let i = 0; i < 15; i++) {
            fireflies.push(new Firefly(fireflyModel, (Math.random()-0.5)*20, Math.random()*5+1, (Math.random()-0.5)*15));
        }
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

    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;
        fireflies.forEach(f => f.update(time));
        if (controls) controls.update();
        renderer.render(scene, camera);
    }
    animate();
}
