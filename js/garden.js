import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null;
let caughtCount = 0;
let isCaptureMode = false;
const capturedMemories = []; // Array para guardar datos temporales de cada captura

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const LIME_COLOR_CSS = '#ccff00';

// --- 1. ESTILOS UI ---
function injectUI() {
    const styles = `
        /* Notificación (Toast) */
        .toast-msg {
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(204, 255, 0, 0.9); color: black; padding: 12px 24px;
            border-radius: 50px; font-weight: bold; z-index: 3000;
            opacity: 0; transition: 0.5s; pointer-events: none;
        }

        /* Inventario Acogedor */
        .inventory-overlay {
            position: fixed; inset: 0; 
            background: radial-gradient(circle at center, #1a1a2e 0%, #020205 100%); 
            z-index: 2000; display: none; flex-direction: column; align-items: center;
            color: ${LIME_COLOR_CSS}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow-y: auto; padding-top: 80px; /* Espacio arriba */
        }
        .inventory-overlay.active { display: flex; }

        .memories-grid { 
            display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
            gap: 25px; width: 85%; max-width: 1000px; margin-bottom: 50px;
        }

        .memory-card {
            background: rgba(255,255,255,0.05); border: 1px solid rgba(204, 255, 0, 0.2);
            border-radius: 20px; padding: 25px; cursor: pointer; transition: 0.3s;
            display: flex; flex-direction: column; align-items: center;
        }
        .memory-card:hover { transform: translateY(-5px); background: rgba(204, 255, 0, 0.1); }

        /* Estilos del Pop-up (Detalle del Recuerdo) */
        .modal-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.85);
            z-index: 4000; display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(10px);
        }
        .modal-content {
            background: #16213e; width: 90%; max-width: 500px; border-radius: 30px;
            padding: 30px; border: 1px solid ${LIME_COLOR_CSS}; color: white;
            position: relative; text-align: center;
        }
        .modal-img-placeholder {
            width: 100%; height: 200px; background: rgba(255,255,255,0.1);
            border-radius: 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center;
            border: 1px dashed ${LIME_COLOR_CSS};
        }

        .close-modal { position: absolute; top: 15px; right: 20px; font-size: 24px; cursor: pointer; color: ${LIME_COLOR_CSS}; }
        
        /* Botones del Jardín */
        .game-ui { position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 15px; z-index: 100; pointer-events: auto; }
        .ui-btn { background: rgba(0,0,0,0.6); border: 1.5px solid ${LIME_COLOR_CSS}; border-radius: 12px; padding: 10px; cursor: pointer; transition: 0.3s; }
        .ui-btn.active { background: rgba(204, 255, 0, 0.4); box-shadow: 0 0 20px ${LIME_COLOR_CSS}; }
        .count-badge { position: absolute; top: -5px; right: -5px; background: ${LIME_COLOR_CSS}; color: black; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
        .back-btn { background: none; border: 1px solid ${LIME_COLOR_CSS}; color: ${LIME_COLOR_CSS}; border-radius: 50px; padding: 8px 20px; cursor: pointer; margin-bottom: 40px; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Toast
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast-msg';
    toast.innerText = 'Recuerdo atrapado, ve a tu inventario...';
    document.body.appendChild(toast);

    // Botones
    const container = document.createElement('div');
    container.className = 'game-ui';
    container.innerHTML = `
        <button id="net-btn" class="ui-btn"><img src="./assets/images/net-icon.png" style="width:50px"></button>
        <button id="jar-btn" class="ui-btn" style="position:relative;">
            <img src="./assets/images/jar-item.png" style="width:50px">
            <div id="jar-count" class="count-badge">0</div>
        </button>
    `;
    document.body.appendChild(container);

    // Modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'memory-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" onclick="document.getElementById('memory-modal').style.display='none'">&times;</span>
            <div class="modal-img-placeholder">Sin imagen todavía</div>
            <h2 id="modal-title" style="color:${LIME_COLOR_CSS}; margin-bottom:10px;">Título del Recuerdo</h2>
            <p id="modal-date" style="font-size:12px; opacity:0.6; margin-bottom:15px;">Fecha</p>
            <p id="modal-desc" style="font-size:14px; line-height:1.6;">Aquí aparecerá la descripción de tu recuerdo capturado.</p>
        </div>
    `;
    document.body.appendChild(modal);

    // Inventario
    const overlay = document.createElement('div');
    overlay.className = 'inventory-overlay';
    overlay.id = 'inv-overlay';
    overlay.innerHTML = `
        <button class="back-btn" onclick="document.getElementById('inv-overlay').classList.remove('active')">← Volver al Jardín</button>
        <div style="text-align:center; margin-bottom:60px;">
            <h1 style="font-size:32px; margin:0">Mi Colección de Luces</h1>
            <p id="inv-status">Explora tus momentos guardados</p>
        </div>
        <div class="memories-grid" id="memories-grid"></div>
    `;
    document.body.appendChild(overlay);

    // Eventos
    document.getElementById('net-btn').onclick = (e) => {
        isCaptureMode = !isCaptureMode;
        e.currentTarget.classList.toggle('active', isCaptureMode);
        controls.enabled = !isCaptureMode;
        document.body.style.cursor = isCaptureMode ? 'crosshair' : 'default';
    };
    document.getElementById('jar-btn').onclick = openInventory;
}

