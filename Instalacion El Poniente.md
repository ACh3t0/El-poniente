# Instalación de El Poniente en otra laptop

Esta guía permite descargar el código, abrirlo en Visual Studio Code, configurarlo y ejecutarlo en una laptop con Windows. Cada persona podrá modificar su copia del proyecto y compartir sus cambios mediante GitHub.

No basta con ejecutar la base de datos. El proyecto necesita el código fuente, el motor de SQL Server, el controlador ODBC, las dependencias de Node.js y el servidor del backend en ejecución. El backend también publica las páginas del frontend.

## 1 Preparar lo que compartirá el propietario

Sube el proyecto completo a un repositorio de GitHub. Incluye las carpetas frontend y backend, crear-base-de-datos.sql, backend/package.json, backend/package-lock.json y backend/.env.example. Si el repositorio es privado, invita a tus compañeros como colaboradores y asegúrate de que acepten la invitación.

No incluyas node_modules, archivos .log ni tu archivo .env. Cada laptop instalará las dependencias y tendrá su propia configuración. Comprueba que el archivo .gitignore contenga estas líneas antes de subir el proyecto:

node_modules/
.env
*.log

Si un archivo ya estaba registrado en Git, agregarlo a .gitignore no lo elimina del historial ni deja de seguirlo automáticamente. Revisa lo que se subirá antes de confirmar los cambios.

## 2 Instalar los programas necesarios

En cada laptop instala Visual Studio Code, Git, Node.js con npm, SQL Server Express, SQL Server Management Studio y Microsoft ODBC Driver 18 for SQL Server. Utiliza versiones de 64 bits compatibles con la laptop y una versión LTS de Node.js compatible con las dependencias del proyecto.

SQL Server Express es el motor que mantiene la base de datos. SQL Server Management Studio, también llamado SSMS, es la herramienta para conectarse y ejecutar scripts; instalar únicamente SSMS no instala el motor. El controlador ODBC 18 es necesario porque el código lo solicita expresamente.

Después de instalar Git y Node.js, cierra y vuelve a abrir VS Code. En su terminal comprueba que los programas respondan:

git --version
node --version
npm --version

Los pasos de esta guía corresponden a Windows porque la conexión actual utiliza autenticación de Windows con msnodesqlv8. Para macOS o Linux se requiere adaptar y verificar la conexión.

## 3 Descargar el código desde GitHub

Abre una terminal en la carpeta donde quieras guardar el proyecto. Copia la URL del repositorio desde el botón Code de GitHub y ejecuta estos comandos sustituyendo los valores de ejemplo:

git clone https://github.com/TU-USUARIO/TU-REPOSITORIO.git
cd TU-REPOSITORIO
code .

git clone se usa en la primera descarga. git pull se utiliza después para traer actualizaciones de un repositorio ya clonado. Si es privado, GitHub puede pedir que inicies sesión con una cuenta autorizada.

Si code . no funciona, abre VS Code y selecciona Archivo → Abrir carpeta. Elige la carpeta completa descargada, donde se encuentran frontend y backend. También puedes descargar el ZIP desde GitHub y extraerlo, pero esa copia no queda preparada para usar git pull; para colaborar conviene clonar.

## 4 Conectarse al SQL Server de la laptop

Abre SSMS y conéctate al motor local con Autenticación de Windows. El nombre del servidor depende de la instalación. Puede ser localhost\SQLEXPRESS, NOMBRE-LAPTOP\SQLEXPRESS o localhost si instalaste una instancia predeterminada.

Anota exactamente el nombre que funcionó. Comprueba que el servicio SQL Server de esa instancia esté iniciado. La cuenta de Windows con la que se ejecutará Node.js debe tener permiso para acceder a la base. Para una instalación local, usa la misma cuenta que utilizaste al configurar y comprobar el acceso en SSMS.

## 5 Crear la base de datos

En SSMS, conectado a la instancia correcta, selecciona Archivo → Abrir → Archivo y abre crear-base-de-datos.sql de la raíz del proyecto. Ejecuta el archivo completo y comprueba que no haya errores.

El script crea la base Carbón El Poniente y prepara sus tablas y catálogo inicial. Actualiza el explorador de objetos de SSMS y comprueba que aparezca la base. No basta con crear una base vacía manualmente.

Este paso se realiza para la instalación inicial. No necesitas ejecutar el script cada vez que abras el proyecto. Si después hay cambios de estructura, aplica el script o migración que indique el responsable del proyecto.

## 6 Crear la configuración local

En la terminal de VS Code, desde la raíz del proyecto, ejecuta:

cd backend
Copy-Item .env.example .env

Abre backend/.env en VS Code. Configura el mismo servidor con el que te conectaste en SSMS y escribe un secreto de sesión largo y aleatorio para esa instalación. Ejemplo de estructura:

DB_SERVER=localhost\SQLEXPRESS
SESSION_SECRET=reemplaza-este-ejemplo-por-un-secreto-largo-y-aleatorio

Si tu servidor es localhost o NOMBRE-LAPTOP\SQLEXPRESS, usa ese valor en DB_SERVER. No copies el nombre del servidor de otra laptop. La conexión actual utiliza tu cuenta de Windows, por lo que no se configura un usuario y contraseña de SQL en estas variables.

