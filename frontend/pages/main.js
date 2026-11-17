import { pedir } from "../services/api.service.js";
import { protegerPagina } from "../services/sesion.js";
import { listarPedidos, completarPedido } from "../services/ventas.service.js";

const $ = id => document.getElementById(id);
const moneda = valor => new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
}).format(Number(valor));
const cantidad = valor => new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 3
}).format(Number(valor));

function nodo(etiqueta, texto, clase) {
    const elemento = document.createElement(etiqueta);
    if (texto !== undefined) elemento.textContent = texto;
    if (clase) elemento.className = clase;
    return elemento;
}

function mostrarMensaje(texto, error = false) {
    const mensaje = $("mensaje-pedidos");
    mensaje.textContent = texto;
    mensaje.classList.toggle("error", error);
}

function dibujarTabla(cuerpo, pedidos, permitirCompletar) {
    cuerpo.replaceChildren();
    if (pedidos.length === 0) {
        const fila = nodo("tr");
        const celda = nodo("td", permitirCompletar
            ? "No hay pedidos activos."
            : "Todavía no hay pedidos completados.", "vacio");
        celda.colSpan = permitirCompletar ? 7 : 6;
        fila.append(celda);
        cuerpo.append(fila);
        return;
    }

    for (const pedido of pedidos) {
        const fila = nodo("tr");
        fila.append(
            nodo("td", "#" + pedido.ventaId),
            nodo("td", String(pedido.fecha || "").replace("T", " ")),
            nodo("td", pedido.userName || "—")
        );

        const celdaDetalles = nodo("td");
        const lista = nodo("ul");
        for (const detalle of pedido.detalles) {
            lista.append(nodo("li",
                `${cantidad(detalle.cantidad)} × ${detalle.nombre} · ${moneda(detalle.subtotal)}`
            ));
        }
        celdaDetalles.append(lista);
        fila.append(celdaDetalles, nodo("td", moneda(pedido.total)), nodo("td", pedido.metodoPago));

        if (permitirCompletar) {
            const celdaAccion = nodo("td");
            const boton = nodo("button", "Marcar como lista");
            boton.type = "button";
            boton.addEventListener("click", async () => {
                boton.disabled = true;
                try {
                    await completarPedido(pedido.ventaId);
                    mostrarMensaje(`El pedido #${pedido.ventaId} se marcó como completado.`);
                    await cargarPedidos();
                } catch (error) {
                    if (error.status === 401) {
                        location.href = "./login.html";
                        return;
                    }
                    mostrarMensaje(`No se pudo completar el pedido #${pedido.ventaId}: ${error.message}`, true);
                    boton.disabled = false;
                }
            });
            celdaAccion.append(boton);
            fila.append(celdaAccion);
        }
        cuerpo.append(fila);
    }
}

async function cargarPedidos() {
    $("actualizar-pedidos").disabled = true;
    try {
        const [activos, completados] = await Promise.all([
            listarPedidos("Activo"),
            listarPedidos("Completado")
        ]);
        dibujarTabla($("pedidos-activos"), activos, true);
        dibujarTabla($("pedidos-completados"), completados, false);
        mostrarMensaje(`Pedidos actualizados. Activos: ${activos.length}; completados: ${completados.length}.`);
    } catch (error) {
        if (error.status === 401) {
            location.href = "./login.html";
            return;
        }
        mostrarMensaje(`No se pudieron cargar los pedidos: ${error.message}`, true);
    } finally {
        $("actualizar-pedidos").disabled = false;
    }
}

$("actualizar-pedidos").addEventListener("click", cargarPedidos);

const sesion = await protegerPagina();
if (sesion) {
    const usuario = nodo('span', 'Usuario: ');
    usuario.append(nodo('strong', sesion.userName));
    const menu = document.querySelector('.sidebar');
    $('sesion-cabecera').append(usuario, nodo('span', 'Rol: Administrador', 'rol'));
    const salir = menu.querySelector('.btn-salir');
    if (salir) $('sesion-cabecera').append(salir);
    menu.querySelector('.sesion-info')?.remove();
    try {
        const [inventario, compras, produccion, ventas] = await Promise.all(['/api/inventario','/api/compras','/api/produccion','/api/ventas'].map(r=>pedir(r)));
        const hoy = new Date().toLocaleDateString('es-MX');
        const ingresos = ventas.filter(v=>new Date(v.fecha).toLocaleDateString('es-MX')===hoy).reduce((t,v)=>t+Number(v.total),0);
        const porUnidad = (registros, unidad, cantidad) => {
            const grupos = new Map();
            for(const r of registros) grupos.set(r[unidad],(grupos.get(r[unidad])||0)+Number(r[cantidad]));
            return [...grupos].map(([u,c])=>c+' '+u).join(' / ') || '0';
        };
        for(const [titulo,valor] of [['Ventas del día',moneda(ingresos)],['Materia prima',porUnidad(inventario.filter(p=>p.tipo==='Materia prima'),'unidad','existencia')],['Producto terminado',porUnidad(inventario.filter(p=>p.tipo==='Terminado'),'unidad','existencia')],['Mermas registradas',porUnidad(produccion,'unidadMateria','merma')]]) {
            const descripciones = ['Ingresos registrados hoy', 'Existencias de insumos', 'Disponible para venta', 'Mermas de producción registradas'];
            const tarjeta=nodo('article');tarjeta.append(nodo('h2',titulo),nodo('strong',valor),nodo('p',descripciones[$('resumen-operativo').children.length]));$('resumen-operativo').append(tarjeta);
        }
    } catch(e) { mostrarMensaje(e.message,true); }
    await cargarPedidos();
    window.setInterval(cargarPedidos, 15000);
}
