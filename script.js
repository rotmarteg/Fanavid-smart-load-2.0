/**
 * Fanavid Smart Load - Motor de Logística 3D
 * Desenvolvido para gestão de expedição e cubagem.
 */

let scene, camera, renderer, controls;
let objetosInterativos = [];
let objetoSelecionado = null;
let planoInvisivel;
let offset = new THREE.Vector3();
let cargaCarrinho = [];
const MARGEM = 1.02; // Margem de segurança de 2%

const medidasCaixas = {
    "N1": { c: 0.85, l: 0.75, h: 0.8 }, "N2": { c: 1.05, l: 0.80, h: 0.8 }, 
    "N5": { c: 1.05, l: 1.05, h: 1.0 }, "N9": { c: 1.25, l: 0.85, h: 1.0 },
    "N16": { c: 1.25, l: 1.15, h: 1.0 }, "N17": { c: 1.45, l: 1.05, h: 1.0 },
    "N18": { c: 1.45, l: 1.30, h: 1.0 }, "N19": { c: 1.65, l: 1.05, h: 1.0 },
    "N20": { c: 1.65, l: 1.45, h: 1.0 }, "N21": { c: 1.85, l: 1.05, h: 1.0 },
    "N22": { c: 1.85, l: 1.25, h: 1.0 }, "N23": { c: 2.05, l: 1.25, h: 1.0 },
    "N24": { c: 1.80, l: 0.63, h: 1.0 }, "N25": { c: 1.80, l: 0.80, h: 1.0 },
    "N14": { c: 1.70, l: 1.10, h: 1.0 }, "N8": { c: 2.50, l: 1.35, h: 1.2 },
    "N6": { c: 2.00, l: 2.00, h: 1.2 }
};

// --- INICIALIZAÇÃO ---
function init3D() {
    const container = document.getElementById('canvas-3d');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(15, 12, 15);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const light = new THREE.DirectionalLight(0xffffff, 0.6);
    light.position.set(10, 20, 10);
    scene.add(light);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    
    // Plano para auxiliar o arraste
    const planeGeo = new THREE.PlaneGeometry(200, 200);
    planoInvisivel = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ visible: false }));
    planoInvisivel.rotation.x = -Math.PI / 2;
    scene.add(planoInvisivel);

    // Eventos de Mouse/Touch
    renderer.domElement.addEventListener('pointerdown', onMouseDown, false);
    renderer.domElement.addEventListener('pointermove', onMouseMove, false);
    window.addEventListener('pointerup', onMouseUp, false);
    
    // Giro 90 graus com Botão Direito
    renderer.domElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const obj = identificarObjeto(e);
        if (obj) {
            obj.rotation.y += Math.PI / 2;
            validarCarga();
        }
    });

    animate();
}

// --- FUNÇÕES DE APOIO ---
function identificarObjeto(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objetosInterativos, true);
    if (intersects.length > 0) {
        let t = intersects[0].object;
        while (t.parent && t.type !== 'Group') t = t.parent;
        return t;
    }
    return null;
}

function criar(w, h, d, cor, tipo) {
    const mw = w * MARGEM; 
    const md = d * MARGEM; 
    const mh = h;

    const grupo = new THREE.Group();
    const geo = new THREE.BoxGeometry(mw * 0.97, mh * 0.98, md * 0.97);
    const material = new THREE.MeshPhongMaterial({ color: cor, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, material);
    
    grupo.add(mesh);
    grupo.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x333333 })));

    grupo.userData = { tipo: tipo, corOrig: cor, w: mw, d: md, h: mh };
    return { grupo, mesh };
}

// --- INTERFACE ---
function atualizarListaVisual() {
    const listaUl = document.getElementById('itens-lista');
    const containerLista = document.getElementById('lista-carregamento');
    if (!listaUl) return;
    containerLista.style.display = cargaCarrinho.length > 0 ? "block" : "none";
    listaUl.innerHTML = cargaCarrinho.map((item, i) => `
        <li style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:6px; margin-bottom:4px; border-radius:4px; font-size:11px; border-left: 4px solid #ffa000;">
            <span><strong>${item.qtd}x</strong> ${item.id}</span>
            <button onclick="window.removerItem(${i})" style="color:red; width:auto; padding:2px 5px; margin:0; font-size:10px; cursor:pointer;">X</button>
        </li>`).join('');
}

window.adicionarItem = function() {
    const id = document.getElementById('idCaixa').value;
    const qtdInput = document.getElementById('qCaixas');
    const qtd = parseInt(qtdInput.value);
    if (id && qtd > 0) {
        const med = medidasCaixas[id];
        cargaCarrinho.push({ id, qtd, c: med.c, l: med.l, h: med.h });
        atualizarListaVisual();
        window.calcularCarga();
    }
};

window.removerItem = function(i) {
    cargaCarrinho.splice(i, 1);
    atualizarListaVisual();
    window.calcularCarga();
};