No repitas Copy-Item si ya configuraste tu .env: podrías reemplazar tus valores. Conserva ese archivo localmente y no lo subas a GitHub.

## 7 Instalar las dependencias del proyecto

En la terminal, dentro de backend, ejecuta:

npm install

Espera a que termine sin errores. Este comando descarga las librerías y crea node_modules. Requiere acceso a internet durante la descarga. No debes copiar node_modules desde otra computadora.

Si PowerShell bloquea npm.ps1 por la política de ejecución, utiliza npm.cmd install. Si falla la instalación de msnodesqlv8, conserva el mensaje de error y revisa la compatibilidad de Node.js, la arquitectura y los requisitos indicados por esa dependencia.

## 8 Iniciar el servidor y abrir el sistema

Desde backend ejecuta:

npm start

Si PowerShell bloquea npm.ps1, utiliza npm.cmd start. Deja esa terminal abierta. Después abre en el navegador:

http://localhost:3000/pages/login.html

No necesitas Live Server ni otro comando para el frontend: Express publica los archivos de frontend. El servicio SQL Server debe permanecer iniciado; puedes cerrar SSMS después de configurar la base. localhost se refiere a la laptop donde ejecutas el servidor.

## 9 Crear cuentas y obtener acceso de Administrador

Para crear una cuenta de Empleado o Encargado de producción abre:

http://localhost:3000/pages/register.html

Registra un nombre de usuario y una contraseña de 8 a 128 caracteres. Luego inicia sesión seleccionando el mismo tipo de cuenta. El registro público permanece abierto para esos dos roles y rechaza cuentas de Administrador.

Para usar todos los módulos necesitas una cuenta de Administrador existente en esa base. Solo un Administrador puede crear otros administradores desde Usuarios.

Importante para una base nueva: crear-base-de-datos.sql no proporciona una cuenta de Administrador y el registro público tampoco la crea. Antes de entregar el proyecto, el responsable debe provisionar la primera cuenta de manera controlada o proporcionar un respaldo de pruebas que ya la incluya. Con la instalación actual, no se puede obtener una cuenta de Administrador únicamente siguiendo el registro público. No guardes una contraseña en texto plano en la tabla de usuarios; el sistema usa contraseñas con hash.

## 10 Modificar y probar el código

Edita los archivos desde VS Code. Después de guardar cambios en HTML, CSS o JavaScript del frontend, recarga el navegador; usa Ctrl + F5 si conserva una versión anterior.

Cuando cambies el backend, detén el servidor con Ctrl + C y vuelve a ejecutar npm start dentro de backend. Si cambian las dependencias, ejecuta npm install antes de reiniciarlo. Los cambios de código no modifican automáticamente la estructura ni los datos de SQL Server.

## 11 Descargar actualizaciones con git pull

Antes de actualizar, revisa tus modificaciones desde la carpeta del repositorio:

git status

Si tienes trabajo local, guárdalo en un commit o mediante git stash antes de traer cambios que puedan afectar los mismos archivos. Con el trabajo local protegido, ejecuta:

git pull

Si hay conflictos, resuélvelos revisando los archivos afectados. No descartes cambios que necesites conservar. Si se actualizaron las dependencias, ejecuta npm install dentro de backend. Si se entregó una migración SQL, aplícala en tu base. Finalmente, reinicia el servidor y comprueba el inicio de sesión.

## 12 Compartir tus modificaciones

Antes de editar una mejora, crea una rama desde la carpeta del repositorio:

git switch -c mejora-inventario

Después de modificar y probar, revisa git status y agrega únicamente los archivos que quieras compartir. Por ejemplo:

git add frontend/pages/ventas.js
git commit -m "Mejora la pantalla de ventas"
git push -u origin mejora-inventario

El archivo del ejemplo debe sustituirse por el que realmente modificaste. Abre un Pull Request en GitHub para que se revisen y combinen los cambios. Para subir ramas al repositorio necesitas permiso de escritura; si no lo tienes, utiliza un fork y un Pull Request hacia el repositorio original.

## 13 Ejecutar el proyecto los siguientes días

Comprueba que SQL Server esté iniciado, abre el proyecto en VS Code y, desde la raíz, ejecuta:

cd backend
npm start

Abre http://localhost:3000/pages/login.html. No es necesario volver a clonar, recrear la base o reinstalar todas las dependencias cada día. Para detener el servidor usa Ctrl + C.

## 14 Entender qué se comparte y resolver errores

Cada laptop tendrá su propia base de datos, sus propios usuarios y sus propias ventas. GitHub comparte código y scripts; git pull no sincroniza las tablas de SQL Server. Si necesitan tus datos actuales, deben restaurar un respaldo compatible en lugar de esperar que aparezcan al clonar. El .env debe apuntar a la instancia donde se restauró la base.

Si el navegador no abre el sistema, revisa que npm start siga activo y que el puerto 3000 no esté ocupado. Si aparece un error de conexión a SQL Server, revisa el servicio, DB_SERVER, los permisos de Windows y la existencia de la base en esa instancia. Si se menciona que falta el controlador, instala Microsoft ODBC Driver 18 for SQL Server.

Si no aparecen todos los apartados, revisa el rol de la cuenta. Una cuenta de Empleado no tiene los permisos de Administrador. Compartir el código permite modificarlo, pero el acceso dentro del sistema depende de la cuenta con la que inicies sesión.
