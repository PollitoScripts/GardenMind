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
        .img-slot { width: 100%; height: 200px; border: 1px dashed rgba(204,255,0,0.4); border-radius: 20px; margin-bottom: 25px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-style: italic; }
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
    toast.innerText = 'Recuerdo atrapado, ve a tu inventario...';
    document.body.appendChild(toast);

    const inv = document.createElement('div');
    inv.id = 'inv-overlay';
    inv.className = 'inventory-overlay';
    inv.innerHTML = `
        <button class="close-btn" style="margin: 0 0 40px 0;" onclick="document.getElementById('inv-overlay').classList.remove('active')">← Volver al Jardín</button>
        <h1 class="inv-title">Mis Luces Guardadas</h1>
        <p style="opacity: 0.7;">Momentos mágicos capturados</p>
        <div id="memories-grid" class="memories-grid"></div>
    `;
    document.body.appendChild(inv);

    const modal = document.createElement('div');
    modal.id = 'mem-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="img-slot">Espacio para fotografía</div>
            <h2 id="m-title" style="color:${LIME}; margin: 0 0 10px 0;"></h2>
            <p id="m-date" style="font-size:12px; opacity:0.6; margin-bottom: 20px;"></p>
            <p id="m-desc" style="font-size:14px; line-height: 1.6; opacity: 0.9;">Aquí podrás escribir la historia de este recuerdo muy pronto...</p>
            <button class="close-btn" onclick="document.getElementById('mem-modal').style.display='none'">Cerrar Detalle</button>
        </div>
    `;
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
        card.innerHTML = `
            <img src="./assets/images/jar-item.png" style="width:60px; margin-bottom:15px;">
            <p style="font-weight:bold; margin:0;">Recuerdo #${index + 1}</p>
            <p style="font-size:11px; opacity:0.6; margin-top:5px;">${mem.date}</p>
        `;
        card.onclick = () => {
            document.getElementById('m-title').innerText = `Luz capturada #${index + 1}`;
            document.getElementById('m-date').innerText = `Guardado el ${mem.date} a las ${mem.time}`;
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

// --- 2. CLASE FIREFLY CORREGIDA ---
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

        // 1. Crear el material del aura (Glow)
        const glowMaterial = new THREE.SpriteMaterial({
            map: this.createGlowTexture(),
            color: 0xccff00,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.glowSprite = new THREE.Sprite(glowMaterial);
        this.glowSprite.scale.set(4, 4, 1); 

        // 2. Recorrer el modelo para encontrar la luz y PEGAR el aura ahí
        this.mesh.traverse(child => {
            if(child.isMesh) {
                child.userData = { isFirefly: true, parentRef: this };
                
                const isLightPart = child.name.toLowerCase().includes("luz") || 
                                   (child.material && child.material.name.includes("004"));

                if(isLightPart) {
                    child.material = new THREE.MeshBasicMaterial({ color: 0xccff00 });
                    // IMPORTANTE: Añadimos el aura como HIJO de la malla de la luz
                    // Esto hace que el aura use las coordenadas locales de la bombilla
                    child.add(this.glowSprite); 
                } else {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x020202 });
                }
            }
        });
        
        scene.add(this.group);
    }

    createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'white');
        grad.addColorStop(0.3, 'rgba(204, 255, 0, 0.9)');
        grad.addColorStop(0.7, 'rgba(204, 255, 0, 0.1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    update(time) {
        this.group.position.x += this.velocity.x;
        this.group.position.y += this.velocity.y;
        this.group.position.z += this.velocity.z;

        this.velocity.x += Math.sin(time * 0.5 + this.phase) * 0.002;
        this.velocity.y += Math.cos(time * 0.3 + this.phase) * 0.002;
        this.velocity.z += Math.sin(time * 0.7 + this.phase) * 0.002;
        this.velocity.clampLength(0.01, 0.06);

        const direction = this.velocity.clone().normalize();
        this.group.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;
        
        // Latido del aura (accediendo directamente a la propiedad de la clase)
        if(this.glowSprite) {
            this.glowSprite.scale.setScalar(8 + Math.sin(time * 5 + this.phase) * 0.4);
        }

        this.group.position.y += Math.sin(time * 2 + this.phase) * 0.005;
    }

    capture() {
        scene.remove(this.group);
        const index = fireflies.indexOf(this);
        if (index > -1) fireflies.splice(index, 1);
        const now = new Date();
        capturedMemories.push({
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        caughtCount++;
        document.getElementById('jar-count').innerText = caughtCount;
        showToast();
    }
}

export function initGarden() {
    scene = new THREE.Scene();
    injectUI();
    const texLab = new THREE.TextureLoader();
    texLab.load('./assets/textures/jardin-fondo.webp', (t) => { scene.background = t; });

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
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
        for (let i = 0; i < fireflies.length; i++) {
            if (fireflies[i]) fireflies[i].update(time);
        }
        if (controls && controls.enabled) controls.update();
        renderer.render(scene, camera);
    }
    animate();
}
