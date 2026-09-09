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
  onSnapshot
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

// Referências dos dois documentos compartilhados no Firestore
const refEstoque = doc(db, "appData", "estoque");
const refOperacao = doc(db, "appData", "operacao");

// Domínio "falso" usado para transformar matrícula em email (exigência do Firebase Auth)
const DOMINIO_LOGIN = "controle-tecidos.local";

// Nome da pessoa logada, preenchido depois do login (vem do Firestore)
let nomeUsuarioLogado = "";

// ==========================================
// 1. CONFIGURAÇÃO DE APARÊNCIA (continua local, por navegador)
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
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
      picker.value = e.target.value;
    }
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

  if (typeof renderizarGrafico === 'function') {
    renderizarGrafico();
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
// 2. NAVEGAÇÃO PRINCIPAL
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
// 3. ESTOQUE DE TECIDOS (COMPARTILHADO VIA FIRESTORE)
// ==========================================
let estoqueSaldo = {
  'Fabricante Valmet': 10,
  'Fabricante Jin Jing': 5,
  'Fabricante Matec': 7
};
let estoqueMovimentacoes = [];

function salvarDadosEstoque() {
  setDoc(refEstoque, {
    saldo: estoqueSaldo,
    movimentacoes: estoqueMovimentacoes
  }).catch(err => {
    console.error('Erro ao salvar estoque:', err);
    alert('Não foi possível salvar no servidor. Verifique sua conexão.');
  });
}

function lancarEntradaEstoque(e) {
  e.preventDefault();
  const fabInput = document.getElementById('estoqueFabricante').value.trim();
  const qtd = Number(document.getElementById('estoqueQtd').value);

  if (!fabInput || isNaN(qtd) || qtd <= 0) {
    alert('Informe um fabricante válido e uma quantidade maior que zero.');
    return;
  }

  const chaveExistente = Object.keys(estoqueSaldo).find(
    key => key.toLowerCase() === fabInput.toLowerCase()
  );
  const nomeFabricante = chaveExistente || fabInput;

  estoqueSaldo[nomeFabricante] = (Number(estoqueSaldo[nomeFabricante]) || 0) + qtd;

  estoqueMovimentacoes.unshift({
    data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tipo: 'Entrada',
    fabricante: nomeFabricante,
    qtd: qtd,
    detalhe: 'Compra de tecidos',
    usuario: nomeUsuarioLogado || 'desconhecido'
  });

  salvarDadosEstoque();

  document.getElementById('estoqueFabricante').value = '';
  document.getElementById('estoqueQtd').value = '';

  alert(`Entrada de ${qtd} unidades para "${nomeFabricante}" somada ao estoque!`);
}

function renderizarEstoque() {
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
}

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
// 4. OPERAÇÃO DOS FILTROS PRENSA (COMPARTILHADO VIA FIRESTORE)
// ==========================================
let filtroAtivo = 1;
let abaAtiva = 'instalar';
let chartInstance = null;

let placasInstaladas = { 1: {}, 2: {} };
let historico = [];

function salvarDados() {
  setDoc(refOperacao, {
    placas: placasInstaladas,
    historico: historico
  }).catch(err => {
    console.error('Erro ao salvar operação:', err);
    alert('Não foi possível salvar no servidor. Verifique sua conexão.');
  });
}

function mudarFiltro(numeroFiltro) {
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
}

function mudarAba(aba) {
  abaAtiva = aba;
  const btnInstalar = document.getElementById('abaInstalarBtn');
  const btnRetirar = document.getElementById('abaRetirarBtn');
  const formInstalar = document.getElementById('formInstalar');
  const formRetirar = document.getElementById('formRetirar');

  if (aba === 'instalar') {
    btnInstalar.className = 'flex-1 pb-3 font-semibold text-sm border-b-2 text-destaque';
    btnInstalar.style.borderColor = 'var(--cor-destaque)';
    btnRetirar.className = 'flex-1 pb-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-white';
    btnRetirar.style.borderColor = 'transparent';
    formInstalar.classList.remove('hidden');
    formRetirar.classList.add('hidden');
  } else {
    btnRetirar.className = 'flex-1 pb-3 font-semibold text-sm border-b-2 text-amber-400 border-amber-400';
    btnRetirar.style.borderColor = '#fbbf24';
    btnInstalar.className = 'flex-1 pb-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-white';
    btnInstalar.style.borderColor = 'transparent';
    formRetirar.classList.remove('hidden');
    formInstalar.classList.add('hidden');
    atualizarSelectPlacasRetirar();
  }
}

function salvarInstalacao(e) {
  e.preventDefault();

  const numPlaca = document.getElementById('numPlacaInstalar').value;
  const fabricante = document.getElementById('fabricanteInstalar').value;
  const ciclo = Number(document.getElementById('cicloInstalacao').value);

  if (!fabricante || (estoqueSaldo[fabricante] || 0) <= 0) {
    alert('Selecione uma lona com saldo disponível no estoque.');
    return;
  }

  if (placasInstaladas[filtroAtivo][numPlaca]) {
    if (!confirm(`A Placa ${numPlaca} já possui um tecido em uso. Deseja substituir?`)) {
      return;
    }
  }

  estoqueSaldo[fabricante] -= 1;
  estoqueMovimentacoes.unshift({
    data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tipo: 'Saida',
    fabricante: fabricante,
    qtd: 1,
    detalhe: `Instalação na Placa ${numPlaca} (Filtro ${filtroAtivo})`,
    usuario: nomeUsuarioLogado || 'desconhecido'
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
}

function atualizarSelectPlacasRetirar() {
  const select = document.getElementById('selectPlacaRetirar');
  if (!select) return;

  select.innerHTML = '<option value="">Selecione uma placa...</option>';

  const placas = placasInstaladas[filtroAtivo] || {};
  const numeros = Object.keys(placas).sort((a, b) => Number(a) - Number(b));

  numeros.forEach(num => {
    const option = document.createElement('option');
    option.value = num;
    option.innerText = `Placa ${num} (${placas[num].fabricante})`;
    select.appendChild(option);
  });

  document.getElementById('boxInfoPlaca').classList.add('hidden');
}

function atualizarInfoPlaca() {
  const numPlaca = document.getElementById('selectPlacaRetirar').value;
  const box = document.getElementById('boxInfoPlaca');

  if (!numPlaca) {
    box.classList.add('hidden');
    return;
  }

  const info = placasInstaladas[filtroAtivo][numPlaca];
  if (info) {
    document.getElementById('infoFabricante').innerText = info.fabricante;
    document.getElementById('infoCicloEntrada').innerText = `${info.cicloInstalacao} ciclos`;
    box.classList.remove('hidden');
  }
}

function salvarBaixa(e) {
  e.preventDefault();

  const numPlaca = document.getElementById('selectPlacaRetirar').value;
  const cicloRetirada = Number(document.getElementById('cicloRetirada').value);

  if (!numPlaca) return;

  const instalacao = placasInstaladas[filtroAtivo][numPlaca];

  if (cicloRetirada < instalacao.cicloInstalacao) {
    alert('O ciclo de retirada deve ser maior ou igual ao ciclo de instalação!');
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
}

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

function renderizarGrafico() {
  const canvas = document.getElementById('meuGrafico');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const historicoFiltro = historico.filter(item => item.filtro === filtroAtivo);

  const dadosPorFabricante = {};
  historicoFiltro.forEach(item => {
    if (!dadosPorFabricante[item.fabricante]) {
      dadosPorFabricante[item.fabricante] = { soma: 0, qtd: 0 };
    }
    dadosPorFabricante[item.fabricante].soma += item.durabilidade;
    dadosPorFabricante[item.fabricante].qtd += 1;
  });

  const rotulos = Object.keys(dadosPorFabricante);
  const medias = rotulos.map(fab => Math.round(dadosPorFabricante[fab].soma / dadosPorFabricante[fab].qtd));

  if (chartInstance) {
    chartInstance.destroy();
  }

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
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: configAtual.textoSecundario || '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: configAtual.textoSecundario || '#94a3b8' }
        }
      }
    }
  });
}

