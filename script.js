/* ESTRELLAS DE FONDO 2D MÁS BRILLANTES */
const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");

let stars = [];

function crearEstrellas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = [];

    for (let i = 0; i < 240; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2.5 + 0.5,
            opacity: Math.random()
        });
    }
}

function dibujarEstrellas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.shadowColor = "#ff99dd";
        ctx.shadowBlur = 9;
        ctx.fillStyle = `rgba(255, 232, 246, ${star.opacity})`;
        ctx.fill();

        star.opacity += (Math.random() - 0.5) * 0.03;
        star.opacity = Math.max(0.25, Math.min(1, star.opacity));
    });

    requestAnimationFrame(dibujarEstrellas);
}

crearEstrellas();
dibujarEstrellas();

/* GALAXIA 3D INTERACTIVA CON CORAZÓN ROSA/ROJO, PALABRAS, IMÁGENES Y ZOOM */
let scene, camera, renderer, universeGroup, heartPoints, galaxyPoints;
const orbitingWords = [];
const orbitingImages = [];
let galaxyInitialized = false;

// Control táctil / mouse para girar en 3D
let isDragging = false;
let prevX = 0;
let prevY = 0;
let targetRotX = 0.14;
let targetRotY = 0;

// Control para acercar y alejar (zoom)
let targetZoom = 27;
const MIN_ZOOM = 13;
const MAX_ZOOM = 60;
let lastPinchDist = null;

const FRASES_BONITAS = [
    "Te amo ❤️",
    "Mi niña hermosa 💗",
    "Eres mi universo ✨",
    "Mi lugar favorito ❤️",
    "Siempre tú 💕",
    "Mi amor 🌙",
    "Mi persona favorita 💞",
    "Por muchos meses más ❤️",
    "Mi Stephani 🌷",
    "Me encantas 💖",
    "Eres magia ✨",
    "Contigo todo es mejor 🫶",
    "Mi chiquita linda 🌹",
    "Mi corazón es tuyo 💓",
    "Gracias por existir 🌸",
    "Juntos por siempre ∞",
    "Mi paz 🕊️",
    "Mi sonrisa favorita 😊",
    "Eres un sueño 💫",
    "Te elijo hoy y siempre ❤️",
    "Mi dulce amor 🍓",
    "Cada día me gustas más 💘",
    "Mi estrella ⭐",
    "Eres lo más bonito 🌷",
    "Mi compañera 💕",
    "Amor de mi vida ❤️",
    "Qué bonito es quererte 💗",
    "Mi destino ✨",
    "Solo tú 💞",
    "Mi felicidad 🌻",
    "Todo contigo 💖",
    "Para ti, Stephani ❤️"
];

// Soporta tanto nombres sin repetir extensión como .png.png en tu carpeta imagenes/
const GRUPOS_IMAGENES = [
    ["snoopy.png", "snoopy.png.png"],
    ["woodstock.png", "woodstock.png.png"],
    ["snoopy-corazon.png", "snoopy-corazon.png.png"]
];

function createGlowDotTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d");

    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.28, "rgba(255, 200, 235, 0.95)");
    grad.addColorStop(0.65, "rgba(255, 70, 150, 0.42)");
    grad.addColorStop(1, "rgba(255, 0, 100, 0)");

    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
}

function loadLocalImageTexture(candidates, onReady) {
    const carpetas = ["imagenes/", "imágenes/", ""];
    const rutas = [];

    carpetas.forEach(carpeta => {
        candidates.forEach(archivo => {
            rutas.push(carpeta + archivo);
        });
    });

    let idx = 0;

    function tryNext() {
        if (idx >= rutas.length) return;
        const img = new Image();
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = 256;
            c.height = 256;
            const g = c.getContext("2d");
            g.shadowColor = "#ff85c8";
            g.shadowBlur = 20;
            g.drawImage(img, 18, 18, 220, 220);

            const tex = new THREE.CanvasTexture(c);
            tex.needsUpdate = true;
            onReady(tex);
        };
        img.onerror = () => {
            idx++;
            tryNext();
        };
        img.src = rutas[idx];
    }

    tryNext();
}

function createTextSprite(text, colorHex) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d");

    g.font = "bold 40px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = colorHex;
    g.shadowBlur = 26;
    g.fillStyle = "#ffffff";
    g.fillText(text, c.width / 2, c.height / 2);
    g.fillText(text, c.width / 2, c.height / 2);

    const texture = new THREE.CanvasTexture(c);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 1,
        depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(9.2, 2.3, 1);
    return sprite;
}

