import { protegerPagina } from "../services/sesion.js";
import { listarVentas } from "../services/ventas.service.js";
let inventarioDisponible = [];
let ordenActual = [];

const selectProducto = document.getElementById("select-producto");
const inputCantidad = document.getElementById("input-cantidad");
const btnAgregar = document.getElementById("btn-agregar");
const listaOrden = document.getElementById("lista-orden");
const totalVenta = document.getElementById("total-venta");
const selectPago = document.getElementById("select-pago");
const btnCobrar = document.getElementById("btn-cobrar");

// Cargar catálogo de productos disponibles
async function cargarInventario() {
    try {
        const respuesta = await fetch("/api/inventario");
        if (!respuesta.ok) throw new Error("No se pudo obtener el inventario");
        const productos = (await respuesta.json()).filter(p => p.tipo === 'Terminado');
        


        // Guardamos los productos convirtiendo tipos para evitar problemas.
        inventarioDisponible = productos.map(p => ({
            productoId: Number(p.productoId ?? p.id ?? p.id_producto),
            nombre: p.nombre,
            unidad: p.unidad || 'pieza',
            precioVenta: Number(p.precioVenta ?? p.precio ?? 0),
            existencia: Number(p.existencia ?? 0),
            isActive: (p.isActive === true || p.isActive === 1 || p.isActive === '1')
        })).filter(p => p.isActive);

        selectProducto.innerHTML = '<option value="">-- Selecciona un producto --</option>';
        inventarioDisponible.forEach(prod => {
            const opcion = document.createElement("option");
            opcion.value = prod.productoId;
            opcion.textContent = prod.existencia > 0
                ? `${prod.nombre} - $${prod.precioVenta.toFixed(2)} (Stock: ${prod.existencia})`
                : `${prod.nombre} - $${prod.precioVenta.toFixed(2)} (Sin existencias)`;
            opcion.disabled = prod.existencia <= 0;
            selectProducto.appendChild(opcion);
        });
        if (inventarioDisponible.length === 0) {
            selectProducto.innerHTML = '<option value="">No hay productos activos</option>';
        }
        dibujarDisponibles();
    } catch (error) {
        console.error("Error al cargar inventario:", error);
        selectProducto.innerHTML = '<option value="">Error al cargar productos</option>';
        const cuerpo = document.getElementById('productos-disponibles');
        cuerpo.replaceChildren();
        const fila = cuerpo.insertRow();
        const celda = fila.insertCell(); celda.colSpan = 5; celda.textContent = 'No se pudieron cargar los productos. Recarga para volver a intentar.';
    }
}

// Agregar item a la orden
btnAgregar.addEventListener("click", () => {
    const valorSeleccionado = selectProducto.value;
    const cantidad = parseFloat(inputCantidad.value);

    if (!valorSeleccionado) {
        alert("Por favor selecciona un producto válido.");
        return;
    }
    if (isNaN(cantidad) || cantidad <= 0) {
        alert("La cantidad debe ser mayor a 0.");
        return;
    }

    const productoId = Number(valorSeleccionado);
    const prodInfo = inventarioDisponible.find(p => p.productoId === productoId);
    
    if (!prodInfo) {
        alert("Producto no encontrado en inventario.");
        return;
    }

    if (cantidad > prodInfo.existencia) {
        alert(`Stock insuficiente. Solo quedan ${prodInfo.existencia} unidades.`);
        return;
    }

    const itemExistente = ordenActual.find(item => item.productoId === productoId);
    if (itemExistente) {
        if (itemExistente.cantidad + cantidad > prodInfo.existencia) {
            alert(`No puedes agregar más unidades de las disponibles (${prodInfo.existencia}).`);
            return;
        }
        itemExistente.cantidad += cantidad;
    } else {
        ordenActual.push({
            productoId: prodInfo.productoId,
            nombre: prodInfo.nombre,
            precioUnitario: prodInfo.precioVenta,
            cantidad: cantidad
        });
    }

    actualizarTabla();
    inputCantidad.value = 1;
});

