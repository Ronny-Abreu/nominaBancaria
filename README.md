# nominaBancaria

Proyecto final PROGRAMACIÓN III — Simulación de pago de nómina bancaria (PoC).

Cubre: login con roles (admin / rrhh / empleado), CRUD de empleados con baja
lógica, y simulación de pago de nómina en lote con generación de PDF y envío
por correo, con feedback en tiempo real vía Firestore.

Ver [DESCRIPCION_PROYECTO_NOMINA.md](./DESCRIPCION_PROYECTO_NOMINA.md) para el
alcance funcional completo.

## Cobertura del backlog AB (`md-context/BACKLOG_COMPLETE.md`)

Además del núcleo anterior, el PoC implementa estas historias del backlog:

- **AB-100 — Registro inmutable de auditoría**: colección append-only
  `auditLogs` (solo lectura admin, escritura únicamente vía Admin SDK). Registra
  login/logout, altas/ediciones/bajas/eliminaciones de empleados, alta de
  usuarios, creación/finalización de nómina, pagos duplicados bloqueados,
  cambios de configuración y solicitudes de reset. Visor en `/auditoria`.
- **AB-79 / AB-138 — Parámetros fiscales configurables**: tasas AFP/ARS y
  tramos ISR editables desde `/configuracion` (admin) sin redeploy.
- **AB-150 — Idempotencia de pagos**: un empleado no puede recibir el mismo
  pago dos veces en un período (marcadores `pagosRealizados`).
- **AB-147 / AB-151 — Historial y seguimiento de nóminas**: `/nomina/historial`.
- **AB-52 — Restablecimiento de contraseña**: "¿Olvidaste tu contraseña?" en el
  login (Firebase `sendPasswordResetEmail`, mensaje genérico anti-enumeración).
- **AB-210 — Unicidad de cédula** al crear empleados/usuarios.
- **AB-102 — Reportes consolidados** de nómina por período en PDF y Excel
  (`/reportes`).

### Fuera de alcance (versión enterprise, no en este PoC)

Estos ítems del backlog pertenecen a la versión enterprise y **no** se
implementan aquí; su equivalente factible ya está cubierto por el stack actual:

- **AB-82 / AB-101** — integración con API bancaria real (aquí el "pago" se
  simula con el envío del recibo por correo).
- **AB-81** — infraestructura AWS EC2/RDS (se usa Vercel; HTTPS es automático).
- **AB-98** — migración ETL de nóminas históricas.
- **AB-100 (parte MongoDB Atlas)** — la auditoría se implementa en Firestore
  como colección append-only, no en MongoDB.
- Rol **Supervisor** (se mantienen 3 roles) y cálculo de salario bruto con
  horas extra / bonos / ausencias (AB-152).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS · Firebase (Auth + Firestore)
+ Admin SDK · Nodemailer (SMTP) · `@react-pdf/renderer`.

## Configuración local

### 1. Variables de entorno

Copia `.env.local.example` a `.env.local` y completa:

- **Config del cliente Firebase** (`NEXT_PUBLIC_FIREBASE_*`): Firebase Console
  → Configuración del proyecto → Tus apps → SDK config.
- **Credenciales del Admin SDK** (`FIREBASE_ADMIN_*`): Firebase Console →
  Configuración del proyecto → Cuentas de servicio → Generar nueva clave
  privada (JSON). Copia `project_id`, `client_email` y `private_key` (deja los
  `\n` escapados tal cual aparecen en el JSON).
- **SMTP** (`SMTP_USER`, `SMTP_APP_PASSWORD`): usa una contraseña de
  aplicación de Gmail (Cuenta de Google → Seguridad → Verificación en 2 pasos
  → Contraseñas de aplicaciones), no tu contraseña normal.

### 2. Firestore

Despliega las reglas de seguridad (`firestore.rules`) y el índice compuesto
(`firestore.indexes.json`, requerido por el filtro de auditoría) desde la
consola de Firebase o con `firebase deploy --only firestore:rules,firestore:indexes`
(requiere `firebase-tools` y `firebase init` apuntando a tu proyecto).

### 3. Primer usuario admin (bootstrap)

No hay registro público — RRHH/Admin crea las cuentas de empleados desde la
app. Por lo tanto, el primer usuario `admin` debe crearse manualmente:

1. Firebase Console → Authentication → Agregar usuario (correo + contraseña).
2. Firestore → colección `usuarios` → crea un documento con **ID = UID** del
   usuario creado en el paso 1, con estos campos:

```json
{
  "uid": "<mismo-uid>",
  "rol": "admin",
  "nombre": "Nombre",
  "apellido": "Apellido",
  "email": "correo@ejemplo.com",
  "gender": "otro",
  "cedula": "000-0000000-0",
  "puesto": "Administrador",
  "salarioBruto": 0,
  "activo": true,
  "createdAt": 0,
  "updatedAt": 0,
  "createdBy": "bootstrap",
  "mustChangePassword": false
}
```

### 4. Ejecutar

```bash
npm install
npm run dev
```

Abre http://localhost:3000 — redirige a `/login`.

## Notas de diseño

- Los montos de deducciones (AFP, ARS, ISR) son valores aproximados con fines
  académicos, no una fuente fiscal oficial. Los valores por defecto viven en
  `src/lib/payroll/deductions.ts` y se pueden ajustar en caliente desde
  `/configuracion` (se guardan en `configuracion/parametrosFiscales`).
- El envío de correos usa concurrencia controlada
  (`PAYROLL_BATCH_CONCURRENCY`, `src/lib/payroll/asyncPool.ts`) para evitar
  rate-limits del proveedor SMTP y no bloquear la UI; el progreso se observa
  en tiempo real vía `onSnapshot` sobre `nominaRuns/{runId}/items`.
- No hay cola/worker externo: el procesamiento del lote corre dentro de la
  función serverless de `/api/nomina/[runId]/process` (`maxDuration = 60`),
  pensado para lotes pequeños (PoC), no para cientos de empleados.

## Despliegue (Vercel)

1. Importa el repo en Vercel.
2. Agrega todas las variables de `.env.local.example` en Project Settings →
   Environment Variables (usa los mismos valores reales que en local).
3. Deploy. Las rutas `/api/*` corren como funciones serverless de Next.js —
   no se necesita configuración adicional de Firebase Hosting/Cloud Functions.
