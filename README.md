# Tacos-mario-s-al-vapor

## Cómo correr el proyecto

1. Instalar Node.js y SQL Server (Express) con SQL Server Management Studio.
2. En SSMS, ejecutar el script `crear-base-de-datos.sql`.
3. En la carpeta `backend`, copiar `.env.example` como `.env` y poner el nombre de tu servidor en `DB_SERVER`.
4. En `backend`: `npm install` y luego `npm start`.
5. Abrir http://localhost:3000/pages/login.html. Si la base no tiene usuarios, el sistema muestra la pantalla para crear el primer Administrador. Crea esa cuenta e inicia sesión con el tipo Administrador.
6. Después de la configuración inicial, el registro público permite crear Empleado (vendedor) o Encargado de producción. Solo un Administrador puede crear otros administradores desde Usuarios.

Al registrar una venta en Ventas, también se crea un pedido activo. Desde Inicio se pueden
marcar pedidos como completados y consultar ambas listas; se actualizan automáticamente
cada 15 segundos. Al actualizar la base con `crear-base-de-datos.sql`, las ventas antiguas
se conservan y se muestran como completadas.

El script también agrega al inventario el catálogo inicial de tacos y bebidas con existencia 0.
Si la base ya estaba instalada, vuelve a ejecutar `crear-base-de-datos.sql`; los productos que ya
existan no se modifican. Desde Inventario, el Administrador puede sumar existencias.

## Roles y módulos

- **Administrador (2):** Inicio, Productos, Compras, Inventario, Producción, Ventas, Historial, Reportes y Usuarios.
- **Encargado de producción (3):** Producción y consulta de existencias. Registra materia prima utilizada, producto obtenido y merma.
- **Empleado (vendedor) (1):** Ventas de productos terminados y consulta de su propio historial.

Las cuentas antiguas de Desarrollador se convierten una sola vez a Administrador,
sin cambiar nombres ni contraseñas. Para una base existente ejecuta desde `backend`:

```powershell
npm run migrate:roles
npm start
```

En una instalación nueva, ejecuta `crear-base-de-datos.sql` y abre el sistema para crear el primer Administrador. La configuración inicial solo está disponible mientras no exista ningún usuario y se cierra al guardar esa cuenta, incluso ante solicitudes simultáneas. Una base con usuarios existentes no vuelve a habilitar esta opción. Las siguientes cuentas de Administrador se crean desde Usuarios.

`node --test scripts/test-setup.js` desde `backend` comprueba la configuración inicial con una base simulada, sin modificar SQL Server.

Flujo: crea materia prima y productos terminados en Productos; registra una compra;
registra el lote en Producción; vende el producto terminado en Ventas. Las cantidades
respetan la unidad de cada artículo. La merma está incluida en la materia prima utilizada.
Si las unidades coinciden, utilizado = obtenido + merma. Compras y producción actualizan
el stock en transacciones. Solo el Administrador puede hacer ajustes manuales.

`npm run test:roles` comprueba los permisos, el flujo de stock y el historial privado
contra SQL Server con cuentas y productos temporales que elimina al terminar.
