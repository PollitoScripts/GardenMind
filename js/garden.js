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

// --- 1. CONFIGURACIÓN DE UI (Jardín e Inventario) ---
function createUI() {
    // Inyectamos los estilos CSS primero
    injectUIStyles();

    // Contenedor principal de botones en el jardín
    const container = document.createElement('div');
    container.className = 'game-ui';
    container.id = 'garden-ui-buttons';

    // Botón RED (Activar Captura)
    const btnNet = document.createElement('button');
    btnNet.className = 'ui-btn';
    btnNet.id = 'net-btn';
    btnNet.title = 'Capturar Recuerdo Diario';
    btnNet.innerHTML = `<img src="./assets/images/net-icon.png">`;
    btnNet.onclick = () => {
        isCaptureMode = !isCaptureMode;
        btnNet.classList.toggle('active', isCaptureMode);
        document.body.style.cursor = isCaptureMode ? 'crosshair' : 'default';
    };

    // Botón TARRO (Abrir Inventario)
    const btnJar = document.createElement('button');
    btnJar.className = 'ui-btn';
    btnJar.id = 'jar-btn';
    btnJar.title = 'Mis Luces Guardadas';
    btnJar.innerHTML = `
        <img src="./assets/images/jar-item.png">
        <div id="jar-count" class="count-badge">0</div>
    `;
    btnJar.onclick = () => {
        // Al pulsar el tarro, abrimos la vista de inventario
        openInventoryView();
    };

    container.appendChild(btnNet);
    container.appendChild(btnJar);
    document.body.appendChild(container);

    // Creamos la estructura HTML del inventario (oculta al inicio)
    createInventoryHTML();
}

// Inyectamos todos los estilos CSS necesarios para replicar la captura
function injectUIStyles() {
    const styles = `
        /* --- ESTILOS GENERALES Y NOCTURNOS --- */
        body { margin: 0; padding: 0; overflow: hidden; background: none; }
        
        /* --- UI DEL JARDÍN (Botones Flotantes) --- */
        .game-ui { position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 15px; z-index: 100; transition: opacity 0.3s ease; }
        .ui-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; cursor: pointer; transition: 0.3s; backdrop-filter: blur(5px); }
        .ui-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .ui-btn.active { border-color: #ffd700; box-shadow: 0 0 15px rgba(255, 215, 0, 0.4); background: rgba(255, 215, 0, 0.1); }
        .ui-btn img { width: 60px; height: 60px; display: block; }
        .count-badge { position: absolute; top: -5px; right: -5px; background: #ffd700; color: black; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: sans-serif; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }

        /* --- VISTA DE INVENTARIO (REPLICANDO TU CAPTURA) --- */
        .inventory-overlay {
            position: fixed;
            inset: 0;
            background-color: #020205; /* Fondo oscuro exacto */
            z-index: 2000; /* Por encima de todo */
            display: none; /* Oculto al inicio */
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #ffd700; /* Amarillo dorado general */
            font-family: Arial, sans-serif;
            transition: opacity 0.5s ease;
        }

        .inventory-overlay.active {
            display: flex;
            opacity: 1;
        }

        /* Botón de volver amarillo y fino */
        .back-btn {
            background: none;
            border: 1px solid #ffd700;
            color: #ffd700;
            border-radius: 50px;
            padding: 8px 18px;
            font-size: 14px;
            cursor: pointer;
            margin-bottom: 30px;
            transition: 0.2s;
        }
        .back-btn:hover { background-color: rgba(255, 215, 0, 0.1); }

        /* Texto de cabecera amarillo */
        .header-text { text-align: center; margin-bottom: 60px; font-weight: normal; }
        .header-main { font-size: 20px; font-weight: bold; margin: 0; }
        .header-sub { font-size: 16px; margin: 5px 0 0 0; font-weight: lighter; color: rgba(255, 215, 0, 0.8); }

        /* Tarjeta del Recuerdo */
        .memory-card {
            background-color: rgba(255, 255, 255, 0.03); /* Fondo muy sutil */
            border: 1px solid rgba(255, 255, 255, 0.05); /* Borde casi invisible */
            border-radius: 12px;
            width: 140px; /* Tamaño de la tarjeta */
            height: 200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }

        /* El tarro dentro de la tarjeta */
        .card-jar { width: 70px; margin-bottom: 20px; }

        /* Texto de fecha amarillo */
        .card-date { font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: #ffd700; }

        /* Texto de nota más pequeño y amarillo sutil */
        .card-note { font-size: 11px; margin: 0; font-weight: lighter; color: rgba(255, 215, 0, 0.6); }

        /* Grid para las tarjetas (si hay más recuerdos) */
        .memories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, 180px); /* Tamaño tarjeta + gap */
            gap: 20px;
            justify-content: center;
            max-width: 900px;
            width: 900px;
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

// Creamos la estructura HTML del inventario replicando tu captura
function createInventoryHTML() {
    const overlay = document.createElement('div');
    overlay.className = 'inventory-overlay';
    overlay.id = 'inventory-overlay-view';

    // 1. Botón Volver
    const btnBack = document.createElement('button');
    btnBack.className = 'back-btn';
    btnBack.innerText = '← Volver al Jardín';
    btnBack.onclick = closeInventoryView;
    overlay.appendChild(btnBack);

    // 2. Cabecera (Replicando el texto amarillo)
    const header = document.createElement('div');
    header.className = 'header-text';
    header.innerHTML = `
        <h1 class="header-main">Mis Luces Guardadas</h1>
        <p class="header-sub" id="inventory-caught-count">Has atrapado ${caughtCount} recuerdos</p>
    `;
    overlay.appendChild(header);

    // 3. Grid para las tarjetas de recuerdo
    const grid = document.createElement('div');
    grid.className = 'memories-grid';
    grid.id = 'memories-card-grid';

    // Generamos las tarjetas (inicialmente si caughtCount > 0, si no, generamos una de prueba como la captura)
    renderInventoryMemories(grid);

    overlay.appendChild(grid);
    document.body.appendChild(overlay);
}

// Genera las tarjetas dinámicamente basadas en los recuerdos capturados
function renderInventoryMemories(grid) {
    grid.innerHTML = ''; // Limpiamos primero

    if (caughtCount === 0) {
        // Generamos la tarjeta de ejemplo para que la UI no se vea vacía, como en tu captura
        const exampleCard = createMemoryCardHTML("17 de marzo de 2026", "Recuerdo de luz");
        grid.appendChild(exampleCard);
    } else {
        // Generamos una tarjeta por cada recuerdo capturado (para que tú lo vincules luego)
        // Por ahora, generamos caughtCount tarjetas genéricas para poblar la vista
        for (let i = 0; i < caughtCount; i++) {
            const dateStr = `Recuerdo #${i + 1}`;
            const card = createMemoryCardHTML(dateStr, "Guardado en el jardín.");
            grid.appendChild(card);
        }
    }
}

