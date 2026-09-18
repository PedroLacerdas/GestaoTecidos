// ==========================================
// 0. FIREBASE - INICIALIZAÇÃO
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtDX9g3hndC0IeRzaOFq4F1fdRU8fVCso",
  authDomain: "controle-de-tecidos.firebaseapp.com",
  projectId: "controle-de-tecidos",
  storageBucket: "controle-de-tecidos.firebasestorage.app",
  messagingSenderId: "1083949988105",
  appId: "1:1083949988105:web:ce5e59a37666b96d563bd8",
  measurementId: "G-3XC47DFJ7C"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const refEstoque = doc(db, "appData", "estoque");
const refOperacao = doc(db, "appData", "operacao");
const DOMINIO_LOGIN = "controle-tecidos.local";
let nomeUsuarioLogado = "";

// Deixe como false para o app abrir direto sem pedir login.
// Mude para true quando o aplicativo estiver pronto para produção.
const LOGIN_ATIVO = false;

// ==========================================
// 1. NAVEGAÇÃO ENTRE TELAS (menu lateral)
// ==========================================
const TELAS = ['dashboard', 'tecidos', 'checklist', 'floculante', 'anomalias'];
window.mudarTela = function (nomeTela) {
  TELAS.forEach(t => {
    const secao = document.getElementById('tela' + t.charAt(0).toUpperCase() + t.slice(1));
    if (secao) secao.classList.toggle('hidden', t !== nomeTela);

    const btn = document.querySelector(`.nav-btn[data-tela="${t}"]`);
    if (btn) {
      if (t === nomeTela) {
        btn.classList.add('bg-slate-800', 'text-white');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('bg-slate-800', 'text-white');
        btn.classList.add('text-slate-400');
      }
    }
  });

  if (nomeTela === 'dashboard') {
    renderizarDashboard();
  }
  if (nomeTela === 'floculante') {
    renderizarGraficoFloculante();
  }
  if (nomeTela === 'checklist') {
    renderizarFormChecklist();
    iniciarListenerChecklist();
  }
};

// ==========================================
// 2. CONFIGURAÇÃO DE APARÊNCIA
// ==========================================
const configPadrao = {
  corPrincipal: '#011a12',
  corDestaque: '#25057e',
  textoPrincipal: '#f8fafc',
  textoSecundario: '#94a3b8',
  fundoApp: '#0f172a',
  fundoImgUrl: 'mapa.png',
  fonteApp: 'Inter, sans-serif',
  logoUrl: 'logo.png'
};

let configAtual = JSON.parse(localStorage.getItem('appConfigPersonalizada')) || { ...configPadrao };

function vincularPickerHex(idPicker, idHex) {
  const picker = document.getElementById(idPicker);
  const hex = document.getElementById(idHex);
  if (!picker || !hex) return;
  picker.addEventListener('input', (e) => hex.value = e.target.value.toUpperCase());
  hex.addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) picker.value = e.target.value;
  });
}

function aplicarConfiguracoes(cfg) {
  document.documentElement.style.setProperty('--cor-principal', cfg.corPrincipal);
  document.documentElement.style.setProperty('--cor-destaque', cfg.corDestaque);
  document.documentElement.style.setProperty('--cor-texto-principal', cfg.textoPrincipal);
  document.documentElement.style.setProperty('--cor-texto-secundario', cfg.textoSecundario);
  document.documentElement.style.setProperty('--cor-fundo-app', cfg.fundoApp);
  document.documentElement.style.setProperty('--fonte-app', cfg.fonteApp);

  if (cfg.fundoImgUrl && cfg.fundoImgUrl.trim() !== '') {
    document.documentElement.style.setProperty('--imagem-fundo-app', `url('${cfg.fundoImgUrl.trim()}')`);
  } else {
    document.documentElement.style.setProperty('--imagem-fundo-app', 'none');
  }

  const logoImg = document.getElementById('appLogo');
  if (logoImg && cfg.logoUrl) {
    logoImg.src = cfg.logoUrl;
    logoImg.style.display = 'block';
  }
}

