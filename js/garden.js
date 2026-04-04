import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const fireflies = [];
const loader = new GLTFLoader();
let fireflyModel = null;
let caughtCount = 0;
let isCaptureMode = false;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- COLOR CLAVE: VERDE LIMA (#ccff00) ---
const LIME_COLOR = 0xccff00; // Para Three.js hexadecimal
const LIME_COLOR_CSS = '#ccff00'; // Para CSS

// --- 1. ESTILOS E INTERFAZ ---
function injectUI() {
    const styles = `
        /* Interfaz del Jardín */
        .game-ui { position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 15px; z-index: 100; pointer-events: auto; }
        .ui-btn { background: rgba(0,0,0,0.6); border: 1.5px solid ${LIME_COLOR_CSS}; border-radius: 12px; padding: 10px; cursor: pointer; transition: 0.3s; backdrop-filter: blur(5px); }
        .ui-btn img { width: 50px; height: 50px; display: block; }
        .ui-btn.active { background: rgba(204, 255, 0, 0.4); box-shadow: 0 0 20px ${LIME_COLOR_CSS}; transform: scale(1.1); }
        .count-badge { position: absolute; top: -5px; right: -5px; background: ${LIME_COLOR_CSS}; color: black; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }

        /* Vista de Inventario */
        .inventory-overlay { position: fixed; inset: 0; background: #020205; z-index: 2000; display: none; flex-direction: column; align-items: center; justify-content: center; color: ${LIME_COLOR_CSS}; font-family: sans-serif; }
        .inventory-overlay.active { display: flex; }
        .back-btn { background: none; border: 1px solid ${LIME_COLOR_CSS}; color: ${LIME_COLOR_CSS}; border-radius: 50px; padding: 8px 20px; cursor: pointer; margin-bottom: 40px; transition: 0.2s; }
        .back-btn:hover { background: rgba(204, 255, 0, 0.1); }
        
        .memories-grid { display: grid; grid-template-columns: repeat(auto-fill, 160px); gap: 20px; justify-content: center; width: 80%; }
        .memory-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .card-jar { width: 60px; margin-bottom: 15px; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Botones del Jardín
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

    // Eventos
    document.getElementById('net-btn').onclick = (e) => {
        isCaptureMode = !isCaptureMode;
        e.currentTarget.classList.toggle('active', isCaptureMode);
        controls.enabled = !isCaptureMode; 
        document.body.style.cursor = isCaptureMode ? 'crosshair' : 'default';
    };

    document.getElementById('jar-btn').onclick = openInventory;

    // Overlay de Inventario
    const overlay = document.createElement('div');
    overlay.className = 'inventory-overlay';
    overlay.id = 'inv-overlay';
    overlay.innerHTML = `
        <button class="back-btn" onclick="document.getElementById('inv-overlay').classList.remove('active')">← Volver al Jardín</button>
        <div style="text-align:center; margin-bottom:40px;">
            <h2 style="margin:0; font-weight: bold; letter-spacing: 1px;">Mis Luces Guardadas</h2>
            <p id="inv-status" style="font-size: 14px; opacity: 0.8;">Has atrapado 0 recuerdos</p>
        </div>
        <div class="memories-grid" id="memories-grid"></div>
    `;
    document.body.appendChild(overlay);
}

function openInventory() {
    const grid = document.getElementById('memories-grid');
    grid.innerHTML = '';
    document.getElementById('inv-status').innerText = `Has atrapado ${caughtCount} recuerdos`;
    const countToShow = caughtCount === 0 ? 1 : caughtCount;
    for(let i=0; i<countToShow; i++) {
        grid.innerHTML += `
            <div class="memory-card">
                <img src="./assets/images/jar-item.png" class="card-jar">
                <p style="font-size:14px; font-weight:bold; margin:5px 0; color: ${LIME_COLOR_CSS};">${caughtCount === 0 ? '17 de marzo' : 'Recuerdo de luz'}</p>
                <p style="font-size:11px; opacity:0.6; color: ${LIME_COLOR_CSS};">Guardado</p>
            </div>`;
    }
    document.getElementById('inv-overlay').classList.add('active');
}

// --- 2. LÓGICA 3D ---
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, '#fff'); // Centro blanco
    grad.addColorStop(0.3, '#ccff00'); // --- CAMBIO A VERDE LIMA ---
    grad.addColorStop(1, '#000'); // Borde negro transparente
    ctx.fillStyle = grad; ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(canvas);
}
const glowTex = createGlowTexture();

class Firefly {
    constructor(model, x, y, z) {
        this.group = new THREE.Group(); 
        this.mesh = model.clone();
        this.mesh.scale.set(0.15, 0.15, 0.15);
        this.group.add(this.mesh);
        
        this.group.position.set(x, y, z);
        this.phase = Math.random() * Math.PI * 2;
        this.velocity = new THREE.Vector3((Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04);
        
        this.group.userData = { isFirefly: true, parentRef: this };

        this.mesh.traverse(child => {
            if(child.isMesh) {
                child.userData = { isFirefly: true, parentRef: this };
                if(child.name.toLowerCase().includes("luz") || child.material.name.includes("004")) {
                    // --- CAMBIO A VERDE LIMA (#ccff00) ---
                    child.material = new THREE.MeshBasicMaterial({ color: LIME_COLOR }); 
                    
                    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
                        map: glowTex, 
                        color: LIME_COLOR, // --- CAMBIO A VERDE LIMA ---
                        transparent: true, 
                        blending: THREE.AdditiveBlending, 
                        depthWrite: false 
                    }));
                    sprite.scale.set(10, 10, 1);
                    child.add(sprite);
                    this.glow = sprite;
                } else {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x010101 });
                }
            }
        });
        scene.add(this.group);
    }

    update(time) {
        this.group.position.add(this.velocity);
        this.velocity.x += Math.sin(time * 0.4 + this.phase) * 0.001;
        this.velocity.y += Math.cos(time * 0.5 + this.phase) * 0.001;
        this.velocity.z += Math.sin(time * 0.3 + this.phase) * 0.001;
        this.velocity.clampLength(0.01, 0.06);
        this.group.rotation.y = Math.atan2(this.velocity.x, this.velocity.z) + Math.PI;

        const pulse = Math.pow((Math.sin(time * 3 + this.phase) + 1) / 2, 4);
        if(this.glow) {
            this.glow.material.opacity = 0.3 + pulse * 0.7;
            this.glow.scale.set(7 + pulse * 10, 7 + pulse * 10, 1);
        }
    }

    capture() {
        scene.remove(this.group);
        const index = fireflies.indexOf(this);
        if (index > -1) fireflies.splice(index, 1);
        caughtCount++;
        document.getElementById('jar-count').innerText = caughtCount;
        console.log("¡Cazada!");
    }
}

function onMouseDown(event) {
    if (!isCaptureMode) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        let target = null;
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            while (obj) {
                if (obj.userData && obj.userData.isFirefly) { target = obj.userData.parentRef; break; }
                obj = obj.parent;
            }
            if (target) break;
        }
        if (target) target.capture();
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        for(let i=0; i<15; i++) {
            fireflies.push(new Firefly(fireflyModel, (Math.random()-0.5)*15, Math.random()*5+1, (Math.random()-0.5)*10));
        }
    });

    window.addEventListener('click', onMouseDown);
    
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;
        fireflies.forEach(f => f.update(time));
        if(controls && controls.enabled) controls.update();
        renderer.render(scene, camera);
    }
    animate();
}
