# nominaBancaria

Proyecto final PROGRAMACIÓN III — Simulación de pago de nómina bancaria (PoC).

Cubre: login con roles (admin / rrhh / empleado), CRUD de empleados con baja
lógica, y simulación de pago de nómina en lote con generación de PDF y envío
por correo, con feedback en tiempo real vía Firestore.

Ver [DESCRIPCION_PROYECTO_NOMINA.md](./DESCRIPCION_PROYECTO_NOMINA.md) para el
alcance funcional completo.

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

Despliega las reglas de seguridad (`firestore.rules`) desde la consola de
Firebase o con `firebase deploy --only firestore:rules` (requiere
`firebase-tools` y `firebase init` apuntando a tu proyecto).

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

- Los montos de deducciones (AFP, ARS, ISR) en `src/lib/payroll/deductions.ts`
  son valores aproximados con fines académicos, no una fuente fiscal oficial.
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