// Expor funções chamadas via onclick/onsubmit no HTML
window.lancarEntradaEstoque = lancarEntradaEstoque;
window.renderizarEstoque = renderizarEstoque;
window.mudarFiltro = mudarFiltro;
window.mudarAba = mudarAba;
window.salvarInstalacao = salvarInstalacao;
window.atualizarInfoPlaca = atualizarInfoPlaca;
window.salvarBaixa = salvarBaixa;
window.renderizarGrafico = renderizarGrafico;

// ==========================================
// 5. LOGIN / AUTENTICAÇÃO
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
      // Primeira vez: grava os valores padrão no Firestore
      salvarDadosEstoque();
    }
    atualizarSelectEstoqueForm();
    renderizarEstoque();
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
    renderizarGrafico();
  });
}

async function mostrarApp(usuario) {
  document.getElementById('telaLogin').classList.add('hidden');
  document.getElementById('appConteudo').classList.remove('hidden');

  // Extrai a matrícula do email sintético (ex: "12345@controle-tecidos.local" -> "12345")
  const matricula = usuario.email.split('@')[0];

  const infoUsuario = document.getElementById('infoUsuarioLogado');
  try {
    const snapUsuario = await getDoc(doc(db, "usuarios", matricula));
    nomeUsuarioLogado = snapUsuario.exists() ? snapUsuario.data().nome : matricula;
  } catch (err) {
    console.error('Erro ao buscar nome do usuário:', err);
    nomeUsuarioLogado = matricula;
  }
  if (infoUsuario) infoUsuario.innerText = nomeUsuarioLogado;

  iniciarListenersFirestore();
}

function mostrarLogin() {
  document.getElementById('telaLogin').classList.remove('hidden');
  document.getElementById('appConteudo').classList.add('hidden');
}

window.fazerLogin = function (e) {
  e.preventDefault();
  const matricula = document.getElementById('loginMatricula').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const erroEl = document.getElementById('loginErro');
  erroEl.classList.add('hidden');

  const emailSintetico = `${matricula}@${DOMINIO_LOGIN}`;

  signInWithEmailAndPassword(auth, emailSintetico, senha)
    .catch((err) => {
      erroEl.innerText = 'Matrícula ou senha inválidas.';
      erroEl.classList.remove('hidden');
      console.error(err);
    });
};

window.fazerLogout = function () {
  signOut(auth);
};

onAuthStateChanged(auth, (usuario) => {
  if (usuario) {
    mostrarApp(usuario);
  } else {
    mostrarLogin();
  }
});

// ==========================================
// 6. INICIALIZAÇÃO GERAL (aparência, pickers)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  vincularPickerHex('pickerCorPrincipal', 'hexCorPrincipal');
  vincularPickerHex('pickerCorDestaque', 'hexCorDestaque');
  vincularPickerHex('pickerTextoPrincipal', 'hexTextoPrincipal');
  vincularPickerHex('pickerTextoSecundario', 'hexTextoSecundario');
  vincularPickerHex('pickerFundoApp', 'hexFundoApp');

  aplicarConfiguracoes(configAtual);
  mudarFiltro(1);
});