window.abrirModalPersonalizacao = function () {
  document.getElementById('pickerCorPrincipal').value = configAtual.corPrincipal;
  document.getElementById('hexCorPrincipal').value = configAtual.corPrincipal;
  document.getElementById('pickerCorDestaque').value = configAtual.corDestaque;
  document.getElementById('hexCorDestaque').value = configAtual.corDestaque;
  document.getElementById('pickerTextoPrincipal').value = configAtual.textoPrincipal;
  document.getElementById('hexTextoPrincipal').value = configAtual.textoPrincipal;
  document.getElementById('pickerTextoSecundario').value = configAtual.textoSecundario;
  document.getElementById('hexTextoSecundario').value = configAtual.textoSecundario;
  document.getElementById('pickerFundoApp').value = configAtual.fundoApp;
  document.getElementById('hexFundoApp').value = configAtual.fundoApp;
  document.getElementById('inputFonte').value = configAtual.fonteApp;
  document.getElementById('inputLogoUrl').value = configAtual.logoUrl || '';
  document.getElementById('inputFundoImgUrl').value = configAtual.fundoImgUrl || '';
  document.getElementById('modalPersonalizacao').classList.remove('hidden');
};

window.fecharModalPersonalizacao = function () {
  document.getElementById('modalPersonalizacao').classList.add('hidden');
};

window.salvarPersonalizacao = function (e) {
  e.preventDefault();
  configAtual = {
    corPrincipal: document.getElementById('hexCorPrincipal').value,
    corDestaque: document.getElementById('hexCorDestaque').value,
    textoPrincipal: document.getElementById('hexTextoPrincipal').value,
    textoSecundario: document.getElementById('hexTextoSecundario').value,
    fundoApp: document.getElementById('hexFundoApp').value,
    fundoImgUrl: document.getElementById('inputFundoImgUrl').value,
    fonteApp: document.getElementById('inputFonte').value,
    logoUrl: document.getElementById('inputLogoUrl').value
  };
  localStorage.setItem('appConfigPersonalizada', JSON.stringify(configAtual));
  aplicarConfiguracoes(configAtual);
  window.fecharModalPersonalizacao();
  alert('Personalizações salvas com sucesso!');
};

window.restaurarPadrao = function () {
  if (confirm('Deseja restaurar as cores, fontes e fundo padrão?')) {
    configAtual = { ...configPadrao };
    localStorage.setItem('appConfigPersonalizada', JSON.stringify(configAtual));
    aplicarConfiguracoes(configAtual);
    window.fecharModalPersonalizacao();
  }
};

// ==========================================
// 3. NAVEGAÇÃO INTERNA DE "CONTROLE DE TECIDOS"
// ==========================================
window.mudarVisaoPrincipal = function (visao) {
  const visaoOp = document.getElementById('visaoOperacao');
  const visaoEst = document.getElementById('visaoEstoque');
  const btnOp = document.getElementById('btnNavOperacao');
  const btnEst = document.getElementById('btnNavEstoque');
  const containerFiltros = document.getElementById('containerSeletorFiltro');

  if (visao === 'operacao') {
    visaoOp.classList.remove('hidden');
    visaoEst.classList.add('hidden');
    containerFiltros.classList.remove('hidden');
    btnOp.className = "flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-white bg-slate-800 shadow border border-slate-600";
    btnEst.className = "flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-slate-400 hover:text-white";
  } else {
    visaoOp.classList.add('hidden');
    visaoEst.classList.remove('hidden');
    containerFiltros.classList.add('hidden');
    btnEst.className = "flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-white bg-slate-800 shadow border border-slate-600";
    btnOp.className = "flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-slate-400 hover:text-white";
    renderizarEstoque();
  }
};

// ==========================================
// 4. ESTOQUE DE TECIDOS
// ==========================================
let estoqueSaldo = {
  'Fabricante Valmet': 10,
  'Fabricante Jin Jing': 5,
  'Fabricante Matec': 7
};
let estoqueMovimentacoes = [];

function salvarDadosEstoque() {
  setDoc(refEstoque, { saldo: estoqueSaldo, movimentacoes: estoqueMovimentacoes })
    .catch(err => console.error('Erro ao salvar estoque:', err));
}

window.lancarEntradaEstoque = function (e) {
  e.preventDefault();
  const fabInput = document.getElementById('estoqueFabricante').value.trim();
  const qtd = Number(document.getElementById('estoqueQtd').value);

  if (!fabInput || isNaN(qtd) || qtd <= 0) {
    alert('Informe um fabricante válido e uma quantidade maior que zero.');
    return;
  }

  const chaveExistente = Object.keys(estoqueSaldo).find(k => k.toLowerCase() === fabInput.toLowerCase());
  const nomeFabricante = chaveExistente || fabInput;

  estoqueSaldo[nomeFabricante] = (Number(estoqueSaldo[nomeFabricante]) || 0) + qtd;

  estoqueMovimentacoes.unshift({
    data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tipo: 'Entrada',
    fabricante: nomeFabricante,
    qtd: qtd,
    detalhe: 'Compra de tecidos',
    usuario: nomeUsuarioLogado || 'desenvolvimento'
  });

  salvarDadosEstoque();
  document.getElementById('estoqueFabricante').value = '';
  document.getElementById('estoqueQtd').value = '';
  alert(`Entrada de ${qtd} unidades para "${nomeFabricante}" somada ao estoque!`);
};

