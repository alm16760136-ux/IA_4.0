# Chat con Microsoft Foundry

Aplicación web de una sola vista. El navegador envía mensajes al backend
Express; solo el backend se conecta con Microsoft Foundry.

## Requisitos

- Node.js 24 LTS y npm.
- Un proyecto de Microsoft Foundry, un deployment de modelo y un agente.
- Una identidad con acceso al proyecto Foundry. En local, `DefaultAzureCredential`
  puede usar la sesión de Azure CLI; en Azure App Service, configura identidad
  administrada y otórgale acceso al proyecto.

## Configuración

Define estas variables de entorno en el entorno local o en App Service:

| Variable | Uso |
| --- | --- |
| `FOUNDRY_PROJECT_ENDPOINT` | Endpoint del proyecto Foundry. |
| `FOUNDRY_AGENT_NAME` | Nombre del agente usado por el backend. |
| `FOUNDRY_MODEL_DEPLOYMENT_NAME` | Deployment del modelo al crear el agente. |
| `FOUNDRY_AGENT_INSTRUCTIONS` | Instrucciones iniciales del agente. |
| `PORT` | Puerto HTTP; App Service lo proporciona en producción. |

Para desarrollo local, crea un `.env` local con esos valores. No lo compartas ni
lo incluyas en control de versiones; `.env` está excluido por `.gitignore`.
La aplicación no usa API keys ni el paquete `dotenv`.

## Instalar e iniciar

```powershell
npm install
npm run dev
```

Abre `http://localhost:3000`. El modo de desarrollo carga `.env` con la opción
nativa de Node.js `--env-file-if-exists`. En producción, configura las variables
en el entorno y ejecuta:

```powershell
npm start
```

El script `start` ejecuta `node server.js`.

## Crear el agente

Con las cuatro variables Foundry configuradas y una identidad autenticada:

```powershell
npm run create-agent
```

El script crea un agente `prompt`. Si ya hay un agente con el nombre
`FOUNDRY_AGENT_NAME`, informa el conflicto y termina sin crear ni reemplazar
versiones.

## Comprobar el servicio

```powershell
Invoke-RestMethod http://localhost:3000/health
```

La respuesta debe contener `status: ok`. `POST /api/chat` acepta un objeto JSON
con `message` y, para continuar un hilo, `conversation_id`. El mensaje debe
contener de 1 a 2000 caracteres; los valores no válidos reciben HTTP 422.
