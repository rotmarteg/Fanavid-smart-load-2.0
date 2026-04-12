// 1. Variável de memória
let cargaMistaCaixas = [];

const limitesVeiculos = {
carreta: 13.50 * 2.45,
truck: 8.00 * 2.40,
toco: 7.00 * 2.40,
vlc: 5.10 * 2.40
};

const bancoDadosCaixas = [
{ id: "N1", dimensoes: { c: 850, l: 750 }, peso: 50 },
{ id: "N2", dimensoes: { c: 1050, l: 800 }, peso: 60 },
{ id: "N5", dimensoes: { c: 1050, l: 1050 }, peso: 75 },
{ id: "N9", dimensoes: { c: 1250, l: 850 }, peso: 80 },
{ id: "N16", dimensoes: { c: 1250, l: 1150 }, peso: 90 },
{ id: "N17", dimensoes: { c: 1450, l: 1050 }, peso: 100 },
{ id: "N18", dimensoes: { c: 1450, l: 1300 }, peso: 115 },
{ id: "N19", dimensoes: { c: 1650, l: 1050 }, peso: 120 },
{ id: "N20", dimensoes: { c: 1650, l: 1450 }, peso: 140 },
{ id: "N21", dimensoes: { c: 1850, l: 1050 }, peso: 150 },
{ id: "N22", dimensoes: { c: 1850, l: 1250 }, peso: 170 },
{ id: "N23", dimensoes: { c: 2050, l: 1250 }, peso: 190 },
{ id: "N24", dimensoes: { c: 1800, l: 630 }, peso: 85 },
{ id: "N25", dimensoes: { c: 1800, l: 800 }, peso: 110 },
{ id: "N8", dimensoes : { c: 2500, l: 1350}, peso: 220 },//com 25 peças mais ou menos
{ id: "N14", dimensoes : { c: 1700, l:1500}, peso: 170 },
{ id: "N6", dimensoes : { c: 2000, l:2000 }, peso: 180 }, 
];

function adicionarItem() {
const idCaixa = document.getElementById('idCaixa').value;
const qtd = parseInt(document.getElementById('qCaixas').value) || 0;

if (idCaixa === "" || qtd <= 0) {
alert("Selecione uma caixa e a quantidade!");
return;
}

const dados = bancoDadosCaixas.find(c => c.id === idCaixa);

if (dados) {
const MARGEM = 20;
const comprimentoComSeguranca = (dados.dimensoes.c + MARGEM) / 1000;
const larguraComSeguranca = (dados.dimensoes.l + MARGEM) / 1000;
const areaUnit = comprimentoComSeguranca * larguraComSeguranca;

cargaMistaCaixas.push({
id: idCaixa,
qtd: qtd,
areaTotal: areaUnit * qtd,
pesoTotal: (dados.peso || 0) * qtd
});

atualizarInterfaceLista();
document.getElementById('idCaixa').value = "";
document.getElementById('qCaixas').value = "";
}
}

function atualizarInterfaceLista() {
const listaUI = document.getElementById('itens-lista');
const containerLista = document.getElementById('lista-carregamento');
containerLista.style.display = "block";
listaUI.innerHTML = "";

cargaMistaCaixas.forEach((item, index) => {
listaUI.innerHTML += `<li>${item.qtd}x ${item.id} <span style="color:red; cursor:pointer; margin-left:10px;" onclick="removerItem(${index})">✖</span></li>`;
});
}

function removerItem(index) {
cargaMistaCaixas.splice(index, 1);
atualizarInterfaceLista();
if (cargaMistaCaixas.length === 0) document.getElementById('lista-carregamento').style.display = "none";
}

function calcularCarga() {
const veiculo = document.getElementById('veiculo').value;
const empilhado = document.getElementById('empilhado').checked;
const display = document.getElementById('resultado');

// 1. Cálculos dos Racks
const qE = parseInt(document.getElementById('qEthos').value) || 0;
const qJ = parseInt(document.getElementById('qJuandi').value) || 0;
const qC = parseInt(document.getElementById('qComax').value) || 0;

const pesoRacks = (qE * 150) + (qJ * 150) + (qC * 100);
const areaTotalRacks = (qE * 2.1) + (qJ * 2.1) + (qC * 1.5);

// 2. Cálculos das Caixas de Madeira
let areaTotalCaixas = 0;
let pesoTotalCaixas = 0;
cargaMistaCaixas.forEach(item => {
areaTotalCaixas += item.areaTotal;
pesoTotalCaixas += item.pesoTotal;
});

// 3. Soma as áreas e pesos ANTES de aplicar o empilhamento
let areaFinal = areaTotalRacks + areaTotalCaixas;
const pesoFinalKg = pesoRacks + pesoTotalCaixas;

// 4. Se o botão "Dois Andares" estiver marcado, divide a área total por 2
if (empilhado) {
areaFinal = areaFinal / 2;
}

// 5. Agora sim calcula a porcentagem com a área final (já dividida se for o caso)
const limite = limitesVeiculos[veiculo];
const porcentagem = (areaFinal / limite) * 100;

// 6. Interface de Relatório
display.style.display = "block";
display.innerHTML = `
<div style="border: 2px solid #2e7d32; padding: 15px; border-radius: 12px; background: #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
<p style="color: #2e7d32; font-weight: bold; margin: 0 0 10px 0; text-align: center; border-bottom: 1px solid #eee; padding-bottom: 5px;">📊 RELATÓRIO DE EXPEDIÇÃO</p>

<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
<span>Ocupação:</span>
<strong style="color: ${porcentagem > 100 ? 'red' : '#333'}">${porcentagem.toFixed(1)}%</strong>
</div>

<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
<span>Área Utilizada:</span>
<strong>${areaFinal.toFixed(2)}m² / ${limite.toFixed(2)}m²</strong>
</div>

<div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-top: 5px; border-top: 1px dashed #ccc;">
<span>Peso Total:</span>
<strong style="color: #1565c0;">${(pesoFinalKg/1000).toFixed(3)} Ton</strong>
</div>

<div style="background: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center; margin-bottom: 15px;">
<span style="font-size: 12px; color: #666;">FROTA ESTIMADA</span>
<h3 style="color: #d32f2f; margin: 5px 0 0 0;">${Math.ceil(porcentagem / 100)} Unidade(s)</h3>
</div>

<div style="margin-top: 20px; font-size: 10px; color: #666; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #eee; padding-top: 10px;">
<span>Gerado em: ${new Date().toLocaleString('pt-BR')}</span>
<div style="text-align: center;">
<div style="border-top: 1px solid #333; width: 150px; margin-bottom: 5px;"></div>
<span>Assinatura Conferente</span>
</div>
</div>
</div>`;
}