// Renderizar tabla y subtotal
function actualizarTabla() {
    listaOrden.innerHTML = "";
    let total = 0;

    ordenActual.forEach((item, index) => {
        const subtotal = item.cantidad * item.precioUnitario;
        total += subtotal;

        const fila = document.createElement("tr");
        for (const texto of [
            item.nombre,
            `$${item.precioUnitario.toFixed(2)}`,
            item.cantidad,
            `$${subtotal.toFixed(2)}`
        ]) {
            const celda = document.createElement("td");
            celda.textContent = texto;
            fila.appendChild(celda);
        }
        const celdaAccion = document.createElement("td");
        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.className = "btn-eliminar";
        botonEliminar.textContent = "Quitar";
        botonEliminar.style.cssText = "background-color: #c0392b; padding: 4px 8px;";
        botonEliminar.addEventListener("click", () => {
            ordenActual.splice(index, 1);
            actualizarTabla();
        });
        celdaAccion.appendChild(botonEliminar);
        fila.appendChild(celdaAccion);
        listaOrden.appendChild(fila);
    });

    totalVenta.textContent = total.toFixed(2);
    if (!ordenActual.length) {
        const fila = listaOrden.insertRow();
        const celda = fila.insertCell(); celda.colSpan = 5;
        celda.textContent = 'Agrega productos para comenzar la venta.';
        celda.className = 'vacio';
    }
    dibujarDisponibles();
}

function dibujarDisponibles() {
    const cuerpo = document.getElementById('productos-disponibles');
    cuerpo.replaceChildren();
    for (const producto of inventarioDisponible) {
        const reservado = ordenActual.find(p => p.productoId === producto.productoId)?.cantidad || 0;
        const disponible = Math.max(0, Number((producto.existencia - reservado).toFixed(3)));
        const fila = cuerpo.insertRow();
        for (const texto of [producto.nombre, `${disponible} ${producto.unidad}`, `$${producto.precioVenta.toFixed(2)}`]) fila.insertCell().textContent = texto;
        const cantidad = document.createElement('input');
        cantidad.type = 'number'; cantidad.min = '1'; cantidad.step = '1'; cantidad.max = String(disponible);
        cantidad.value = '1'; cantidad.required = true; cantidad.className = 'cantidad-producto';
        cantidad.setAttribute('aria-label', `Cantidad de ${producto.nombre} (${producto.unidad})`);
        cantidad.disabled = disponible < 1;
        fila.insertCell().append(cantidad);
        const boton = document.createElement('button');
        boton.type = 'button'; boton.className = 'btn-agregar-fila'; boton.textContent = disponible >= 1 ? '+ Agregar' : 'Sin stock'; boton.disabled = disponible < 1;
        boton.addEventListener('click', () => {
            if (!cantidad.reportValidity()) return;
            selectProducto.value = String(producto.productoId);
            inputCantidad.value = cantidad.value;
            btnAgregar.click();
        });
        fila.insertCell().append(boton);
    }
    if (!inventarioDisponible.length) {
        const celda = cuerpo.insertRow().insertCell(); celda.colSpan = 5; celda.textContent = 'No hay productos terminados activos.';
    }
}

async function cargarHistorial() {
    const mensaje = document.getElementById('mensaje-historial');
    try {
        const ventas = await listarVentas();
        const hoy = new Date().toLocaleDateString('es-MX');
        const cuerpo = document.getElementById('historial-turno'); cuerpo.replaceChildren();
        for (const venta of ventas.filter(v => new Date(v.fecha).toLocaleDateString('es-MX') === hoy)) {
            const fila = cuerpo.insertRow();
            for (const texto of [`#VTA-${venta.ventaId}`, new Date(venta.fecha).toLocaleString('es-MX'), venta.userName, venta.metodoPago, `$${Number(venta.total).toFixed(2)}`, venta.estadoPedido]) fila.insertCell().textContent = texto;
        }
        if (!cuerpo.children.length) {
            const celda = cuerpo.insertRow().insertCell(); celda.colSpan = 6; celda.textContent = 'Todavía no hay ventas registradas hoy.'; celda.className = 'vacio';
        }
        mensaje.hidden = true;
    } catch (error) { mensaje.textContent = `No se pudo cargar el historial: ${error.message}`; mensaje.hidden = false; }
}

// Enviar venta al backend
btnCobrar.addEventListener("click", async () => {
    if (ordenActual.length === 0) {
        alert("Agrega al menos un producto a la orden.");
        return;
    }

    const metodoPago = selectPago.value;
    const detalles = ordenActual.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad
    }));

    if (btnCobrar.disabled) return;
    btnCobrar.disabled = true;
    try {
        const respuesta = await fetch("/api/ventas", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metodoPago, detalles })
        
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert("¡Venta registrada con éxito!");
            ordenActual = [];
            actualizarTabla();
            await cargarInventario();
            await cargarHistorial();
        } else {
            alert(`Error al registrar la venta: ${resultado.mensaje || resultado.error || "Ocurrió un error inesperado."}`);
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        alert("Error de conexión al procesar la venta.");
    } finally { btnCobrar.disabled = false; }
});

const sesion = await protegerPagina();
if (sesion) {
    document.getElementById('sesion-cabecera').dataset.rol = sesion.accountType;
    actualizarTabla();
    await Promise.all([cargarInventario(), cargarHistorial()]);
}