window.renderizarEstoque = function () {
  const containerSaldo = document.getElementById('gridSaldoEstoque');
  if (!containerSaldo) return;
  containerSaldo.innerHTML = '';

  const fabricantes = Object.keys(estoqueSaldo);
  if (fabricantes.length === 0) {
    containerSaldo.innerHTML = '<p class="text-slate-500 text-sm col-span-3">Nenhum item em estoque.</p>';
  } else {
    fabricantes.forEach(fab => {
      const qtd = estoqueSaldo[fab];
      const div = document.createElement('div');
      const statusCor = qtd <= 2 ? 'border-red-500/60 bg-red-950/20' : 'border-slate-700 bg-slate-900/80';
      const badgeQtd = qtd <= 2 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold';
      div.className = `p-4 rounded-xl border ${statusCor} space-y-1 shadow`;
      div.innerHTML = `
        <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">${fab}</p>
        <p class="text-2xl ${badgeQtd}">${qtd} <span class="text-xs font-normal text-slate-400">unidades</span></p>
        ${qtd <= 2 ? '<p class="text-[10px] text-red-400 font-semibold">⚠️ Estoque Crítico</p>' : ''}
      `;
      containerSaldo.appendChild(div);
    });
  }

  const tbody = document.getElementById('tabelaMovimentacoesEstoque');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (estoqueMovimentacoes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500">Nenhuma movimentação.</td></tr>';
    return;
  }

  estoqueMovimentacoes.forEach(mov => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/50 border-b border-slate-700/50';
    const badgeTipo = mov.tipo === 'Entrada'
      ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-900/60 text-blue-300 border border-blue-700">Entrada</span>'
      : '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-900/60 text-amber-300 border border-amber-700">Saída</span>';
    tr.innerHTML = `
      <td class="p-3 text-xs">${mov.data}</td>
      <td class="p-3">${badgeTipo}</td>
      <td class="p-3 font-medium text-white">${mov.fabricante}</td>
      <td class="p-3 font-bold ${mov.tipo === 'Entrada' ? 'text-blue-400' : 'text-amber-400'}">${mov.tipo === 'Entrada' ? '+' : '-'}${mov.qtd}</td>
      <td class="p-3 text-xs text-slate-400">${mov.detalhe}</td>
    `;
    tbody.appendChild(tr);
  });
};

function atualizarSelectEstoqueForm() {
  const select = document.getElementById('fabricanteInstalar');
  if (!select) return;
  select.innerHTML = '';
  const disponiveis = Object.keys(estoqueSaldo).filter(f => estoqueSaldo[f] > 0);
  if (disponiveis.length === 0) {
    select.innerHTML = '<option value="">Nenhum tecido disponível no estoque!</option>';
  } else {
    disponiveis.forEach(fab => {
      const option = document.createElement('option');
      option.value = fab;
      option.innerText = `${fab} (Saldo: ${estoqueSaldo[fab]} un)`;
      select.appendChild(option);
    });
  }
}

// ==========================================
// 5. OPERAÇÃO DOS FILTROS PRENSA
// ==========================================
let filtroAtivo = 1;
let abaAtiva = 'instalar';
let chartInstance = null;
let placasInstaladas = { 1: {}, 2: {} };
let historico = [];

function salvarDados() {
  setDoc(refOperacao, { placas: placasInstaladas, historico: historico })
    .catch(err => console.error('Erro ao salvar operação:', err));
}