// --- CÁLCULO E POSICIONAMENTO ---
window.calcularCarga = function() {
    const veiculo = document.getElementById('veiculo').value;
    const usarEmpilhamento = document.getElementById('empilhado').checked;
    let cv = 14.0, lv = 2.45, av = 2.7;

    if (veiculo === 'carreta') cv = 13.5;
    else if (veiculo === 'truck') { cv = 8.0; av = 2.6; }
    else if (veiculo === 'toco') { cv = 7.0; av = 2.5; }
    else if (veiculo === 'vlc') { cv = 5.1; av = 2.3; }

    objetosInterativos = [];
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const obj = scene.children[i];
        if (obj.isGroup || (obj.isMesh && obj !== planoInvisivel) || obj.isLineSegments) scene.remove(obj);
    }

    const bau = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(cv, av, lv)), new THREE.LineBasicMaterial({ color: 0x000000 }));
    bau.position.set(0, av/2, 0);
    scene.add(bau);

    let curX = -cv/2 + 0.1, curZ = -lv/2 + 0.1, andar = 0;

    const addFunc = (w, h, d, cor, tipo) => {
        const mw = w * MARGEM, md = d * MARGEM, mh = h;
        if (curZ + md > lv / 2 + 0.1) { curZ = -lv / 2 + 0.1; curX += mw; andar = 0; }
        
        if (usarEmpilhamento && andar === 0) {
            desenhar(curX, 0, curZ, mw, mh, md, cor, tipo);
            andar = 1;
        } else if (usarEmpilhamento && andar === 1) {
            desenhar(curX, mh, curZ, mw, mh, md, cor, tipo);
            curZ += md; andar = 0;
        } else {
            desenhar(curX, 0, curZ, mw, mh, md, cor, tipo);
            curZ += md;
        }
    };

    function desenhar(x, y, z, mw, mh, md, cor, tipo) {
        if (x + mw > cv / 2 + 0.1) return;
        const { grupo, mesh } = criar(mw/MARGEM, mh, md/MARGEM, cor, tipo);
        grupo.position.set(x + mw/2, y + mh/2, z + md/2);
        scene.add(grupo);
        objetosInterativos.push(mesh);
    }

    cargaCarrinho.forEach(item => { for(let k=0; k < item.qtd; k++) addFunc(item.c, item.h, item.l, 0xffa000, "CAIXA"); });
    
    const rE = parseInt(document.getElementById('qEthos').value) || 0;
    const rJ = parseInt(document.getElementById('qJuandi').value) || 0;
    const rC = parseInt(document.getElementById('qComax').value) || 0;
    for(let i=0; i < (rE+rJ+rC); i++) addFunc(1.22, 1.15, 1.22, 0x2196f3, "RACK");

    validarCarga(cv, lv, av);
};

// --- MOVIMENTAÇÃO E EMPILHAMENTO INTELIGENTE ---
function onMouseDown(e) {
    const obj = identificarObjeto(e);
    if (obj) {
        controls.enabled = false;
        objetoSelecionado = obj;
        
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const interPlano = raycaster.intersectObject(planoInvisivel);
        if (interPlano.length > 0) offset.copy(interPlano[0].point).sub(objetoSelecionado.position);
    }
}

function onMouseMove(e) {
    if (!objetoSelecionado) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const inter = raycaster.intersectObject(planoInvisivel);
    
    if (inter.length > 0) {
        objetoSelecionado.position.x = inter[0].point.x - offset.x;
        objetoSelecionado.position.z = inter[0].point.z - offset.z;

        // Sensor de empilhamento: Raio vindo do céu em direção ao objeto
        let novaAltura = objetoSelecionado.userData.h / 2;
        const rayDown = new THREE.Raycaster(
            new THREE.Vector3(objetoSelecionado.position.x, 10, objetoSelecionado.position.z), 
            new THREE.Vector3(0, -1, 0)
        );

        const possiveisAlvos = objetosInterativos.filter(m => m.parent !== objetoSelecionado);
        const colisoes = rayDown.intersectObjects(possiveisAlvos, true);

        if (colisoes.length > 0) {
            let objAbaixo = colisoes[0].object;
            while (objAbaixo.parent && objAbaixo.type !== 'Group') objAbaixo = objAbaixo.parent;

            // REGRA: RACK sobre RACK | CAIXA sobre CAIXA
            if (objAbaixo.userData.tipo === objetoSelecionado.userData.tipo) {
                const boxAbaixo = new THREE.Box3().setFromObject(objAbaixo);
                novaAltura = boxAbaixo.max.y + (objetoSelecionado.userData.h / 2);
            }
        }
        objetoSelecionado.position.y = novaAltura;
        validarCarga();
    }
}

function validarCarga(cv=14, lv=2.45, av=2.7) {
    const v = document.getElementById('veiculo').value;
    if (v === 'carreta') cv = 13.5;
    else if (v === 'truck') { cv = 8.0; av = 2.6; }
    else if (v === 'toco') { cv = 7.0; av = 2.5; }
    else if (v === 'vlc') { cv = 5.1; av = 2.3; }

    const boxCarreta = new THREE.Box3(new THREE.Vector3(-cv/2, 0, -lv/2), new THREE.Vector3(cv/2, av, lv/2));

    objetosInterativos.forEach((meshAtu) => {
        const objAtu = meshAtu.parent;
        const boxAtu = new THREE.Box3().setFromObject(objAtu);
        let erro = !boxCarreta.containsBox(boxAtu); // Fora do baú ou teto
        
        objetosInterativos.forEach((meshOutro) => {
            const objOutro = meshOutro.parent;
            if (objAtu === objOutro) return;
            
            const boxOutro = new THREE.Box3().setFromObject(objOutro);
            if (boxAtu.intersectsBox(boxOutro)) {
                // Tolerância de 5cm para empilhamento vertical
                const diffY = Math.abs(boxAtu.min.y - boxOutro.max.y);
                if (diffY > 0.05) erro = true; 
            }
        });
        meshAtu.material.color.setHex(erro ? 0xff0000 : objAtu.userData.corOrig);
    });
}

function onMouseUp() { objetoSelecionado = null; controls.enabled = true; }
function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); if(controls) controls.update(); }

window.onload = init3D;