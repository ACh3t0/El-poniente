import {
    obtenerSesion, listarUsuarios, crearUsuario,
    editarUsuario, cambiarEstado, cerrarSesion, eliminarUsuario
} from "../services/usuarios.service.js";

const TIPOS = { 1: "Empleado (vendedor)", 2: "Administrador", 3: "Encargado de producción" };
const ADMIN = 2;
import { protegerPagina } from "../services/sesion.js";

const $ = (id) => document.getElementById(id);

let yo = null;          // quién tiene la sesión abierta
let usuarios = [];
let editandoId = null;  // null = creando, número = editando

function irALogin() {
    location.href = "./login.html";
}

function avisar(texto, esError = false) {
    const mensaje = $("mensaje");
    mensaje.textContent = texto;
    mensaje.className = esError ? "error" : "ok";
    mensaje.hidden = false;
}

function manejarError(error, destino) {
    if (error.status === 401) return irALogin();
    if (destino.id === "mensaje") return avisar(error.message, true);
    destino.textContent = error.message;
}

function celda(texto) {
    const td = document.createElement("td");
    td.textContent = texto; // textContent evita que un nombre con código se ejecute
    return td;
}

function boton(texto, alHacerClic) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = texto;
    b.className = "secundario";
    b.addEventListener("click", alHacerClic);
    return b;
}

function dibujarTabla() {
    const cuerpo = $("tabla-usuarios");
    cuerpo.replaceChildren();

    for (const u of usuarios) {
        const fila = document.createElement("tr");
        if (!u.isActive) fila.classList.add("inactivo");

        const nombre = u.userName + (u.userId === yo.userId ? " (tú)" : "");
        fila.append(
            celda('USR-' + String(u.userId).padStart(3, '0')),
            celda(nombre),
            celda(TIPOS[u.accountType] ?? "Desconocido"),
            celda(u.isActive ? "Activo" : "Desactivado")
        );

        const acciones = document.createElement("td");
        // El Administrador gestiona todos los roles.
        const puedeTocar = yo.accountType === ADMIN;
        if (puedeTocar) {
            acciones.append(boton("Editar", () => abrirEditar(u)));
            if (u.userId !== yo.userId) {
                const eliminar = boton('Eliminar', async () => {
                    if (!confirm(`¿Estás seguro de querer eliminar al usuario "${u.userName}"? Esta acción no se puede deshacer.`)) return;
                    eliminar.disabled = true;
                    try {
                        await eliminarUsuario(u.userId);
                        if (editandoId === u.userId) abrirNuevo();
                        avisar('Usuario eliminado.');
                        await cargar();
                    } catch (error) { manejarError(error, $('mensaje')); }
                    finally { eliminar.disabled = false; }
                });
                eliminar.className = 'btn-eliminar-registro';
                acciones.append(eliminar);
                acciones.append(boton(u.isActive ? "Desactivar" : "Activar", () => alternar(u)));
            }
        }
        fila.append(acciones);
        cuerpo.append(fila);
    }
}

async function cargar() {
    try {
        usuarios = await listarUsuarios();
        dibujarTabla();
    } catch (error) {
        manejarError(error, $("mensaje"));
    }
}

function prepararFormulario() {
    $("formulario").reset();
    $("error-form").textContent = "";

}

function abrirNuevo() {
    editandoId = null;
    prepararFormulario();
    $("titulo-dialogo").textContent = "Registrar Nuevo Usuario del Sistema";
    $("password").required = true;
    $("ayuda-password").textContent = "De 8 a 128 caracteres.";
    $("tipo").disabled = false;
    $("usuario").focus();
}

function abrirEditar(u) {
    editandoId = u.userId;
    prepararFormulario();
    $("titulo-dialogo").textContent = "Editar usuario";
    $("usuario").value = u.userName;
    $("tipo").value = String(u.accountType);
    $("password").required = false;
    $("ayuda-password").textContent = "Déjala vacía para conservar la contraseña actual.";
    // Nadie puede cambiar su propio tipo de cuenta.
    $("tipo").disabled = u.userId === yo.userId;
    $("usuario").focus();
    $("dialogo").scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function alternar(u) {
    const accion = u.isActive ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que quieres ${accion} a ${u.userName}?`)) return;
    try {
        await cambiarEstado(u.userId, !u.isActive);
        avisar(u.isActive ? "Usuario desactivado." : "Usuario activado.");
        await cargar();
    } catch (error) {
        manejarError(error, $("mensaje"));
    }
}

$("formulario").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const usuario = $("usuario").value.trim();
    const tipo = Number($("tipo").value);
    const password = $("password").value;
    const esNuevo = editandoId === null;
    const guardar = evento.submitter;
    if (guardar.disabled) return;
    guardar.disabled = true;

    try {
        if (esNuevo) {
            await crearUsuario(usuario, password, tipo);
        } else {
            await editarUsuario(editandoId, usuario, tipo, password);
        }
        abrirNuevo();
        avisar(esNuevo ? "Usuario creado." : "Usuario actualizado.");
        await cargar();
    } catch (error) {
        manejarError(error, $("error-form"));
    } finally { guardar.disabled = false; }
});

$("btn-nuevo").addEventListener("click", abrirNuevo);
$("btn-cancelar").addEventListener("click", abrirNuevo);

async function iniciar() {
    try {
        yo = await protegerPagina();
        if (!yo) return;
    } catch {
        return irALogin();
    }

    if (yo.accountType !== ADMIN) {
        document.querySelector("main").innerHTML =
            "<h1>Usuarios</h1><p>No tienes permiso para ver esta página.</p>";
        return;
    }

    abrirNuevo();
    await cargar();
}

iniciar();