window.mudarFiltro = function (numeroFiltro) {
  filtroAtivo = numeroFiltro;
  document.getElementById('btnFiltro1').className = filtroAtivo === 1
    ? 'px-5 py-2.5 rounded-lg font-semibold text-sm btn-principal transition-all shadow'
    : 'px-5 py-2.5 rounded-lg font-semibold text-sm text-slate-400 hover:text-white transition-all';
  document.getElementById('btnFiltro2').className = filtroAtivo === 2
    ? 'px-5 py-2.5 rounded-lg font-semibold text-sm btn-principal transition-all shadow'
    : 'px-5 py-2.5 rounded-lg font-semibold text-sm text-slate-400 hover:text-white transition-all';

  document.getElementById('labelFiltroInstalar').innerText = `Filtro Prensa ${filtroAtivo}`;
  document.getElementById('labelFiltroRetirar').innerText = `Filtro Prensa ${filtroAtivo}`;
  document.getElementById('tituloGrafico').innerText = `Média de Durabilidade (Ciclos) - Filtro ${filtroAtivo}`;
  document.getElementById('tituloTabela').innerText = `Histórico de Trocas Concluídas - Filtro ${filtroAtivo}`;

  atualizarSelectPlacasRetirar();
  renderizarTabela();
  renderizarGrafico();
};

window.mudarAba = function (aba) {
  abaAtiva = aba;
  const btnInstalar = document.getElementById('abaInstalarBtn');
  const btnRetirar = document.getElementById('abaRetirarBtn');
  const formInstalar = document.getElementById('formInstalar');
  const formRetirar = document.getElementById('formRetirar');

  if (aba === 'instalar') {
    btnInstalar.className = 'flex-1 pb-3 font-semibold text-sm border-b-2 text-destaque';
    btnInstalar.style.borderColor = 'var(--cor-destaque)';
    btnRetirar.className = 'flex-1 pb-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-white';
    formInstalar.classList.remove('hidden');
    formRetirar.classList.add('hidden');
  } else {
    btnRetirar.className = 'flex-1 pb-3 font-semibold text-sm border-b-2 text-amber-400 border-amber-400';
    btnInstalar.className = 'flex-1 pb-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-white';
    formRetirar.classList.remove('hidden');
    formInstalar.classList.add('hidden');
    atualizarSelectPlacasRetirar();
  }
};

window.salvarInstalacao = function (e) {
  e.preventDefault();
  const numPlaca = document.getElementById('numPlacaInstalar').value;
  const fabricante = document.getElementById('fabricanteInstalar').value;
  const ciclo = Number(document.getElementById('cicloInstalacao').value);

  if (!fabricante || (estoqueSaldo[fabricante] || 0) <= 0) {
    alert('Selecione uma lona com saldo disponível no estoque.');
    return;
  }
  if (placasInstaladas[filtroAtivo][numPlaca]) {
    if (!confirm(`A Placa ${numPlaca} já possui um tecido em uso. Deseja substituir?`)) return;
  }

  estoqueSaldo[fabricante] -= 1;
  estoqueMovimentacoes.unshift({
    data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tipo: 'Saida',
    fabricante: fabricante,
    qtd: 1,
    detalhe: `Instalação na Placa ${numPlaca} (Filtro ${filtroAtivo})`,
    usuario: nomeUsuarioLogado || 'desenvolvimento'
  });

  placasInstaladas[filtroAtivo][numPlaca] = {
    fabricante: fabricante,
    cicloInstalacao: ciclo,
    dataInstalacao: new Date().toLocaleDateString('pt-BR')
  };

  salvarDados();
  salvarDadosEstoque();
  document.getElementById('formInstalar').reset();
  alert(`Placa ${numPlaca} instalada com sucesso! 1 lona consumida do estoque.`);
};

function atualizarSelectPlacasRetirar() {
  const select = document.getElementById('selectPlacaRetirar');
  if (!select) return;
  select.innerHTML = '<option value="">Selecione uma placa...</option>';
  const placas = placasInstaladas[filtroAtivo] || {};
  Object.keys(placas).sort((a, b) => Number(a) - Number(b)).forEach(num => {
    const option = document.createElement('option');
    option.value = num;
    option.innerText = `Placa ${num} (${placas[num].fabricante})`;
    select.appendChild(option);
  });
  document.getElementById('boxInfoPlaca').classList.add('hidden');
}

window.atualizarInfoPlaca = function () {
  const numPlaca = document.getElementById('selectPlacaRetirar').value;
  const box = document.getElementById('boxInfoPlaca');
  if (!numPlaca) { box.classList.add('hidden'); return; }
  const info = placasInstaladas[filtroAtivo][numPlaca];
  if (info) {
    document.getElementById('infoFabricante').innerText = info.fabricante;
    document.getElementById('infoCicloEntrada').innerText = `${info.cicloInstalacao} ciclos`;
    box.classList.remove('hidden');
  }
};