function showToast() {
    const t = document.getElementById('toast');
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

function openInventory() {
    const grid = document.getElementById('memories-grid');
    grid.innerHTML = '';
    
    capturedMemories.forEach((mem, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.innerHTML = `
            <img src="./assets/images/jar-item.png" style="width:60px; margin-bottom:15px;">
            <p style="font-weight:bold; margin:0;">Recuerdo #${index + 1}</p>
            <p style="font-size:11px; opacity:0.7; margin-top:5px;">${mem.date} - ${mem.time}</p>
        `;
        card.onclick = () => openModal(mem);
        grid.appendChild(card);
    });

    document.getElementById('inv-overlay').classList.add('active');
}

function openModal(mem) {
    document.getElementById('modal-title').innerText = mem.title;
    document.getElementById('modal-date').innerText = `${mem.date} a las ${mem.time}`;
    document.getElementById('memory-modal').style.display = 'flex';
}

// --- 2. LÓGICA 3D ---
// (Mantenemos la clase Firefly y el sistema de Raycaster anterior)
// Solo actualizamos la función capture() para guardar datos reales

class Firefly {
    constructor(model, x, y, z) {
        this.group = new THREE.Group();
        this.mesh = model.clone();
        this.mesh.scale.set(0.15, 0.15, 0.15);
        this.group.add(this.mesh);
        this.group.position.set(x, y, z);
        this.velocity = new THREE.Vector3((Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04);
        this.group.userData = { isFirefly: true, parentRef: this };
        this.mesh.traverse(child => {
            if(child.isMesh) {
                child.userData = { isFirefly: true, parentRef: this };
                if(child.name.toLowerCase().includes("luz") || child.material.name.includes("004")) {
                    child.material = new THREE.MeshBasicMaterial({ color: 0xccff00 });
                }
            }
        });
        scene.add(this.group);
    }

    capture() {
        scene.remove(this.group);
        fireflies.splice(fireflies.indexOf(this), 1);
        
        // Guardar información del recuerdo
        const now = new Date();
        capturedMemories.push({
            title: `Luz del ${now.toLocaleDateString()}`,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            description: "" // Vacío para la DB futura
        });

        caughtCount++;
        document.getElementById('jar-count').innerText = caughtCount;
        showToast();
    }
    
    update(time) {
        this.group.position.add(this.velocity);
        // ... (resto de lógica de movimiento)
    }
}

// (El resto de initGarden y animate se mantiene igual que la versión anterior)
export function initGarden() {
    scene = new THREE.Scene();
    injectUI();

    const texLab = new THREE.TextureLoader();
    texLab.load('./assets/textures/jardin-fondo.webp', (t) => { scene.background = t; });

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        for(let i=0; i<15; i++) {
            const f = new Firefly(fireflyModel, (Math.random()-0.5)*15, Math.random()*5+1, (Math.random()-0.5)*10);
            fireflies.push(f);
        }
    });

    window.addEventListener('click', onMouseDown);
    
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;
        fireflies.forEach(f => {
            // Animación de vuelo básica aquí
            f.group.position.y += Math.sin(time + f.group.position.x) * 0.005;
        });
        if(controls && controls.enabled) controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

function onMouseDown(event) {
    if (!isCaptureMode) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while(obj) {
            if(obj.userData.isFirefly) { obj.userData.parentRef.capture(); break; }
            obj = obj.parent;
        }
    }
}
