// ==============================================================================
// 1. CONFIGURACIÓN DEL CANVAS Y CENTRO DE PANTALLA
// ==============================================================================
const canvas = document.getElementById('lienzo3D');
const ctx = canvas.getContext('2d');
const CENTRO_X = canvas.width / 2;
const CENTRO_Y = canvas.height / 2;

// Variables de control de animación
let autoRotando = false;
let animId = null;

// ==============================================================================
// 2. PARTE 1: DEFINICIÓN DE GEOMETRÍAS Y ARISTAS (NUEVAS PRIMITIVAS)
// ==============================================================================
const figuras = {
    cubo: {
        vertices: [
            {x: -80, y: -80, z: -80}, {x:  80, y: -80, z: -80},
            {x:  80, y:  80, z: -80}, {x: -80, y:  80, z: -80},
            {x: -80, y: -80, z:  80}, {x:  80, y: -80, z:  80},
            {x:  80, y:  80, z:  80}, {x: -80, y:  80, z:  80}
        ],
        aristas: [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ]
    },
    // Opción A: Pirámide de base cuadrada (5 vértices, 8 aristas)
    piramide: {
        vertices: [
            {x: -80, y: -60, z: -80}, // V0: Base Trasera Izq
            {x:  80, y: -60, z: -80}, // V1: Base Trasera Der
            {x:  80, y: -60, z:  80}, // V2: Base Frontal Der
            {x: -80, y: -60, z:  80}, // V3: Base Frontal Izq
            {x:   0, y:  90, z:   0}  // V4: Cúspide
        ],
        aristas: [
            // Base cuadrada
            [0, 1], [1, 2], [2, 3], [3, 0],
            // Aristas que conectan la cúspide
            [0, 4], [1, 4], [2, 4], [3, 4]
        ]
    },
    // Opción B: Prisma triangular (6 vértices, 9 aristas)
    prisma: {
        vertices: [
            // Triángulo Trasero (Z = -80)
            {x:   0, y:  80, z: -80}, // V0: Superior
            {x: -70, y: -60, z: -80}, // V1: Inferior Izq
            {x:  70, y: -60, z: -80}, // V2: Inferior Der
            // Triángulo Frontal (Z = 80)
            {x:   0, y:  80, z:  80}, // V3: Superior
            {x: -70, y: -60, z:  80}, // V4: Inferior Izq
            {x:  70, y: -60, z:  80}  // V5: Inferior Der
        ],
        aristas: [
            // Cara Trasera
            [0, 1], [1, 2], [2, 0],
            // Cara Frontal
            [3, 4], [4, 5], [5, 3],
            // Aristas Longitudinales
            [0, 3], [1, 4], [2, 5]
        ]
    },
    // Opción C: Octaedro (6 vértices, 12 aristas)
    octaedro: {
        vertices: [
            {x:   0, y:  100, z:    0}, // V0: Cúspide Superior
            {x:   0, y: -100, z:    0}, // V1: Cúspide Inferior
            {x: -80, y:    0, z:  -80}, // V2: Anillo - Trasero Izq
            {x:  80, y:    0, z:  -80}, // V3: Anillo - Trasero Der
            {x:  80, y:    0, z:   80}, // V4: Anillo - Frontal Der
            {x: -80, y:    0, z:   80}  // V5: Anillo - Frontal Izq
        ],
        aristas: [
            // Conexiones Pirámide Superior (V0)
            [0, 2], [0, 3], [0, 4], [0, 5],
            // Conexiones Pirámide Inferior (V1)
            [1, 2], [1, 3], [1, 4], [1, 5],
            // Anillo Central Ecuatorial
            [2, 3], [3, 4], [4, 5], [5, 2]
        ]
    }
};

// ==============================================================================
// 3. TEMA 3.3: PIPELINE DE TRANSFORMACIONES TRIDIMENSIONALES
// ==============================================================================
function transformarVertice3D(v, params) {
    let { tx, ty, tz, sx, sy, sz, rx, ry, rz, shxy, shxz } = params;

    let radX = rx * Math.PI / 180;
    let radY = ry * Math.PI / 180;
    let radZ = rz * Math.PI / 180;

    // --- 3.3.2 ESCALAMIENTO ---
    let x1 = v.x * sx;
    let y1 = v.y * sy;
    let z1 = v.z * sz;

    // --- 3.3.4 SESGADO / SHEAR ---
    let x2 = x1 + (shxy * y1) + (shxz * z1);
    let y2 = y1;
    let z2 = z1;

    // --- 3.3.3 ROTACIONES (X, Y, Z) ---
    let x3 = x2;
    let y3 = y2 * Math.cos(radX) - z2 * Math.sin(radX);
    let z3 = y2 * Math.sin(radX) + z2 * Math.cos(radX);

    let x4 = x3 * Math.cos(radY) + z3 * Math.sin(radY);
    let y4 = y3;
    let z4 = -x3 * Math.sin(radY) + z3 * Math.cos(radY);

    let x5 = x4 * Math.cos(radZ) - y4 * Math.sin(radZ);
    let y5 = x4 * Math.sin(radZ) + y4 * Math.cos(radZ);
    let z5 = z4;

    // --- 3.3.1 TRASLACIÓN ---
    let xFinal = x5 + tx;
    let yFinal = y5 + ty;
    let zFinal = z5 + tz;

    return { x: xFinal, y: yFinal, z: zFinal };
}