window.salvarBaixa = function (e) {
  e.preventDefault();
  const numPlaca = document.getElementById('selectPlacaRetirar').value;
  const cicloRetirada = Number(document.getElementById('cicloRetirada').value);
  if (!numPlaca) return;

  const instalacao = placasInstaladas[filtroAtivo][numPlaca];
  if (cicloRetirada < instalacao.cicloInstalacao) {
    alert('O ciclo de retirada deve ser maior ou igual ao de instalação!');
    return;
  }

  const durabilidade = cicloRetirada - instalacao.cicloInstalacao;
  historico.unshift({
    filtro: filtroAtivo,
    placa: numPlaca,
    fabricante: instalacao.fabricante,
    cicloEntrada: instalacao.cicloInstalacao,
    cicloSaida: cicloRetirada,
    durabilidade: durabilidade
  });

  delete placasInstaladas[filtroAtivo][numPlaca];
  salvarDados();
  document.getElementById('formRetirar').reset();
  document.getElementById('boxInfoPlaca').classList.add('hidden');
  alert(`Baixa registrada! Durabilidade alcançada: ${durabilidade} ciclos.`);
};

function renderizarTabela() {
  const tbody = document.getElementById('tabelaHistorico');
  if (!tbody) return;
  tbody.innerHTML = '';
  const historicoFiltro = historico.filter(item => item.filtro === filtroAtivo);
  if (historicoFiltro.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-500">Nenhum registro no histórico.</td></tr>';
    return;
  }
  historicoFiltro.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/50 border-b border-slate-700/50';
    tr.innerHTML = `
      <td class="p-3 font-semibold text-white">Placa ${item.placa}</td>
      <td class="p-3">${item.fabricante}</td>
      <td class="p-3">${item.cicloEntrada}</td>
      <td class="p-3">${item.cicloSaida}</td>
      <td class="p-3 font-bold text-destaque">${item.durabilidade} ciclos</td>
    `;
    tbody.appendChild(tr);
  });
}

window.renderizarGrafico = function () {
  const canvas = document.getElementById('meuGrafico');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const historicoFiltro = historico.filter(item => item.filtro === filtroAtivo);

  const dadosPorFabricante = {};
  historicoFiltro.forEach(item => {
    if (!dadosPorFabricante[item.fabricante]) dadosPorFabricante[item.fabricante] = { soma: 0, qtd: 0 };
    dadosPorFabricante[item.fabricante].soma += item.durabilidade;
    dadosPorFabricante[item.fabricante].qtd += 1;
  });

  const rotulos = Object.keys(dadosPorFabricante);
  const medias = rotulos.map(fab => Math.round(dadosPorFabricante[fab].soma / dadosPorFabricante[fab].qtd));

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rotulos.length ? rotulos : ['Sem dados'],
      datasets: [{
        label: 'Média de Ciclos',
        data: medias.length ? medias : [0],
        backgroundColor: ['#880c46', '#05173f', '#412b07', '#280131'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: configAtual.textoSecundario || '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: configAtual.textoSecundario || '#94a3b8' } }
      }
    }
  });
};

// ==========================================
// 6. CONSUMO DE FLOCULANTE
// ==========================================
const refFloculante = doc(db, "appData", "floculante");
let estoqueGlobalFloculante = 1250;
let chartFloculanteInstance = null;
let historicoFloculante = [];

function salvarDadosFloculante() {
  setDoc(refFloculante, { estoque: estoqueGlobalFloculante, historico: historicoFloculante })
    .catch(err => console.error('Erro ao salvar floculante:', err));
}

window.lancarConsumoFloculante = function (event) {
  event.preventDefault();
  const qtd = parseFloat(document.getElementById('qtdPreparador').value);
  const resp = document.getElementById('respPreparador')?.value || 'Não informado';

  if (isNaN(qtd) || qtd <= 0) {
    alert('Informe uma quantidade válida.');
    return;
  }
  if (qtd > estoqueGlobalFloculante) {
    alert('Atenção: A quantidade informada é maior que o estoque atual!');
    return;
  }
  estoqueGlobalFloculante -= qtd;
  
  historicoFloculante.unshift({
    data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    qtd: qtd,
    responsavel: resp
  });

  salvarDadosFloculante();
  atualizarInterfaceFloculante();
  alert('Adição registrada com sucesso!');
  document.getElementById('qtdPreparador').value = '';
  document.getElementById('respPreparador').value = '';
};

