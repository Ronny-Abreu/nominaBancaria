
---

## 1. Resumen del stack

| Capa | Tecnología | Rol en el proyecto |
|---|---|---|
| Framework web | **Next.js 16 (App Router)** | Frontend + backend (API routes) en un solo proyecto |
| Lenguaje | **TypeScript** | Tipado estático en todo el código (cliente y servidor) |
| UI | **React 19** | Componentes de interfaz, estado, formularios |
| Estilos | **Tailwind CSS 4** | Sistema de diseño utilitario, sin CSS a mano |
| Autenticación | **Firebase Authentication** | Login, contraseñas, tokens, reset de contraseña |
| Base de datos | **Cloud Firestore** (NoSQL) | Usuarios, nóminas, auditoría, configuración |
| Backend privilegiado | **Firebase Admin SDK** | Crear cuentas, verificar sesiones, escrituras protegidas |
| Envío de correo | **Nodemailer + SMTP (Gmail)** | Entrega de recibos de pago en PDF |
| Generación de documentos | **@react-pdf/renderer**, **exceljs** | Recibos individuales y reportes consolidados |
| Validación | **Zod** | Esquemas de validación compartidos cliente/servidor |
| Despliegue | **Vercel** | Hosting del frontend y de las funciones serverless (API) |

---

## 2. Next.js (App Router) — por qué framework full-stack y no "solo React"

**El problema:** el proyecto necesita una interfaz de usuario **y** un backend
que ejecute operaciones privilegiadas (crear usuarios en Firebase Auth, generar
PDFs, enviar correos, escribir en la base de datos con permisos elevados). Si
solo usáramos React puro (create-react-app / Vite), necesitaríamos levantar un
servidor Node.js aparte (Express, Fastify, etc.), con su propio despliegue,
CORS, variables de entorno duplicadas, y un repositorio o carpeta separada.

**Por qué Next.js resuelve esto exactamente:**
- **App Router + Route Handlers** (`src/app/api/**/route.ts`): permite escribir
  endpoints backend (`POST`, `GET`, `PUT`, `DELETE`) como archivos normales
  dentro del mismo proyecto, sin montar un servidor Express aparte. Cada
  endpoint de este proyecto (`/api/empleados`, `/api/nomina`, `/api/auditoria`,
  etc.) es un Route Handler.
- **Server Components + Client Components**: las páginas que necesitan
  verificar sesión antes de renderizar (`(protected)/layout.tsx`) corren en el
  servidor (acceso seguro al Admin SDK), mientras que los componentes
  interactivos (formularios, tablas con actualización en vivo) corren en el
  cliente (`"use client"`). Esta separación evita exponer credenciales
  privilegiadas al navegador.
- **Un solo despliegue**: Vercel entiende nativamente esta estructura y
  despliega las páginas como contenido estático/dinámico y los Route Handlers
  como funciones serverless automáticamente — sin configuración manual de
  servidor.
- **Explícitamente descartado**: usar Firebase Hosting + Cloud Functions por
  separado (como sugería el enunciado original) habría exigido gestionar dos
  despliegues distintos y una configuración de rewrites/CORS más compleja para
  el mismo resultado.

## 3. React — por qué para la interfaz

**El problema:** el sistema tiene vistas altamente interactivas: tablas que se
actualizan solas cuando otro usuario cambia datos (estado de nómina en vivo,
tabla de empleados), formularios con validación en tiempo real (cédula con
guiones automáticos), y flujos condicionados por rol.

**Por qué React:**
- Modelo de **componentes reutilizables**: el mismo `EmpleadoForm` sirve para
  crear y editar empleados, y para crear cuentas de RRHH/Admin, solo cambiando
  props — evita duplicar formularios.
- **Estado declarativo + hooks** (`useState`, `useEffect`): permite conectar
  listeners en tiempo real de Firestore (`onSnapshot`) directamente al ciclo de
  vida del componente, de forma que la tabla de empleados o el estado de una
  corrida de nómina se actualizan solos, sin recargar la página ni hacer
  polling manual.
- Es el framework de UI que Next.js usa internamente (no es una elección
  aislada de la de Next.js, sino la base sobre la que Next.js está construido).

