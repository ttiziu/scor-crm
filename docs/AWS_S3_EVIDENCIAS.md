# AWS S3 para evidencias de entrega

Los repartidores suben una foto de evidencia (voucher, POS, Yape, etc.) al marcar un pedido como entregado. Esas fotos se guardan en **AWS S3**, no en la base de datos.

## Variables de entorno

Añade en tu `.env` (y en Vercel → Environment Variables):

```env
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
S3_BUCKET_EVIDENCIAS=gas-crm-evidencias
```

## Crear el bucket en AWS

1. Entra a [AWS S3](https://s3.console.aws.amazon.com/) y crea un bucket (ej. `gas-crm-evidencias`).
2. **Bloquear acceso público** por defecto está bien; las URLs que guardamos son del estilo `https://BUCKET.s3.REGION.amazonaws.com/evidencias/...`. Para que esas URLs abran la imagen tienes dos opciones:

   - **Opción A (recomendada):** Habilitar “Block Public Access” y usar **presigned URLs** al mostrar la evidencia (habría que añadir un endpoint que devuelva la URL firmada).
   - **Opción B:** En “Bucket policy”, permitir lectura pública solo en la carpeta `evidencias/` para que las URLs guardadas funcionen sin firmar.

3. Crea un **usuario IAM** (Access key) con permiso `s3:PutObject` (y si usas opción B, el bucket policy ya da lectura). Usa ese Access key y Secret key en las variables de entorno.

## Sin S3 configurado

Si no configuras estas variables, al intentar “Confirmar entrega” con foto la API responderá con error 500 indicando que revise la configuración de AWS S3. El resto del CRM sigue funcionando; solo falla el registro de entrega con evidencia.