// Crea una tarjeta de recuerdo individual
function createMemoryCardHTML(date, note) {
    const card = document.createElement('div');
    card.className = 'memory-card';

    // Imagen del tarro (usamos el mismo jar-item.png, o un .gif si prefieres)
    const imgJar = document.createElement('img');
    imgJar.src = './assets/images/jar-item.png'; 
    imgJar.className = 'card-jar';
    card.appendChild(imgJar);

    // Fecha Amarilla
    const cardDate = document.createElement('p');
    cardDate.className = 'card-date';
    cardDate.innerText = date;
    cardDate.style.wordWrap = 'break-word'; // Para textos largos
    card.appendChild(cardDate);

    // Nota Amarilla Sutil
    const cardNote = document.createElement('p');
    cardNote.className = 'card-note';
    cardNote.innerText = note;
    card.appendChild(cardNote);

    return card;
}

// Función para abrir el inventario
function openInventoryView() {
    console.log("Abriendo inventario...");
    const overlay = document.getElementById('inventory-overlay-view');
    const gardenUI = document.getElementById('garden-ui-buttons');
    const grid = document.getElementById('memories-card-grid');
    
    if (overlay && gardenUI && grid) {
        // Actualizamos el contador de la cabecera
        document.getElementById('inventory-caught-count').innerText = `Has atrapado ${caughtCount} recuerdos`;
        
        // Re-renderizamos las tarjetas con los datos actuales
        renderInventoryMemories(grid);

        overlay.classList.add('active'); // Muestra el inventario
        gardenUI.style.opacity = '0'; // Oculta botones jardín
        gardenUI.style.pointerEvents = 'none'; // Desactiva clicks jardín
        
        // Desactivamos el renderizado 3D para ahorrar recursos (Opcional)
        // controls.enabled = false;
        // cancelAnimationFrame(requestAnimationFrame(animate)); 
    }
}