## 4. TypeScript — por qué tipado estático

**El problema:** un sistema de nómina maneja dinero, roles y permisos — un
error de tipo (enviar un `string` donde se esperaba un `number`, olvidar un
campo obligatorio al crear un usuario) puede significar un cálculo de salario
incorrecto o una brecha de seguridad.

**Por qué TypeScript:**
- Los tipos (`Usuario`, `NominaItem`, `Deducciones`, `AuditLog`, etc. en
  `src/types/`) documentan la forma exacta de los datos que viajan entre
  Firestore, el backend y la interfaz — el compilador rechaza el código si esa
  forma no se respeta, antes de llegar a producción.
- Los esquemas de **Zod** (`src/lib/validation/`) generan automáticamente el
  tipo TypeScript correspondiente (`z.infer<...>`), evitando mantener dos
  definiciones separadas (una para validar en runtime, otra para el tipo) que
  podrían desincronizarse.
- Permite refactors seguros: cuando se agregó `codigoEmpleado` y
  `cuentaBancaria` al tipo `Usuario`, el compilador señaló automáticamente cada
  lugar del código que construía un objeto `Usuario` y necesitaba el campo
  nuevo.

## 5. Firebase (Authentication + Firestore + Admin SDK) — por qué esta elección de backend

**El problema:** el proyecto necesita autenticación segura con roles, una base
de datos que soporte **actualizaciones en tiempo real** (para el estado en
vivo de la nómina y la tabla de empleados), y todo esto sin operar
infraestructura de servidores de bases de datos propia (para un proyecto
académico con recursos y tiempo limitados).

**Por qué Firebase específicamente:**

- **Firebase Authentication** maneja el ciclo de vida completo de credenciales
  (hash seguro de contraseñas, emisión de tokens, revocación al cambiar
  contraseña, flujo de "olvidé mi contraseña" con correo y token de un solo
  uso) sin que el equipo tenga que implementar y auditar su propio sistema de
  hashing/tokens — un área donde los errores caseros son fuente común de
  vulnerabilidades.
- **Cloud Firestore** es una base de datos de documentos con **listeners en
  tiempo real nativos** (`onSnapshot`). Esto es la pieza clave para dos
  requisitos explícitos del proyecto:
  - El estado de una corrida de nómina (`pendiente → procesando → enviado/error`)
    se ve actualizarse en pantalla sin recargar, porque el cliente está
    **suscrito** al documento, no consultándolo por polling.
  - El cierre de sesión en tiempo real al desactivar/eliminar un empleado
    funciona porque el navegador del empleado ya tenía un listener abierto
    sobre su propio documento de usuario; en cuanto RRHH lo desactiva, ese
    cambio llega al navegador del empleado al instante.
  - Una base de datos relacional tradicional (SQL Server, PostgreSQL) no ofrece
    esto de fábrica — requeriría WebSockets propios o un servicio adicional
    (ej. Socket.io) solo para replicar lo que Firestore da de forma nativa.
- **Firebase Admin SDK** corre **solo en el servidor** (Route Handlers) y tiene
  permisos elevados que el cliente nunca ve: crear cuentas de Firebase Auth,
  escribir en Firestore saltándose las reglas de seguridad del cliente, y
  verificar cookies de sesión. Esto es lo que permite que, por ejemplo, "crear
  un empleado" sea una operación atómica y controlada por el servidor (valida
  rol del que la solicita, genera contraseña temporal, crea el usuario, todo
  en una sola función), en vez de exponer esa lógica al navegador.
- **Reglas de seguridad de Firestore** (`firestore.rules`) son la última línea
  de defensa: incluso si alguien manipulara el cliente, las reglas bloquean
  cualquier escritura directa desde el navegador en colecciones sensibles
  (`usuarios`, `auditLogs`, `nominaRuns`, `configuracion`) — casi todas las
  escrituras reales pasan exclusivamente por el Admin SDK dentro de rutas que
  ya verificaron el rol del usuario.

