# Checklist de pruebas — Presentación Nómina Bancaria

Guía paso a paso para demostrar **todas** las funcionalidades del sistema en vivo.
Sigue el orden sugerido: cubre el flujo natural (login → gestión → nómina →
reportes/auditoría) y evita saltos entre roles innecesarios.

**Requisitos antes de empezar:**
- [ ] Servidor corriendo (`npm run dev` o URL de Vercel) y accesible.
- [ ] Al menos 1 cuenta `admin` de bootstrap ya creada en Firebase.
- [ ] `.env.local` / variables de Vercel con Firebase + SMTP reales configuradas.
- [ ] Tener a mano un correo real de prueba para crear un empleado y verificar el recibo.

---

## 1. Autenticación y seguridad de acceso

- [ ] **Acceso no autenticado bloqueado**: entrar a `/dashboard`, `/empleados`, `/nomina`,
      `/usuarios`, `/configuracion`, `/auditoria` sin sesión → redirige a `/login`.
- [ ] **Login correcto**: iniciar sesión como `admin` → llega a `/dashboard`.
- [ ] **Login incorrecto**: credenciales inválidas → mensaje de error genérico
      ("Correo o contraseña incorrectos"), sin indicar cuál dato falló.
- [ ] **Restablecer contraseña ("¿Olvidaste tu contraseña?")**: solicitar reset con un
      correo real → llega el correo de Firebase → cambiar contraseña → login funciona
      con la nueva. Repetir con un correo que NO existe → el mensaje en pantalla es
      igual de genérico (no revela si el correo está registrado).
- [ ] **Cierre de sesión**: botón "Cerrar sesión" → vuelve a `/login` y la cookie se
      invalida (recargar `/dashboard` redirige de nuevo a login).
- [ ] **Control de acceso por rol**: iniciar sesión como `rrhh` e intentar entrar a
      `/usuarios`, `/configuracion`, `/auditoria` → bloqueado/redirigido (solo admin).
- [ ] **Control de acceso por rol (empleado)**: iniciar sesión como `empleado` e
      intentar entrar a `/dashboard`, `/empleados`, `/nomina` → redirige a `/mi-perfil`.

## 2. Alta de cuentas y primer inicio de sesión

- [ ] **Crear empleado** (`/empleados/nuevo`, rol admin o rrhh): llenar formulario
      completo (nombre, apellido, correo, cédula, género, puesto, salario, cuenta
      bancaria) → se genera contraseña temporal mostrada una sola vez.
- [ ] **Código de empleado autogenerado**: verificar que el nuevo registro aparece en
      la tabla con un código único (formato `EMP-00001`) sin haberlo escrito manualmente.
- [ ] **Formato de cédula con guiones automáticos**: al escribir solo dígitos
      (ej. `40209229851`) el campo se auto-formatea a `402-0922985-1` en tiempo real.
- [ ] **Datos bancarios de nómina**: en el alta de un empleado, junto a la cuenta
      bancaria hay un desplegable de **banco dominicano** y otro de **modalidad de
      pago** (ACH / LBTR / Pago a terceros); ambos se guardan y luego se ven en su
      perfil y en la tabla.
- [ ] **Validación de cédula duplicada**: intentar crear otro empleado con la misma
      cédula → error 409 "La cédula ya está registrada".
- [ ] **Validación de correo duplicado**: intentar crear con un correo ya usado →
      error correspondiente.
- [ ] **Crear cuenta RRHH/Admin** (`/usuarios`, solo admin): crear una cuenta con rol
      `rrhh` → aparece en la tabla con su código; confirmar que esa pantalla **no**
      permite asignar rol `empleado` (separación de responsabilidades).
- [ ] **Primer login del empleado nuevo**: iniciar sesión con la contraseña temporal
      → redirige automáticamente a `/cambiar-password` (forzado, sin poder saltarlo).
- [ ] **Cambio de contraseña exitoso**: definir nueva contraseña → redirige según su
      rol (empleado → `/mi-perfil`) y el siguiente login ya usa la nueva contraseña.

## 3. Gestión de empleados (CRUD)