// Función para cerrar el inventario y volver al jardín
function closeInventoryView() {
    console.log("Cerrando inventario...");
    const overlay = document.getElementById('inventory-overlay-view');
    const gardenUI = document.getElementById('garden-ui-buttons');
    
    if (overlay && gardenUI) {
        overlay.classList.remove('active'); // Oculta inventario
        gardenUI.style.opacity = '1'; // Muestra botones jardín
        gardenUI.style.pointerEvents = 'auto'; // Activa clicks jardín
        
        // Reactivamos renderizado 3D
        // controls.enabled = true;
        // animate();
    }
}

// --- 2. CLASE FIREFLY (Captura y Detección) ---
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'white'); grad.addColorStop(0.4, '#ffd700'); // Color Lima/Dorado
    grad.addColorStop(1, 'black');
    ctx.fillStyle = grad; ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(canvas);
}
const glowTex = createGlowTexture();

class Firefly {
    constructor(model, x, y, z) {
        this.mesh = model.clone();
        this.mesh.position.set(x, y, z);
        this.mesh.scale.set(0.15, 0.15, 0.15);
        this.phase = Math.random() * Math.PI * 2;
        this.velocity = new THREE.Vector3((Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04);
        
        // Etiqueta para que el Raycaster la reconozca
        this.mesh.userData = { isFirefly: true, parentRef: this };

        this.mesh.traverse(child => {
            if(child.isMesh) {
                child.userData = { isFirefly: true, parentRef: this }; 
                if(child.name.toLowerCase().includes("luz") || child.material.name.includes("004")) {
                    child.material = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Color Lima/Dorado
                    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd700, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
                    sprite.scale.set(10, 10, 1);
                    child.add(sprite);
                    this.glow = sprite;
                } else {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x010101 });
                }
            }
        });
        scene.add(this.mesh);
    }

    update(time) {
        this.mesh.position.add(this.velocity);
        this.velocity.x += Math.sin(time * 0.4 + this.phase) * 0.001;
        this.velocity.y += Math.cos(time * 0.5 + this.phase) * 0.001;
        this.velocity.z += Math.sin(time * 0.3 + this.phase) * 0.001;
        this.velocity.clampLength(0.01, 0.06);
        this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z) + Math.PI;

        const pulse = Math.pow((Math.sin(time * 3 + this.phase) + 1) / 2, 4);
        if(this.glow) {
            this.glow.material.opacity = 0.3 + pulse * 0.7;
            this.glow.scale.set(7 + pulse * 10, 7 + pulse * 10, 1);
        }
    }

    // Mecánica de Captura
    capture() {
        console.log("¡Capturada!");
        scene.remove(this.mesh);
        const index = fireflies.indexOf(this);
        if (index > -1) fireflies.splice(index, 1);
        
        // Sumamos al contador global y actualizamos el tarro en el jardín
        caughtCount++;
        document.getElementById('jar-count').innerText = caughtCount;
        
        // Feedback visual o sonoro si quieres
    }
}

// --- 3. DETECCIÓN DE CLICKS (RAYCASTER) ---
function onDocumentMouseDown(event) {
    if (!isCaptureMode) return;

    // Calculamos posición del ratón en coordenadas normalizadas
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Lanzamos el rayo desde la cámara al ratón
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        // Si tocamos algo etiquetado como luciérnaga
        if (object.userData.isFirefly) {
            // Llamamos a la captura del bicho
            object.userData.parentRef.capture();
        }
    }
}

// --- 4. MOTOR PRINCIPAL (Init) ---
export function initGarden() {
    scene = new THREE.Scene();
    
    // Configuración de la UI (Crea los botones y la vista de inventario)
    createUI();

    const texLab = new THREE.TextureLoader();
    texLab.load('./assets/textures/jardin-fondo.webp', (t) => scene.background = t);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('app-canvas').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Cargamos el modelo original
    loader.load('./assets/models/test3.glb', (gltf) => {
        fireflyModel = gltf.scene;
        // Spawneamos luciérnagas iniciales
        for(let i=0; i<15; i++) {
            fireflies.push(new Firefly(fireflyModel, (Math.random()-0.5)*15, Math.random()*5+1, (Math.random()-0.5)*10));
        }
    });

    // Escuchamos el click para la captura
    window.addEventListener('mousedown', onDocumentMouseDown);
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    fireflies.forEach(f => f.update(time));
    if(controls) controls.update();
    renderer.render(scene, camera);
}