**Alternativa descartada y por qué:** el enunciado original del proyecto
mencionaba SQL Server + MongoDB Atlas para auditoría. Se descartó para este PoC
porque exige levantar y mantener dos motores de base de datos separados
(con sus propios costos, conexión, migraciones) para lograr lo mismo que
Firestore ya cubre con una sola base de datos: almacenamiento estructurado
(usuarios, nómina) **y** un registro de auditoría append-only (colección
`auditLogs` con reglas que bloquean update/delete, replicando el concepto de
"colección de solo inserción" sin necesitar un motor de base de datos aparte).

## 6. Tailwind CSS — por qué utilidades en vez de CSS a mano o una librería de componentes

**El problema:** se necesita una identidad visual consistente (paleta de
colores, tipografía, espaciados) a través de decenas de pantallas, sin
duplicar reglas de CSS ni depender de una librería de componentes pesada que
imponga su propio look genérico.

**Por qué Tailwind:**
- Las clases utilitarias (`bg-paper`, `text-ink-muted`, `border-rule`) se
  definen una sola vez como variables de tema (`globals.css`) y se reutilizan
  en cada componente, garantizando consistencia sin un archivo CSS por
  componente.
- No añade JavaScript en tiempo de ejecución para temas (a diferencia de
  librerías como Material UI o Chakra), lo cual mantiene el bundle liviano —
  relevante en un proyecto donde el performance percibido importa
  (actualizaciones en tiempo real, PDFs generándose en el servidor).

## 7. Nodemailer + SMTP — por qué para el envío de recibos

**El problema:** cada recibo de nómina procesado debe llegar por correo al
empleado con el PDF adjunto, procesando varios empleados a la vez sin saturar
al proveedor de correo ni congelar la interfaz.

**Por qué Nodemailer:**
- Es la librería estándar de Node.js para enviar correo vía SMTP, sin
  depender de un servicio de terceros de pago (SendGrid, Postmark) para un
  proyecto académico — basta una contraseña de aplicación de Gmail.
- Se combina con un **pool de concurrencia controlada**
  (`src/lib/payroll/asyncPool.ts`, variable `PAYROLL_BATCH_CONCURRENCY`): en
  vez de enviar todos los correos de una corrida al mismo tiempo (lo que
  saturaría el límite de envíos de Gmail y podría congelar la función
  serverless), se procesan de a pocos en paralelo, garantizando que un fallo
  individual (ej. correo inválido) no detenga el resto del lote.

## 8. @react-pdf/renderer y exceljs — por qué estas dos librerías de documentos

**El problema:** el sistema debe generar dos tipos de documentos: el recibo de
pago individual (PDF, adjunto al correo) y el reporte consolidado de nómina
por período (PDF **y** Excel, para RRHH).

**Por qué @react-pdf/renderer:** permite describir el PDF con **componentes
JSX** (`<Document>`, `<Page>`, `<View>`, `<Text>`) igual que cualquier otro
componente de React del proyecto, en vez de dibujar el documento de forma
imperativa con coordenadas x/y (como exige `pdf-lib`). Esto reduce la curva de
aprendizaje: el mismo patrón mental usado para las páginas web sirve para los
PDFs. Además corre en Node.js sin necesitar un navegador headless (Puppeteer),
lo cual es más liviano dentro de una función serverless con límites de tiempo
y memoria.

**Por qué exceljs para los reportes en Excel:** es la librería estándar de
Node.js para generar archivos `.xlsx` reales (no solo CSV), con soporte para
formato de celdas (moneda, negritas en totales) — necesario porque RRHH espera
un archivo que abra directamente en Excel con el formato ya aplicado, no un
CSV plano.

## 9. Zod — por qué validación de esquemas

**El problema:** los datos que llegan a las rutas API (crear empleado,
procesar nómina, actualizar parámetros fiscales) vienen del cliente y no se
puede confiar en que el frontend ya los validó correctamente — un cliente
podría enviar peticiones directamente a la API sin pasar por el formulario.

**Por qué Zod:** define el esquema de validación **una sola vez** por
operación (`empleadoCreateSchema`, `nominaCreateSchema`,
`parametrosFiscalesSchema`) y lo usa el servidor para rechazar cualquier
petición que no cumpla el formato exacto (tipos, rangos, regex de cédula,
etc.), devolviendo errores claros en vez de fallar de forma imprevista más
adelante en el proceso (por ejemplo, al intentar calcular una deducción sobre
un salario que en realidad llegó como texto).