// ==============================================================================
// 4. TEMA 3.1: PROYECCIÓN PERSPECTIVA (3D A PANTALLA 2D)
// ==============================================================================
function proyectar3Da2D(v3d) {
    const distanciaCamara = 500;
    
    let zAjustado = v3d.z + distanciaCamara;
    if (zAjustado < 1) zAjustado = 1;

    let factorProyeccion = distanciaCamara / zAjustado;

    let x2d = CENTRO_X + (v3d.x * factorProyeccion);
    let y2d = CENTRO_Y - (v3d.y * factorProyeccion);

    return { x: x2d, y: y2d };
}

// ==============================================================================
// 5. PARTE 3 Y BUCLE DE RENDERIZADO (PERSONALIZACIÓN DE ESTILO)
// ==============================================================================
function renderizar() {
    const params = {
        tx: parseFloat(document.getElementById('tx').value),
        ty: parseFloat(document.getElementById('ty').value),
        tz: parseFloat(document.getElementById('tz').value),
        sx: parseFloat(document.getElementById('sx').value),
        sy: parseFloat(document.getElementById('sy').value),
        sz: parseFloat(document.getElementById('sz').value),
        rx: parseFloat(document.getElementById('rx').value),
        ry: parseFloat(document.getElementById('ry').value),
        rz: parseFloat(document.getElementById('rz').value),
        shxy: parseFloat(document.getElementById('shxy').value),
        shxz: parseFloat(document.getElementById('shxz').value)
    };

    // Actualizar labels
    document.getElementById('valTx').innerText = params.tx;
    document.getElementById('valTy').innerText = params.ty;
    document.getElementById('valTz').innerText = params.tz;
    document.getElementById('valSx').innerText = params.sx.toFixed(1);
    document.getElementById('valSy').innerText = params.sy.toFixed(1);
    document.getElementById('valSz').innerText = params.sz.toFixed(1);
    document.getElementById('valRx').innerText = Math.round(params.rx) + '°';
    document.getElementById('valRy').innerText = Math.round(params.ry) + '°';
    document.getElementById('valRz').innerText = Math.round(params.rz) + '°';
    document.getElementById('valShXY').innerText = params.shxy.toFixed(1);
    document.getElementById('valShXZ').innerText = params.shxz.toFixed(1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ejes cartesianos guía
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CENTRO_X, 0); ctx.lineTo(CENTRO_X, canvas.height);
    ctx.moveTo(0, CENTRO_Y); ctx.lineTo(canvas.width, CENTRO_Y);
    ctx.stroke();

    // Obtener figura seleccionada
    const nombreFigura = document.getElementById('figuraSelect').value;
    const figuraActual = figuras[nombreFigura];

    // Pipeline
    let verticesTransformados = figuraActual.vertices.map(v => transformarVertice3D(v, params));
    let vertices2D = verticesTransformados.map(proyectar3Da2D);

    // PARTE 3: Grosor adaptativo según el promedio de la escala (Sx, Sy, Sz)
    let escalaPromedio = (params.sx + params.sy + params.sz) / 3;
    let grosorLinea = Math.max(1.5, 2.5 * escalaPromedio);

    // Renderizar aristas (Paleta Neón: Violeta / Purpura)
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = grosorLinea;
    for (let arista of figuraActual.aristas) {
        let p1 = vertices2D[arista[0]];
        let p2 = vertices2D[arista[1]];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    // Renderizar vértices (Paleta Neón: Verde Esmeralda Bright)
    ctx.fillStyle = '#10b981';
    for (let p of vertices2D) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#064e3b';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// ==============================================================================
// RETO: AUTO-ROTACIÓN CONTINUA (requestAnimationFrame)
// ==============================================================================
function animar() {
    if (!autoRotando) return;

    let sliderRy = document.getElementById('ry');
    let nuevoValor = parseFloat(sliderRy.value) + 1.5;

    if (nuevoValor > 180) nuevoValor = -180;
    sliderRy.value = nuevoValor;

    renderizar();
    animId = requestAnimationFrame(animar);
}

const btnAutoRotar = document.getElementById('btnAutoRotar');
btnAutoRotar.addEventListener('click', () => {
    autoRotando = !autoRotando;
    if (autoRotando) {
        btnAutoRotar.innerText = '⏸ Pausar Auto-Rotación';
        btnAutoRotar.classList.add('activo');
        animar();
    } else {
        btnAutoRotar.innerText = '▶ Iniciar Auto-Rotación (Yaw)';
        btnAutoRotar.classList.remove('activo');
        cancelAnimationFrame(animId);
    }
});

// Event Listeners
document.querySelectorAll('input[type=range], select').forEach(elem => {
    elem.addEventListener('input', () => {
        renderizar();
    });
});

renderizar();