function initGalaxy() {
    if (galaxyInitialized || typeof THREE === "undefined") return;
    galaxyInitialized = true;

    const container = document.getElementById("galaxy-container");
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = targetZoom;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    universeGroup = new THREE.Group();
    universeGroup.rotation.x = targetRotX;
    scene.add(universeGroup);

    const glowTexture = createGlowDotTexture();

    // 1. Corazón de partículas ROSAS y ROJAS más grande y brillante
    const heartCount = 6600;
    const heartPositions = new Float32Array(heartCount * 3);
    const heartColors = new Float32Array(heartCount * 3);

    const redBright = new THREE.Color("#ff1744");
    const roseNeon = new THREE.Color("#ff4da6");
    const pinkGlow = new THREE.Color("#ffcce6");

    for (let i = 0; i < heartCount; i++) {
        const t = Math.random() * Math.PI * 2;
        const rScale = Math.pow(Math.random(), 0.42);
        const zFactor = Math.sqrt(Math.max(0, 1 - rScale * rScale * 0.65));
        const depth = (Math.random() - 0.5) * 9.5 * zFactor;

        const scaleHeart = 0.76;
        const x = 16 * Math.pow(Math.sin(t), 3) * scaleHeart * rScale;
        const y = (
            13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t)
        ) * scaleHeart * rScale;
        const z = depth;

        heartPositions[i * 3] = x;
        heartPositions[i * 3 + 1] = y + 1.5;
        heartPositions[i * 3 + 2] = z;

        const mixVal = Math.random();
        let c;
        if (mixVal < 0.38) {
            c = redBright.clone().lerp(roseNeon, Math.random());
        } else if (mixVal < 0.78) {
            c = roseNeon.clone().lerp(pinkGlow, Math.random() * 0.85);
        } else {
            c = pinkGlow.clone();
        }

        heartColors[i * 3] = c.r;
        heartColors[i * 3 + 1] = c.g;
        heartColors[i * 3 + 2] = c.b;
    }

    const heartGeometry = new THREE.BufferGeometry();
    heartGeometry.setAttribute("position", new THREE.BufferAttribute(heartPositions, 3));
    heartGeometry.setAttribute("color", new THREE.BufferAttribute(heartColors, 3));

    const heartMaterial = new THREE.PointsMaterial({
        size: 0.8,
        map: glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    heartPoints = new THREE.Points(heartGeometry, heartMaterial);
    universeGroup.add(heartPoints);

    // 2. Espiral galáctica brillante alrededor
    const galaxyCount = 5200;
    const galaxyPositions = new Float32Array(galaxyCount * 3);
    const galaxyColors = new Float32Array(galaxyCount * 3);

    const galPink = new THREE.Color("#ff80cc");
    const galMagenta = new THREE.Color("#b84dff");

    for (let i = 0; i < galaxyCount; i++) {
        const radius = Math.random() * 28 + 7.5;
        const branchAngle = ((i % 4) / 4) * Math.PI * 2;
        const spinAngle = radius * 0.24;

        const rx = (Math.random() - 0.5) * 2.5;
        const ry = (Math.random() - 0.5) * 1.6;
        const rz = (Math.random() - 0.5) * 2.5;

        const angle = branchAngle + spinAngle;

        galaxyPositions[i * 3] = Math.cos(angle) * radius + rx;
        galaxyPositions[i * 3 + 1] = ry - 1.2;
        galaxyPositions[i * 3 + 2] = Math.sin(angle) * radius + rz;

        const gc = galPink.clone().lerp(galMagenta, (radius - 7.5) / 28);
        galaxyColors[i * 3] = gc.r;
        galaxyColors[i * 3 + 1] = gc.g;
        galaxyColors[i * 3 + 2] = gc.b;
    }

    const galaxyGeometry = new THREE.BufferGeometry();
    galaxyGeometry.setAttribute("position", new THREE.BufferAttribute(galaxyPositions, 3));
    galaxyGeometry.setAttribute("color", new THREE.BufferAttribute(galaxyColors, 3));

    const galaxyMaterial = new THREE.PointsMaterial({
        size: 0.6,
        map: glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.94,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    galaxyPoints = new THREE.Points(galaxyGeometry, galaxyMaterial);
    galaxyPoints.rotation.x = 0.42;
    galaxyPoints.rotation.z = -0.18;
    universeGroup.add(galaxyPoints);

    // 3. Muchas palabras bonitas brillantes dando vueltas alrededor
    const totalWords = FRASES_BONITAS.length;
    for (let i = 0; i < totalWords; i++) {
        const phrase = FRASES_BONITAS[i];
        const glowColor = i % 2 === 0 ? "#ff2e88" : "#ff99dd";
        const sprite = createTextSprite(phrase, glowColor);

        const baseAngle = (i / totalWords) * Math.PI * 2 + (i % 4) * 0.22;
        const orbitRadius = 12.8 + (i % 4) * 2.9;
        const orbitY = ((i % 7) - 3) * 2.3;
        const speed = (i % 2 === 0 ? 1 : -1) * (0.0013 + (i % 4) * 0.0003);

        sprite.position.set(
            Math.cos(baseAngle) * orbitRadius,
            orbitY,
            Math.sin(baseAngle) * orbitRadius
        );

        universeGroup.add(sprite);
        orbitingWords.push({
            sprite,
            angle: baseAngle,
            radius: orbitRadius,
            y: orbitY,
            speed
        });
    }

    // 4. Imágenes multiplicadas dando vueltas alrededor
    GRUPOS_IMAGENES.forEach((candidates, imgIdx) => {
        loadLocalImageTexture(candidates, (texture) => {
            const copiesPerImage = 5;
            for (let c = 0; c < copiesPerImage; c++) {
                const i = imgIdx * copiesPerImage + c;
                const material = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 1,
                    depthWrite: false
                });

                const sprite = new THREE.Sprite(material);
                const isWoodstock = imgIdx === 1;
                const size = isWoodstock ? 3.2 : 4.5;
                sprite.scale.set(size, size, 1);

                const baseAngle = (i / 15) * Math.PI * 2 + c * 0.4;
                const orbitRadius = 13.5 + (c % 3) * 3.0;
                const orbitY = ((i % 5) - 2) * 2.5;
                const speed = (i % 2 === 0 ? 1 : -1) * (0.0011 + (c % 3) * 0.0003);

                sprite.position.set(
                    Math.cos(baseAngle) * orbitRadius,
                    orbitY,
                    Math.sin(baseAngle) * orbitRadius
                );

                universeGroup.add(sprite);
                orbitingImages.push({
                    sprite,
                    angle: baseAngle,
                    radius: orbitRadius,
                    y: orbitY,
                    speed
                });
            }
        });
    });

    // Arrastrar con dedo o mouse
    container.addEventListener("pointerdown", (e) => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
    });

    window.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;

        targetRotY += dx * 0.007;
        targetRotX = Math.max(-0.9, Math.min(0.9, targetRotX + dy * 0.005));
    });

    window.addEventListener("pointerup", () => {
        isDragging = false;
    });

    // Zoom con rueda del mouse
    container.addEventListener("wheel", (e) => {
        e.preventDefault();
        targetZoom += e.deltaY * 0.02;
        targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    }, { passive: false });

    // Zoom con 2 dedos en celular
    container.addEventListener("touchstart", (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDist = Math.hypot(dx, dy);
        }
    }, { passive: true });

    container.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2 && lastPinchDist !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const delta = lastPinchDist - dist;
            lastPinchDist = dist;

            targetZoom += delta * 0.08;
            targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
        }
    }, { passive: true });

    container.addEventListener("touchend", () => {
        lastPinchDist = null;
    });

    animateGalaxy();
}

