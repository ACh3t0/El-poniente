import { protegerPagina } from "../services/sesion.js";
import { listarInventario, agregarExistencia, eliminarProducto } from "../services/inventario.service.js";

const $ = id => document.getElementById(id);
const ADMIN = 2;

let puedeGestionar = false;
let productosActuales = [];

function avisar(texto, esError = false) {
    const mensaje = $("mensaje");
    mensaje.textContent = texto;
    mensaje.className = esError ? "error" : "ok";
    mensaje.hidden = false;
}

function celda(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
}

function manejarError(error) {
    if (error.status === 401) {
        location.href = "./login.html";
        return;
    }
    avisar(error.message, true);
}

function dibujarTabla(productos) {
    const cuerpo = $("tabla-inventario");
    cuerpo.replaceChildren();

    if (productos.length === 0) {
        const fila = document.createElement("tr");
        const celdaVacia = celda("No hay productos registrados.");
        celdaVacia.colSpan = 7;
        fila.appendChild(celdaVacia);
        cuerpo.appendChild(fila);
        return;
    }

    for (const producto of productos) {
        const fila = document.createElement("tr");
        if (!producto.isActive) fila.classList.add("inactivo");
        const tipo = celda('');
        const etiqueta = document.createElement('span');
        etiqueta.className = 'etiqueta-tipo' + (producto.tipo === 'Materia prima' ? ' materia' : '');
        etiqueta.textContent = producto.tipo === 'Terminado' ? 'Producto terminado' : producto.tipo;
        tipo.append(etiqueta);
        const estado = celda(!producto.isActive ? 'Desactivado' : Number(producto.existencia) <= 0 ? 'Sin existencias' : Number(producto.existencia) <= Number(producto.stockMinimo || 0) ? 'Stock bajo' : 'Disponible');
        estado.className = Number(producto.existencia) <= Number(producto.stockMinimo || 0) ? 'estado-bajo' : 'estado-disponible';
        fila.append(
            celda('INV-' + String(producto.productoId).padStart(3, '0')),
            celda(producto.nombre),
            tipo,
            celda(`$${Number(producto.precioVenta).toFixed(2)}`),
            celda(`${Number(producto.existencia)} ${producto.unidad}`),
            estado
        );

        const acciones = document.createElement("td");
        if (puedeGestionar) {
            const editar = document.createElement('a');
            editar.href = './productos.html?editar=' + encodeURIComponent(producto.productoId);
            editar.className = 'editar-producto';
            editar.textContent = 'Editar';
            acciones.append(editar);
            const eliminar = document.createElement('button');
            eliminar.type = 'button';
            eliminar.className = 'eliminar-producto';
            eliminar.textContent = 'Eliminar';
            eliminar.addEventListener('click', async () => {
                if (!window.confirm(`¿Estás seguro de querer eliminar el producto "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;
                eliminar.disabled = true;
                try {
                    await eliminarProducto(producto.productoId);
                    avisar(`Producto eliminado: ${producto.nombre}.`);
                    await cargar();
                } catch (error) {
                    manejarError(error);
                } finally {
                    eliminar.disabled = false;
                }
            });
            acciones.append(eliminar);
        }
        if (puedeGestionar && producto.isActive) {
            const formulario = document.createElement("form");
            formulario.className = "acciones-stock";

            const cantidad = document.createElement("input");
            cantidad.type = "number";
            cantidad.min = "1";
            cantidad.step = "1";
            cantidad.required = true;
            cantidad.setAttribute("aria-label", `Unidades que se agregan a ${producto.nombre}`);

            const boton = document.createElement("button");
            boton.type = "submit";
            boton.textContent = "Agregar stock";
            formulario.append(cantidad, boton);
            formulario.addEventListener("submit", async evento => {
                evento.preventDefault();
                if (!cantidad.reportValidity()) return;

                boton.disabled = true;
                try {
                    const actualizado = await agregarExistencia(producto.productoId, Number(cantidad.value));
                    avisar(`Existencia actualizada: ${actualizado.nombre} ahora tiene ${Number(actualizado.existencia)} ${actualizado.unidad}.`);
                    await cargar();
                } catch (error) {
                    manejarError(error);
                } finally {
                    boton.disabled = false;
                }
            });
            acciones.appendChild(formulario);
        } else {
            if (!puedeGestionar) acciones.textContent = "Solo lectura";
        }
        fila.appendChild(acciones);
        cuerpo.appendChild(fila);
    }
}

async function cargar() {
    try {
        productosActuales = await listarInventario();
        filtrar();
    } catch (error) {
        manejarError(error);
    }
}

async function iniciar() {
    const sesion = await protegerPagina();
    if (!sesion) return;

    puedeGestionar = sesion.accountType === ADMIN;
    $('nuevo-producto').hidden = !puedeGestionar;
    $("ayuda-inventario").textContent = puedeGestionar
        ? "Escribe la cantidad que deseas sumar a las existencias actuales. Los productos nuevos comienzan con existencia 0."
        : "Puedes consultar las existencias. Solo el Administrador puede ajustar el stock.";
    await cargar();
}

function filtrar() {
    const texto = $("buscar").value.trim().toLocaleLowerCase('es-MX');
    const tipo = $("filtro-tipo").value;
    dibujarTabla(productosActuales.filter(p => (p.nombre + ' INV-' + String(p.productoId).padStart(3, '0')).toLocaleLowerCase('es-MX').includes(texto) && (!tipo || p.tipo === tipo)));
}
$("buscar").addEventListener("input", filtrar);
$("filtro-tipo").addEventListener("change", filtrar);
iniciar();
