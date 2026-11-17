import { login } from "../services/login.service.js";
import { consultarConfiguracion } from "../services/register.service.js";
const formulario = document.getElementById("loginForm");
try {
    if (await consultarConfiguracion()) window.location.replace("./register.html");
} catch (error) {
    const aviso = document.createElement("p");
    aviso.setAttribute("role", "alert");
    aviso.textContent = error.message;
    formulario.before(aviso);
}
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
        const resultado = await login(
            document.getElementById("userName").value.trim(),
            document.getElementById("password").value,
            Number(document.getElementById("accountType").value)
        );
        alert(resultado.mensaje);
        window.location.href = resultado.destino || "./ventas.html";
    } catch (error) {
        alert(error.message);
    }
});