window.reporEstoqueFloculante = function (event) {
  event.preventDefault();
  const qtd = parseFloat(document.getElementById('qtdReposta').value);
  const dataReposicao = document.getElementById('dataReposta').value;

  if (isNaN(qtd) || qtd <= 0) {
    alert('Informe uma quantidade válida para reposição.');
    return;
  }

  estoqueGlobalFloculante += qtd;
  historicoFloculante.unshift({
    data: dataReposicao ? new Date(dataReposicao).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
    qtd: -qtd,
    responsavel: 'Reposição de Estoque'
  });

  salvarDadosFloculante();
  atualizarInterfaceFloculante();
  alert('Estoque reposto com sucesso!');
  document.getElementById('qtdReposta').value = '';
  document.getElementById('dataReposta').value = '';
};

function atualizarInterfaceFloculante() {
  const elEstoque = document.getElementById('estoqueAtual');
  if (elEstoque) elEstoque.innerText = estoqueGlobalFloculante.toLocaleString() + ' kg';

  const adicoes = historicoFloculante.filter(item => item.qtd > 0);
  const elMedia = document.getElementById('mediaConsumoDiario');
  let media = 180;
  if (adicoes.length > 0) {
    const soma = adicoes.reduce((acc, curr) => acc + curr.qtd, 0);
    media = Math.round(soma / adicoes.length);
  }
  if (elMedia) elMedia.innerText = media.toLocaleString();
  renderizarGraficoFloculante();
}

window.renderizarGraficoFloculante = function () {
  const canvas = document.getElementById('graficoFloculante');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (chartFloculanteInstance) chartFloculanteInstance.destroy();

  const adicoes = historicoFloculante.filter(item => item.qtd > 0).slice(0, 7).reverse();
  const labels = adicoes.map(i => i.data.split(' ')[0]);
  const dataValores = adicoes.map(i => i.qtd);

  chartFloculanteInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Sem lançamentos'],
      datasets: [{
        label: 'Floculante Adicionado (kg)',
        data: dataValores.length ? dataValores : [0],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: configAtual.textoSecundario || '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
        y: { ticks: { color: configAtual.textoSecundario || '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
      }
    }
  });
};

// ==========================================
// 7. CHECKLIST DA USINA
// ==========================================
const EQUIPAMENTOS_CHECKLIST = {
  IBM: [],
  ITM: [
    'ITM Geral','SL-02','AL-02','TC-07','Caixa Polpagem','PN-02','TC-08','TC-09','TC-13',
    'PN-03A','PN-03/B','TC-10','SL-03','SL-04','SL-05','TP-01A','BP-01A1','BP-01A2','TP-01B',
    'BP-01B1','BP-01B2','Densímetro Linha A','Densímetro Linha B','SM-1A1','SM-2A1','SM-1A2',
    'SM-2A2','SM-1B1','SM-2B1','SM-1B2','SM-2B2','HC-01','HC-02','PN-04A','PN-04B','TC-11',
    'TP-02','BP-02A1','PN-05','BP-02A2','TP-03','BP-03/A1','BP-03/A2','SM-03A','SM-03B','TP-04',
    'BP-04A1','BP-04A2','TP-05','BP-05A1','BP-05A2','TP-06','BP-06A1','BP-06A2','TP-07','TP-09',
    'BP-09A1','BP-09A2','ES-01','ES-02','BP-O7A','BP-07B','AG-TP08A','AG-TP08B','TP-08A','TP-08B',
    'BP-08A1','BP-08A2','BP-08B1','BP-08B2','BF-01','BF-02','AG-TF01','DF-01','CF-01','ES-03',
    'TD-01','BD-01','TC-17A','TC-17B','TC-18','FP-01','FP-02','PN02-BA01','TF-01','TF-02','TF-03',
    'CX-01 ÁGUA RECUPERADA','CX-02 ÁGUA RECUPERADA','CX-03 ÁGUA NOVA','BA-02A1','BA-02A3'
  ],
  Moagem: [
    'Moagem Geral','BP-10A1','BP-10A2','AL-02B','TC-07B','TC-16','TC-20','TC-21','PN-07A','PN-07B',
    'PN-07C','TC-15','SL-07','SL-08','AL-03A','AL-03B','TC-19A','TC-19B','EX-19A','EX-19B','DM-19A',
    'DM-19B','BR-03A','BR-03B','AL-04B','AL-04C','AL-04D','TC-22B','TC-22C','TC-22D','EX-22B',
    'EX-22C','EX-22D','DM-22C','DM-22B','DM-22D','BR-04B','BR-04C','BR-04D','TC-23','TC-24','TC-25',
    'TC-26','PN07-BA01','PN07-BA02'
  ]
};

