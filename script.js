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

// --- MOTOR 3D (INIT) ---
function init3D() {
    const container = document.getElementById('canvas-3d');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(12, 12, 12);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const light = new THREE.DirectionalLight(0xffffff, 0.6);
    light.position.set(10, 20, 10);
    scene.add(light);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    
    const planeGeo = new THREE.PlaneGeometry(200, 200);
    planoInvisivel = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ visible: false }));
    planoInvisivel.rotation.x = -Math.PI / 2;
    scene.add(planoInvisivel);

    renderer.domElement.addEventListener('pointerdown', onMouseDown, false);
    renderer.domElement.addEventListener('pointermove', onMouseMove, false);
    window.addEventListener('pointerup', onMouseUp, false);
    animate();
}

// --- FUNÇÃO DE CRIAR OBJETOS ---
function criar(w, h, d, cor, tipo) {
    const mw = w * MARGEM; 
    const md = d * MARGEM; 
    const mh = h;

    const grupo = new THREE.Group();
    // 0.96 cria um pequeno vão visual entre as peças para melhor visualização
    const geo = new THREE.BoxGeometry(mw * 0.96, mh * 0.98, md * 0.96);
    const material = new THREE.MeshPhongMaterial({ color: cor, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, material);
    
    grupo.add(mesh);
    grupo.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x333333 })));

    grupo.userData = { tipo: tipo, corOrig: cor, w: mw, d: md, h: mh };
    return { grupo, mesh };
}

