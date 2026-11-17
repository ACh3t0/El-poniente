export async function pedir(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...opciones.headers }
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        const rutaEliminacion = opciones.method === 'DELETE' && url.startsWith('/api/inventario/');
        const error = new Error(datos.mensaje || (rutaEliminacion && respuesta.status === 404
            ? "El servidor no tiene cargada la función de eliminar. Reinicia el backend y vuelve a intentarlo."
            : "No se pudo completar la operación."));
        error.status = respuesta.status;
        throw error;
    }
    return datos;
}