- [ ] **Listado con filtros de estado**: pestañas "Activos / Inactivos / Todos" en
      `/empleados` cambian la vista correctamente.
- [ ] **Buscador**: escribir un nombre, correo o código en el buscador de
      `/empleados` → la tabla filtra en vivo.
- [ ] **Editar empleado**: cambiar puesto/salario/cuenta bancaria de un empleado →
      guardar → los cambios se reflejan de inmediato en la tabla (tiempo real).
- [ ] **Baja lógica (Desactivar)**: desactivar un empleado → estado cambia a
      "Inactivo" sin borrar sus datos ni su historial.
- [ ] **Cierre de sesión en tiempo real al desactivar**: con el empleado desactivado
      logueado en OTRA pestaña/navegador, al desactivarlo debe expulsarlo
      automáticamente a `/login` con aviso "Tu cuenta fue desactivada" — sin recargar
      manualmente esa pestaña.
- [ ] **Reactivar**: reactivar el mismo empleado → vuelve a "Activo" y puede iniciar
      sesión de nuevo.
- [ ] **Eliminación permanente (solo admin)**: eliminar un empleado de prueba →
      confirmación con advertencia → desaparece de Firebase Auth y Firestore.
- [ ] **Cierre de sesión en tiempo real al eliminar**: igual que la desactivación,
      pero con el aviso "Tu cuenta fue eliminada".
- [ ] **Restricción de auto-eliminación**: un admin no puede eliminar su propia cuenta
      (debe dar error controlado).

## 4. Motor de nómina (deducciones + procesamiento en lote)

- [ ] **Selector de empleados con buscador** (`/nomina`): filtrar por nombre/correo/
      código y usar "Seleccionar todos".
- [ ] **Elegir período** (selector de mes) y procesar la nómina para 2–3 empleados
      con correos reales.
- [ ] **Estado en tiempo real**: la vista de proceso (`/nomina/[runId]`) muestra cada
      fila pasando de pendiente → procesando → ✅ enviado, sin recargar la página.
- [ ] **Cálculo correcto de deducciones**: verificar a mano que AFP + ARS + ISR y el
      neto de al menos un empleado cuadran con lo mostrado.
- [ ] **Recibo de pago por correo**: confirmar que el correo real recibió el PDF con
      el desglose (bruto, deducciones, neto).
- [ ] **Manejo de errores parciales**: forzar un fallo (ej. correo inválido en un
      empleado) y confirmar que el resto del lote se procesa igual, marcando solo ese
      ítem como "error" con su mensaje.
- [ ] **Dominio de correo inexistente NO se procesa**: crear un empleado con un correo
      de dominio inexistente (ej. `alguien@gmial-inventado.xyz`) y procesar su nómina →
      el sistema detecta al instante que el dominio no puede recibir correos y marca ese
      ítem como "error" (nunca lo da por pagado), sin bloquear al resto del lote.
- [ ] **Verificación de rebotes de Gmail** (`/nomina/[runId]`): tras procesar, con un
      correo de buzón inexistente (dominio válido pero usuario que no existe, ej.
      `noexiste12345@gmail.com`), esperar 1–2 min y pulsar **"Verificar rebotes de
      correo"** → el sistema lee el aviso del "Mail Delivery Subsystem" de Google,
      revierte ese pago a "error" y lo quita del conteo de exitosos (deja de contar como
      pagado, para que pueda reprocesarse). *Requiere IMAP habilitado en la cuenta de
      Gmail del remitente.*
- [ ] **Historial de nóminas** (`/nomina/historial`): la corrida recién procesada
      aparece en la lista con período, estado, y contadores de éxito/fallo; el enlace
      "Ver detalle" abre la vista en vivo de esa corrida.
- [ ] **Validación de pago duplicado**: volver a procesar el MISMO período para un
      empleado que ya fue pagado exitosamente → el sistema lo omite automáticamente y
      muestra el aviso "ya tiene un pago registrado para este período".

## 5. Parámetros fiscales configurables

- [ ] **Ver configuración actual** (`/configuracion`, solo admin): tasas de AFP, ARS
      y tabla de tramos ISR cargadas.