let clockTime = 0;
function animateGalaxy() {
    requestAnimationFrame(animateGalaxy);
    if (!renderer || !scene || !camera || !universeGroup) return;

    clockTime += 0.01;

    camera.position.z += (targetZoom - camera.position.z) * 0.08;

    if (!isDragging) {
        targetRotY += 0.0008;
    }
    universeGroup.rotation.y += (targetRotY - universeGroup.rotation.y) * 0.06;
    universeGroup.rotation.x += (targetRotX - universeGroup.rotation.x) * 0.06;

    if (heartPoints) {
        const beat = 1 + Math.sin(clockTime * 2.2) * 0.038;
        heartPoints.scale.set(beat, beat, beat);
    }

    if (galaxyPoints) {
        galaxyPoints.rotation.y += 0.0008;
    }

    orbitingWords.forEach((item, idx) => {
        item.angle += item.speed;
        const bob = Math.sin(clockTime * 1.4 + idx) * 0.4;
        item.sprite.position.x = Math.cos(item.angle) * item.radius;
        item.sprite.position.z = Math.sin(item.angle) * item.radius;
        item.sprite.position.y = item.y + bob;
    });

    orbitingImages.forEach((item, idx) => {
        item.angle += item.speed;
        const bob = Math.cos(clockTime * 1.3 + idx) * 0.45;
        item.sprite.position.x = Math.cos(item.angle) * item.radius;
        item.sprite.position.z = Math.sin(item.angle) * item.radius;
        item.sprite.position.y = item.y + bob;
    });

    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    crearEstrellas();
    if (renderer && camera) {
        const container = document.getElementById("galaxy-container");
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
});

/* ABRIR UNIVERSO */
function abrirUniverso() {
    const inicio = document.getElementById("inicio");
    const universo = document.getElementById("universo");

    inicio.style.opacity = "0";

    setTimeout(() => {
        inicio.style.display = "none";
        universo.style.display = "flex";
        initGalaxy();
    }, 1200);
}

/* ABRIR CARTA */
function abrirCarta() {
    document.getElementById("carta").style.display = "flex";
}

/* CERRAR CARTA */
function cerrarCarta() {
    document.getElementById("carta").style.display = "none";
}