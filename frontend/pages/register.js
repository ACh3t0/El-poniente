import { register, consultarConfiguracion } from "../services/register.service.js";

const formulario = document.getElementById("registerForm");
const boton = document.querySelector('button[form="registerForm"]');
let inicial = false;
boton.disabled = true;
const aviso = document.createElement("p");
aviso.setAttribute("role", "status");
formulario.before(aviso);
try {
    inicial = await consultarConfiguracion();
    if (inicial) {
        document.title = "Configuraci\u00f3n inicial | El Poniente";
        document.getElementById("register-title").textContent = "Crear primer Administrador";
        aviso.textContent = "Bienvenido. Crea la cuenta de Administrador para comenzar a usar el sistema.";
        const selector = document.getElementById("accountType");
        selector.replaceChildren(new Option("Administrador", "2"));
        selector.disabled = true;
        boton.textContent = "Crear Administrador";
    }
    boton.disabled = false;
} catch (error) {
    aviso.textContent = error.message + " Recarga la p\u00e1gina para volver a intentar.";
    aviso.setAttribute("role", "alert");
}
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (boton.disabled) return;
    boton.disabled = true;
    try {
        const resultado = await register(
            document.getElementById("usuario").value.trim(),
            document.getElementById("password").value,
            Number(document.getElementById("accountType").value),
            inicial
        );
        alert(resultado.mensaje);
        window.location.href = "./login.html";
    } catch (error) {
        alert(error.message);
    } finally {
        boton.disabled = false;
    }
});