## 10. Despliegue — Vercel

### Por qué Vercel y no Firebase Hosting

Next.js con Route Handlers (backend) necesita un entorno que ejecute
JavaScript del lado del servidor bajo demanda (funciones serverless), no solo
servir archivos estáticos. Vercel es la plataforma que mantiene el propio
equipo de Next.js y detecta automáticamente qué partes de la aplicación deben
convertirse en:
- **Páginas estáticas** (ej. `/login`, la raíz `/`) — servidas como HTML
  pre-generado, muy rápidas.
- **Funciones serverless** (todas las rutas `/api/*`, y las páginas protegidas
  que verifican sesión en el servidor) — se ejecutan bajo demanda, sin
  necesidad de un servidor corriendo 24/7.

Firebase Hosting, en cambio, exigiría desplegar la parte de backend como
**Cloud Functions** por separado, con su propia configuración de rewrites y un
segundo proceso de build — más pasos para lograr exactamente lo mismo que
Vercel resuelve con `git push`.

### Cómo se hizo el deploy en la práctica

1. El repositorio se importó directamente en Vercel (integración con Git).
2. Las variables de entorno (config del cliente Firebase, credenciales del
   Admin SDK, SMTP) se configuraron en Vercel → *Project Settings →
   Environment Variables*, replicando las mismas usadas en local
   (`.env.local`).
3. Cada `git push` a la rama principal dispara un build y despliegue
   automático — sin pasos manuales de servidor.
4. **Detalle técnico resuelto durante el despliegue**: Next.js 16 usa
   Turbopack por defecto para `next build`, pero una dependencia transitiva
   de `firebase-admin` (`jose`, usada para verificar tokens) requiere
   ejecutarse como módulo CommonJS. Turbopack la procesaba de forma
   incompatible con el entorno serverless de Vercel (error `ERR_REQUIRE_ESM`).
   Se resolvió construyendo con webpack (`next build --webpack`) y fijando la
   versión de `jose` a una que sí expone una build CommonJS — un ejemplo
   concreto de por qué probar el build de producción (no solo el entorno de
   desarrollo) antes de dar por buena una integración.
5. HTTPS es automático en Vercel (certificado gestionado), cumpliendo el
   requisito de tráfico cifrado sin configuración manual de certificados —
   algo que en un despliegue propio en AWS EC2 (como describía el enunciado
   original más amplio) exigiría configurar manualmente un balanceador de
   carga y certificados SSL.

### Base de datos en producción

Firestore no requiere "desplegarse" como un servidor tradicional — es un
servicio administrado por Google Cloud al que la aplicación se conecta vía
credenciales. Lo que sí se despliega explícitamente son las **reglas de
seguridad** (`firestore.rules`), que se suben una vez desde la consola de
Firebase o con `firebase deploy --only firestore:rules`, y que aplican
igual sin importar si la aplicación corre en local o en Vercel.

---

## 11. Resumen: qué requisito del proyecto resuelve cada pieza

| Requisito del proyecto | Tecnología que lo resuelve |
|---|---|
| Login con roles y sesiones seguras | Firebase Authentication + cookies de sesión (Admin SDK) |
| CRUD de empleados con baja lógica | Firestore + Route Handlers + Zod |
| Cálculo de nómina (AFP/ARS/ISR) | TypeScript (lógica pura) + Firestore (parámetros configurables) |
| Generación de recibo en PDF | @react-pdf/renderer |
| Envío de correos sin saturar el proveedor | Nodemailer + pool de concurrencia propio |
| Feedback en tiempo real del proceso de nómina | Firestore `onSnapshot` |
| Cierre de sesión en tiempo real al desactivar/eliminar | Firestore `onSnapshot` + Firebase Auth `signOut` |
| Auditoría inmutable | Firestore (colección append-only + reglas de solo lectura) |
| Reportes consolidados PDF/Excel | @react-pdf/renderer + exceljs |
| Un solo repositorio, un solo despliegue | Next.js App Router + Vercel |
| Seguridad de datos y permisos | Firestore Security Rules + Admin SDK + Zod |
