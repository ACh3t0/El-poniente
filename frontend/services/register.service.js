export async function consultarConfiguracion() {
    const respuesta = await fetch("/api/setup", { cache: "no-store" });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo consultar la configuraci\u00f3n inicial.");
    return resultado.necesitaConfiguracion;
}

export async function register(usuario, password, accountType, inicial = false) {
    const respuesta = await fetch(inicial ? "/api/setup" : "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password, accountType })
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo registrar el usuario.");
    return resultado;
}