- [ ] **Modificar una tasa**: cambiar el porcentaje de AFP (o un tramo ISR) y guardar.
- [ ] **Efecto en la próxima nómina**: procesar una nueva corrida y confirmar que las
      deducciones reflejan la tasa modificada (sin haber tocado código ni redeploy).
- [ ] **Restricción de acceso**: confirmar que `rrhh` no puede entrar a `/configuracion`.

## 6. Reportes

- [ ] **Descargar reporte PDF** (`/reportes`): elegir el período ya procesado →
      descarga un PDF con el detalle de todos los empleados pagados y sus totales.
- [ ] **Descargar reporte Excel**: mismo período → descarga `.xlsx` abrible en Excel/
      Google Sheets, con totales cuadrando contra los recibos individuales.
- [ ] **Período sin nómina procesada**: elegir un mes sin datos → mensaje de error
      claro (no un archivo vacío ni un crash).

## 7. Auditoría (trazabilidad)

- [ ] **Ver bitácora completa** (`/auditoria`, solo admin): confirmar que aparecen,
      como mínimo, entradas de: login, creación de empleado, edición, baja,
      eliminación, creación de nómina, finalización de nómina.
- [ ] **Filtrar por tipo de acción**: usar el filtro (ej. "Empleado eliminado") y
      confirmar que solo muestra esas entradas.
- [ ] **Datos de cada entrada**: cada registro muestra fecha, actor (nombre y rol),
      IP, entidad afectada y un detalle legible — no solo un ID críptico.
- [ ] **Inmutabilidad**: explicar (no requiere UI) que la colección es de solo
      inserción — no existe ningún botón de editar/eliminar un registro de auditoría
      en toda la aplicación.
- [ ] **Restricción de acceso**: confirmar que `rrhh` y `empleado` no pueden ver
      `/auditoria`.

## 8. Perfil del empleado (autoservicio)

- [ ] **Vista de solo lectura** (`/mi-perfil` como empleado): nombre, código, correo,
      puesto, cédula, cuenta bancaria y salario bruto visibles pero no editables.
- [ ] **Historial de recibos propio**: la lista de pagos recibidos coincide con las
      nóminas procesadas para ese empleado, con su estado (enviado/error).
- [ ] **Aislamiento de datos**: confirmar que un empleado no puede ver el perfil ni el
      historial de otro (probar acceso directo a otra URL de empleado si aplica).

## 9. Resiliencia y casos límite (para preguntas del jurado)

- [ ] **Concurrencia controlada de envíos**: mencionar/mostrar que el envío de
      correos usa un límite de envíos simultáneos (`PAYROLL_BATCH_CONCURRENCY`) para
      no saturar el proveedor SMTP ni congelar la interfaz.
- [ ] **Registro inmutable ante fallos**: un intento de pago duplicado bloqueado
      también queda registrado en auditoría, no solo silenciado.
- [ ] **Recuperación de error de sesión**: explicar el caso de "perfil no encontrado"
      (si el documento de Firestore no coincide con el UID de Firebase Auth) muestra
      una pantalla de error clara en vez de un bucle de redirecciones.

---

## Orden sugerido para la demo (≈15–20 min)

1. Login como admin → mostrar dashboard y navegación por rol.
2. Crear un empleado nuevo (mostrar cédula auto-formateada + contraseña temporal).
3. Iniciar sesión como ese empleado en una ventana de incógnito → forzar cambio de
   contraseña → mostrar `/mi-perfil`.
4. Volver a la sesión admin: procesar nómina con ese empleado + 1–2 más.
5. Mostrar el estado en tiempo real del proceso y el correo recibido.
6. Mostrar `/nomina/historial` y repetir el mismo período para demostrar el bloqueo
   de pago duplicado.
7. Cambiar una tasa en `/configuracion` y correr una segunda nómina para mostrar el
   efecto.
8. Descargar el reporte PDF/Excel del período.
9. Abrir `/auditoria` y recorrer las entradas generadas durante la demo.
10. Cierre: desactivar al empleado de prueba con su sesión abierta en la ventana de
    incógnito → mostrar el cierre de sesión en tiempo real.
