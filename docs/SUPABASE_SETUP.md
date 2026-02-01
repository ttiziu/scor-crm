# Configuración de Supabase para SCOR CRM

Sigue estos pasos para conectar el proyecto con Supabase (PostgreSQL).  
Si algo no coincide con tu pantalla, puedes enviar una captura y te guiamos.

---

## 1. Crear proyecto en Supabase

1. Entra a [https://supabase.com](https://supabase.com) e inicia sesión.
2. Clic en **New project**.
3. Elige tu **Organization** (o crea una).
4. **Name**: por ejemplo `scor-crm` o `gas-crm`.
5. **Database Password**: crea una contraseña y **guárdala** (la usarás en `.env`).
6. **Region**: la que prefieras.
7. Clic en **Create new project** y espera a que termine de crearse.

---

## 2. Obtener las URLs de conexión

1. En el proyecto, ve a **Project Settings** (ícono de engranaje en el menú lateral).
2. En el menú izquierdo, entra a **Database**.
3. Baja hasta la sección **Connection string**.
4. Verás varias pestañas (por ejemplo **URI**, **JDBC**, etc.) y modos:
   - **Session mode** (puerto **5432**)
   - **Transaction mode** (puerto **6543**, recomendado para apps con muchas conexiones)

Para este proyecto necesitas **dos URLs**:

### URL para la app (con pooler, opción Transaction)

- Elige la pestaña que diga **URI** (o **Connection string**).
- Si hay selector de modo, elige **Transaction** (puerto **6543**).
- Copia la URL. Será algo como:
  ```text
  postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  ```
- Sustituye `[YOUR-PASSWORD]` por la contraseña de la base de datos que creaste en el paso 1.
- Esa URL (con la contraseña ya puesta) será tu **`DATABASE_URL`** en `.env`.

### URL directa (para migraciones)

- En la misma página **Database**, busca **Direct connection** o la conexión que use el puerto **5432** (sin pooler).
- La URL suele ser de la forma:
  ```text
  postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
  ```
- Sustituye `[YOUR-PASSWORD]` por la misma contraseña.
- Esa URL será tu **`DIRECT_URL`** en `.env`.

Si en la interfaz solo ves una URL, puedes usar la misma en ambos (`DATABASE_URL` y `DIRECT_URL`) para probar; si las migraciones fallan con pooler, usa la URL directa (puerto 5432) como `DIRECT_URL`.

---

## 3. Crear el archivo `.env` en el proyecto

1. En la raíz del proyecto (donde está `package.json`), copia el ejemplo:
   ```bash
   cp .env.example .env
   ```
2. Abre `.env` y rellena:
   - **`DATABASE_URL`**: la URL con pooler (Transaction, puerto 6543), con la contraseña ya puesta.
   - **`DIRECT_URL`**: la URL directa (puerto 5432), con la contraseña ya puesta.
   - **`JWT_SECRET`**: una clave secreta para firmar el JWT (por ejemplo una cadena larga aleatoria; en producción usa algo seguro).

Ejemplo (sustituye contraseña y proyecto/región por los tuyos):

```env
DATABASE_URL="postgresql://postgres.abcdefghij:MiPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:MiPassword123@db.abcdefghij.supabase.co:5432/postgres"
JWT_SECRET="una-clave-secreta-larga-y-aleatoria"
```

Guarda el archivo. **No subas `.env` a Git** (ya está en `.gitignore`).

---

## 4. Ejecutar migraciones y seed

En la raíz del proyecto:

```bash
npm run db:migrate
```

Cuando pida un nombre para la migración, puedes usar `init`.

Luego ejecuta el seed:

```bash
npm run db:seed
```

Deberías ver en consola los usuarios de prueba (admin@demo.com / admin123, etc.).

---

## Resumen

| Paso | Dónde                       | Qué hacer                                                                               |
| ---- | --------------------------- | --------------------------------------------------------------------------------------- |
| 1    | Supabase dashboard          | Crear proyecto y guardar contraseña de DB                                               |
| 2    | Project Settings → Database | Copiar URL con pooler (6543) y URL directa (5432)                                       |
| 3    | Proyecto (raíz)             | Crear `.env` desde `.env.example` y rellenar `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` |
| 4    | Terminal                    | `npm run db:migrate` y `npm run db:seed`                                                |

Si en algún paso la pantalla de Supabase no coincide con esto, envía una captura de lo que ves y te indicamos exactamente qué copiar y dónde pegarlo.