let areaChecklistAtiva = 'ITM';
let statusChecklistAtual = {};

window.mudarAreaChecklist = function (area) {
  areaChecklistAtiva = area;
  ['IBM', 'ITM', 'Moagem'].forEach(a => {
    const btn = document.getElementById('btnArea' + a);
    if (!btn) return;
    btn.className = a === area
      ? 'px-5 py-2.5 rounded-lg font-semibold text-sm btn-principal transition-all shadow'
      : 'px-5 py-2.5 rounded-lg font-semibold text-sm transition-all text-slate-400 hover:text-white';
  });
  renderizarFormChecklist();
};

function renderizarFormChecklist() {
  const container = document.getElementById('listaChecklist');
  if (!container) return;
  container.innerHTML = '';
  statusChecklistAtual = {};

  const equipamentos = EQUIPAMENTOS_CHECKLIST[areaChecklistAtiva] || [];
  equipamentos.forEach((nome) => {
    statusChecklistAtual[nome] = { status: 'OK', observacao: '' };
    const div = document.createElement('div');
    div.className = 'border border-slate-700 rounded-lg p-3 bg-slate-900/60';
    div.innerHTML = `
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <span class="text-sm font-medium text-white">${nome}</span>
        <div class="flex gap-2">
          <button type="button" class="btn-status-ok px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white">OK</button>
          <button type="button" class="btn-status-naook px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300">Não OK</button>
        </div>
      </div>
      <textarea placeholder="Observação..." class="hidden w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none" rows="2"></textarea>
    `;
    container.appendChild(div);

    const btnOk = div.querySelector('.btn-status-ok');
    const btnNaoOk = div.querySelector('.btn-status-naook');
    const textarea = div.querySelector('textarea');

    btnOk.addEventListener('click', () => {
      statusChecklistAtual[nome].status = 'OK';
      btnOk.className = 'btn-status-ok px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white';
      btnNaoOk.className = 'btn-status-naook px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300';
      textarea.classList.add('hidden');
    });

    btnNaoOk.addEventListener('click', () => {
      statusChecklistAtual[nome].status = 'NAO_OK';
      btnNaoOk.className = 'btn-status-naook px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white';
      btnOk.className = 'btn-status-ok px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300';
      textarea.classList.remove('hidden');
    });

    textarea.addEventListener('input', (e) => {
      statusChecklistAtual[nome].observacao = e.target.value;
    });
  });
}

window.salvarChecklist = async function (e) {
  e.preventDefault();
  const itens = Object.entries(statusChecklistAtual).map(([nome, dados]) => ({
    equipamento: nome,
    status: dados.status,
    observacao: dados.observacao || ''
  }));

  const qtdNaoOk = itens.filter(i => i.status === 'NAO_OK').length;

  try {
    await addDoc(collection(db, "checklists"), {
      area: areaChecklistAtiva,
      data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      usuario: nomeUsuarioLogado || 'desenvolvimento',
      itens: itens,
      qtdNaoOk: qtdNaoOk,
      criadoEm: Date.now()
    });
    alert(`Checklist da área ${areaChecklistAtiva} salvo com sucesso!`);
    renderizarFormChecklist();
  } catch (err) {
    console.error(err);
    alert('Não foi possível salvar o checklist.');
  }
};

