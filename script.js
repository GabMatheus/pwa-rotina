// ---------------------
// DADOS
// ---------------------
let diaSelecionado = "";
let horaSelecionada = "";

const horasDia = [];
for (let h = 6; h <= 22; h++) {
    horasDia.push(`${String(h).padStart(2, "0")}:00`);
}

// ---------------------
// ELEMENTOS
// ---------------------
const telaSemana = document.getElementById("semana");
const telaDia = document.getElementById("tela-dia");
const gradeHoras = document.getElementById("grade-horas");

const modal = document.getElementById("modal");
const inputAtividade = document.getElementById("input-atividade");
const ativarLembrete = document.getElementById("ativar-lembrete");

// ---------------------
// EVENTOS DOS DIAS
// ---------------------
document.querySelectorAll(".dia").forEach(d => {
    d.addEventListener("click", () => abrirDia(d.dataset.dia));
});

// ---------------------
// FUNÇÕES DE TELAS
// ---------------------
function abrirDia(dia) {
    diaSelecionado = dia;

    document.getElementById("titulo-dia").innerText = dia;
    telaSemana.classList.add("hidden");
    telaDia.classList.remove("hidden");

    montarHoras();
}

function voltarSemana() {
    telaDia.classList.add("hidden");
    telaSemana.classList.remove("hidden");
}

// ---------------------
// MONTAR GRADE DE HORAS
// ---------------------
function montarHoras() {
    gradeHoras.innerHTML = "";

    horasDia.forEach(h => {
        const chave = `${diaSelecionado}-${h}`;
        const salvo = JSON.parse(localStorage.getItem(chave));

        const div = document.createElement("div");
        div.classList.add("hora");
        div.dataset.hora = h;

        div.innerHTML = `
            <small>${h}</small>
            <div class="texto-atividade">${salvo?.texto || ""}</div>
            ${salvo?.lembrete ? '<div class="notif-icone">🔔</div>' : ''}
        `;

        div.addEventListener("click", () => abrirModal(h));
        gradeHoras.appendChild(div);
    });
}

// ---------------------
// MODAL
// ---------------------
function abrirModal(hora) {
    horaSelecionada = hora;

    const chave = `${diaSelecionado}-${hora}`;
    const salvo = JSON.parse(localStorage.getItem(chave));

    document.getElementById("modal-titulo").innerText = `${diaSelecionado} - ${hora}`;

    inputAtividade.value = salvo?.texto || "";
    ativarLembrete.checked = salvo?.lembrete || false;

    modal.classList.remove("hidden");
    inputAtividade.focus();
}

function fecharModal() {
    modal.classList.add("hidden");
}

// ---------------------
// SALVAR ATIVIDADE
// ---------------------
function salvarAtividade() {
    const chave = `${diaSelecionado}-${horaSelecionada}`;

    const dados = {
        texto: inputAtividade.value.trim(),
        lembrete: ativarLembrete.checked
    };

    localStorage.setItem(chave, JSON.stringify(dados));

    fecharModal();
    montarHoras(); // atualizar tela

    if (dados.lembrete) {
        solicitarPermissaoNotificacao();
    }
}

// ---------------------
// NOTIFICAÇÕES
// ---------------------
function solicitarPermissaoNotificacao() {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}