// --- INTERFACE E LISTA ---
function atualizarListaVisual() {
    const listaUl = document.getElementById('itens-lista');
    const containerLista = document.getElementById('lista-carregamento');
    
    if (!listaUl) return;

    if (containerLista) {
        containerLista.style.display = cargaCarrinho.length > 0 ? "block" : "none";
    }

    listaUl.innerHTML = cargaCarrinho.map((item, i) => `
        <li style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:8px; margin-bottom:5px; border-radius:4px; font-size:12px; color: #333; border-left: 5px solid #ffa000;">
            <span><strong>${item.qtd}x</strong> ${item.id} (${item.c}m x ${item.l}m)</span>
            <button onclick="removerItem(${i})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold; padding: 0 10px;">[X]</button>
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
        qtdInput.value = "0"; 
    } else {
        alert("Selecione um modelo e uma quantidade maior que zero.");
    }
};

window.removerItem = function(i) {
    cargaCarrinho.splice(i, 1);
    atualizarListaVisual();
    window.calcularCarga();
};

window.calcularCarga = function() {
    const veiculo = document.getElementById('veiculo').value;
    const usarEmpilhamento = document.getElementById('empilhado').checked;
    
    let cv = 14.0, lv = 2.45, av = 2.7; // Padrão Carreta MG

    if (veiculo === 'carreta_mg') { cv = 14.0; } 
    else if (veiculo === 'carreta') { cv = 13.5; }
    else if (veiculo === 'truck') { cv = 8.0; lv = 2.45; av = 2.6; }
    else if (veiculo === 'toco') { cv = 7.0; lv = 2.40; av = 2.5; }
    else if (veiculo === 'vlc') { cv = 5.1; lv = 2.20; av = 2.3; }

    // Limpa a cena antes de redesenhar
    objetosInterativos = [];
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const obj = scene.children[i];
        if (obj.isGroup || obj.isLineSegments || (obj.isMesh && obj !== planoInvisivel)) {
            scene.remove(obj);
        }
    }

    // Desenha o baú do veículo
    const bau = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(cv, av, lv)), 
        new THREE.LineBasicMaterial({ color: 0x000000 })
    );
    bau.position.set(0, av/2, 0);
    scene.add(bau);

    let curX = -cv/2 + 0.05, curZ = -lv/2 + 0.05, andar = 0;

   const addFunc = (w, h, d, cor, tipo) => {
        const mw = w * MARGEM; 
        const md = d * MARGEM;
        const mh = h;

        // Se não couber na largura (Z), pula para a próxima posição no comprimento (X)
        if (curZ + md > lv / 2 + 0.01) { 
            curZ = -lv / 2 + 0.05; 
            curX += mw; 
            andar = 0; 
        }

        // Tenta empilhar se o usuário marcou a opção e se houver altura disponível
        if (usarEmpilhamento && andar === 0) {
            // Desenha o primeiro andar
            desenhar(curX, 0, curZ, mw, mh, md, cor, tipo);
            // Prepara para o segundo andar na mesma posição X, Z
            andar = 1;
        } else if (usarEmpilhamento && andar === 1) {
            // Desenha o segundo andar
            desenhar(curX, mh, curZ, mw, mh, md, cor, tipo);
            // Move para a próxima posição na largura (Z) e reseta o andar
            curZ += md;
            andar = 0;
        } else {
            // Sem empilhamento: desenha no chão e avança na largura (Z)
            desenhar(curX, 0, curZ, mw, mh, md, cor, tipo);
            curZ += md;
        }
    };

    // Função auxiliar para colocar o objeto na cena
    function desenhar(x, y, z, mw, mh, md, cor, tipo) {
        if (x + mw > cv / 2 + 0.01) return; // Trava de comprimento do baú

        const { grupo, mesh } = criar(mw / MARGEM, mh, md / MARGEM, cor, tipo);
        grupo.position.set(x + mw / 2, y + mh / 2, z + md / 2);
        scene.add(grupo);
        objetosInterativos.push(mesh);
    }

    // --- PRIORIDADE: ADICIONAR CAIXAS PRIMEIRO PARA NÃO SUMIREM ---
    cargaCarrinho.forEach(item => { 
        for(let k=0; k < item.qtd; k++) addFunc(item.c, item.h, item.l, 0xffa000, "CAIXA"); 
    });

    // --- DEPOIS ADICIONAR OS RACKS ---
    const qRacks = (parseInt(document.getElementById('qEthos').value)||0) + 
                   (parseInt(document.getElementById('qJuandi').value)||0) + 
                   (parseInt(document.getElementById('qComax').value)||0);
    for(let i=0; i < qRacks; i++) addFunc(1.22, 1.15, 1.22, 0x2196f3, "RACK");

    validarCarga();
};

// --- MOVIMENTAÇÃO E VALIDAÇÃO ---
function onMouseDown(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objetosInterativos, true);
    if (intersects.length > 0) {
        controls.enabled = false;
        let t = intersects[0].object;
        while (t.parent && t.type !== 'Group') t = t.parent;
        objetoSelecionado = t;
        const interPlano = raycaster.intersectObject(planoInvisivel);
        if (interPlano.length > 0) offset.copy(interPlano[0].point).sub(objetoSelecionado.position);
    }
}

function onMouseMove(e) {
    if (!objetoSelecionado) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const inter = raycaster.intersectObject(planoInvisivel);
    if (inter.length > 0) {
        objetoSelecionado.position.x = inter[0].point.x - offset.x;
        objetoSelecionado.position.z = inter[0].point.z - offset.z;
        let alturaBase = objetoSelecionado.userData.h / 2;
        let conflitoTipo = false;
        const boxS = new THREE.Box3().setFromObject(objetoSelecionado);
        
        objetosInterativos.forEach(m => {
            const outro = m.parent;
            if (outro === objetoSelecionado) return;
            const boxO = new THREE.Box3().setFromObject(outro);
            if (boxS.min.x < boxO.max.x && boxS.max.x > boxO.min.x && boxS.min.z < boxO.max.z && boxS.max.z > boxO.min.z) {
                if (objetoSelecionado.userData.tipo === outro.userData.tipo) {
                    alturaBase = Math.max(alturaBase, boxO.max.y + (objetoSelecionado.userData.h / 2));
                } else { conflitoTipo = true; }
            }
        });
        objetoSelecionado.position.y = alturaBase;
        validarCarga(conflitoTipo);
    }
}

function validarCarga() {
    const margemErro = 0.01; // 1cm de tolerância

    // 1. Criamos a caixa que representa o limite interno da carreta
    const boxCarreta = new THREE.Box3(
        new THREE.Vector3(-objetoSelecionado?.userData.cv/2 || -7, 0, -objetoSelecionado?.userData.lv/2 || -1.22),
        new THREE.Vector3(objetoSelecionado?.userData.cv/2 || 7, 2.7, objetoSelecionado?.userData.lv/2 || 1.22)
    );

    objetosInterativos.forEach((meshAtu) => {
        const objAtu = meshAtu.parent;
        const boxAtu = new THREE.Box3().setFromObject(objAtu);
        let houveColisao = false;

        // VERIFICAÇÃO 1: Saiu da carreta?
        // Se a caixa do item não estiver totalmente contida na caixa da carreta
        if (!boxCarreta.containsBox(boxAtu)) {
            houveColisao = true;
        }

        // VERIFICAÇÃO 2: Atravessou outro objeto?
        objetosInterativos.forEach((meshOutro) => {
            const objOutro = meshOutro.parent;
            if (objAtu === objOutro) return; // Não checar contra si mesmo

            const boxOutro = new THREE.Box3().setFromObject(objOutro);
            
            // Checa se as caixas se intersectam (uma dentro da outra)
            if (boxAtu.intersectsBox(boxOutro)) {
                houveColisao = true;
            }
        });

        // Aplica a cor: Vermelho se algo estiver errado, cor original se estiver OK
        if (houveColisao) {
            meshAtu.material.color.setHex(0xff0000); // Vermelho
        } else {
            meshAtu.material.color.setHex(objAtu.userData.corOrig);
        }
    });
}

function onMouseUp() { objetoSelecionado = null; controls.enabled = true; validarCarga(); }
function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }
window.onload = init3D;