let listenerChecklistAtivo = false;
function iniciarListenerChecklist() {
  if (listenerChecklistAtivo) return;
  listenerChecklistAtivo = true;

  const q = query(collection(db, "checklists"), orderBy("criadoEm", "desc"), limit(20));
  onSnapshot(q, (snap) => {
    const tbody = document.getElementById('tabelaHistoricoChecklist');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">Nenhum checklist enviado ainda.</td></tr>';
      return;
    }

    snap.forEach(docSnap => {
      const item = docSnap.data();
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/50 border-b border-slate-700/50';
      const corNaoOk = item.qtdNaoOk > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold';
      tr.innerHTML = `
        <td class="p-3 text-xs">${item.data}</td>
        <td class="p-3 font-medium text-white">${item.area}</td>
        <td class="p-3 text-xs">${item.usuario}</td>
        <td class="p-3 ${corNaoOk}">${item.qtdNaoOk}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

// ==========================================
// 8. DASHBOARD GERAL
// ==========================================
let chartDashboardInstance = null;

function renderizarDashboard() {
  const totalEstoque = Object.values(estoqueSaldo).reduce((soma, qtd) => soma + qtd, 0);
  const criticos = Object.values(estoqueSaldo).filter(qtd => qtd <= 2).length;
  const placasAtivas = Object.keys(placasInstaladas[1] || {}).length + Object.keys(placasInstaladas[2] || {}).length;

  const elTotal = document.getElementById('dashTotalEstoque');
  const elCriticos = document.getElementById('dashCriticos');
  const elPlacas = document.getElementById('dashPlacasAtivas');
  if (elTotal) elTotal.innerText = totalEstoque;
  if (elCriticos) elCriticos.innerText = criticos;
  if (elPlacas) elPlacas.innerText = placasAtivas;

  const canvas = document.getElementById('graficoDashboard');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const rotulos = Object.keys(estoqueSaldo);
  const valores = rotulos.map(fab => estoqueSaldo[fab]);

  if (chartDashboardInstance) chartDashboardInstance.destroy();

  chartDashboardInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: rotulos.length ? rotulos : ['Sem dados'],
      datasets: [{
        label: 'Saldo em Estoque',
        data: valores.length ? valores : [0],
        backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'],
        borderColor: configAtual.fundoApp || '#0f172a',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: { color: configAtual.textoSecundario || '#94a3b8' }
        }
      }
    }
  });
}

// ==========================================
// 9. INICIALIZAÇÃO E SINCRONIZAÇÃO FIRESTORE
// ==========================================
let listenersAtivos = false;

function iniciarListenersFirestore() {
  if (listenersAtivos) return;
  listenersAtivos = true;

  onSnapshot(refEstoque, (snap) => {
    if (snap.exists()) {
      const dados = snap.data();
      estoqueSaldo = dados.saldo || estoqueSaldo;
      estoqueMovimentacoes = dados.movimentacoes || [];
    } else {
      salvarDadosEstoque();
    }
    atualizarSelectEstoqueForm();
    window.renderizarEstoque();
    renderizarDashboard();
  });

  onSnapshot(refOperacao, (snap) => {
    if (snap.exists()) {
      const dados = snap.data();
      placasInstaladas = dados.placas || placasInstaladas;
      historico = dados.historico || [];
    } else {
      salvarDados();
    }
    atualizarSelectPlacasRetirar();
    renderizarTabela();
    window.renderizarGrafico();
    renderizarDashboard();
  });

  onSnapshot(refFloculante, (snap) => {
    if (snap.exists()) {
      const dados = snap.data();
      estoqueGlobalFloculante = dados.estoque !== undefined ? dados.estoque : 1250;
      historicoFloculante = dados.historico || [];
    } else {
      salvarDadosFloculante();
    }
    atualizarInterfaceFloculante();
  });
}

// ==========================================
// PONTO DE ENTRADA DO APLICATIVO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  vincularPickerHex('pickerCorPrincipal', 'hexCorPrincipal');
  vincularPickerHex('pickerCorDestaque', 'hexCorDestaque');
  vincularPickerHex('pickerTextoPrincipal', 'hexTextoPrincipal');
  vincularPickerHex('pickerTextoSecundario', 'hexTextoSecundario');
  vincularPickerHex('pickerFundoApp', 'hexFundoApp');

  aplicarConfiguracoes(configAtual);

  if (!LOGIN_ATIVO) {
    // Acesso direto liberado (Sem exigência de login)
    nomeUsuarioLogado = 'Modo de Desenvolvimento';
    
    const telaLogin = document.getElementById('telaLogin');
    const appConteudo = document.getElementById('appConteudo');
    
    if (telaLogin) {
      telaLogin.classList.add('hidden');
      telaLogin.style.display = 'none';
    }
    if (appConteudo) {
      appConteudo.classList.remove('hidden');
      appConteudo.style.display = 'block';
    }

    const infoUsuario = document.getElementById('infoUsuarioLogado');
    if (infoUsuario) infoUsuario.innerText = nomeUsuarioLogado;

    iniciarListenersFirestore();
    window.mudarTela('dashboard');
    window.mudarFiltro(1);
  } else {
    // Futura reativação do Firebase Auth
    onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        mostrarApp(usuario);
      } else {
        mostrarLogin();
      }
    });
    window.mudarFiltro(1);
  }
});