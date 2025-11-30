const dias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const semanaDiv = document.getElementById("semana");
const horasContainer = document.getElementById("horas-container");
const tituloDia = document.getElementById("titulo-dia");
const gradeHoras = document.getElementById("grade-horas");

const modal = document.getElementById("modal");
const inputAtividade = document.getElementById("input-atividade");
const modalHora = document.getElementById("modal-hora");
const ativarNotificacao = document.getElementById("ativar-notificacao");

let diaAtual = "";
let horaAtual = "";

// Cria dias
dias.forEach(dia => {
    const div = document.createElement("div");
    div.className = "dia";
    div.textContent = dia;
    div.onclick = () => abrirDia(dia);
    semanaDiv.appendChild(div);
});

// Abre grade de horas do dia
function abrirDia(dia) {
    diaAtual = dia;
    semanaDiv.classList.add("hidden");
    horasContainer.classList.remove("hidden");

    tituloDia.textContent = dia;
    gradeHoras.innerHTML = "";

    for (let h = 6; h <= 22; h++) {
        const div = document.createElement("div");
        div.className = "hora";

        const texto = `${String(h).padStart(2, "0")}:00`;
        div.textContent = texto;

        div.onclick = () => abrirModal(texto);

        gradeHoras.appendChild(div);
    }
}

// Modal para salvar atividade
function abrirModal(hora) {
    modal.classList.remove("hidden");
    modalHora.textContent = `${diaAtual} — ${hora}`;
    horaAtual = hora;
}

// Botão cancelar
document.getElementById("cancelar").onclick = () => {
    modal.classList.add("hidden");
    inputAtividade.value = "";
    ativarNotificacao.checked = false;
};

// Salvar atividade
document.getElementById("salvar").onclick = () => {
    const atividade = inputAtividade.value;

    if (!atividade) return alert("Digite uma atividade!");

    const chave = `atividade-${diaAtual}-${horaAtual}`;
    localStorage.setItem(chave, atividade);

    if (ativarNotificacao.checked) agendarNotificacao(atividade);

    modal.classList.add("hidden");
    inputAtividade.value = "";
    ativarNotificacao.checked = false;
};

// Notificação local
async function agendarNotificacao(atividade) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    new Notification("Lembrete", {
        body: atividade,
    });
}

// Botão voltar
document.getElementById("btn-voltar").onclick = () => {
    horasContainer.classList.add("hidden");
    semanaDiv.classList.remove("hidden");
};
