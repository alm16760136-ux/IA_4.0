import path from "node:path";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import express from "express";

const projectEndpoint = process.env.FOUNDRY_PROJECT_ENDPOINT;
const agentName = process.env.FOUNDRY_AGENT_NAME;

if (!projectEndpoint || !agentName) {
  throw new Error("FOUNDRY_PROJECT_ENDPOINT y FOUNDRY_AGENT_NAME son obligatorios.");
}

let endpointUrl;
try {
  endpointUrl = new URL(projectEndpoint);
} catch {
  throw new Error("FOUNDRY_PROJECT_ENDPOINT debe ser una URL HTTPS válida.");
}
if (endpointUrl.protocol !== "https:") {
  throw new Error("FOUNDRY_PROJECT_ENDPOINT debe ser una URL HTTPS válida.");
}

const projectClient = new AIProjectClient(
  projectEndpoint,
  new DefaultAzureCredential(),
);
const openai = await projectClient.getOpenAIClient();
const app = express();
const publicDirectory = path.join(import.meta.dirname, "public");
const agentReference = {
  body: {
    agent_reference: {
      name: agentName,
      type: "agent_reference",
    },
  },
};

app.use(express.json({ limit: "16kb" }));
app.use(express.static(publicDirectory));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/chat", async (request, response) => {
  const message = request.body?.message;
  const requestedConversationId = request.body?.conversation_id;

  if (typeof message !== "string" || message.trim().length < 1 || message.trim().length > 2000) {
    response.status(422).json({
      error: "El mensaje debe tener entre 1 y 2000 caracteres.",
    });
    return;
  }

  if (
    requestedConversationId !== undefined &&
    requestedConversationId !== null &&
    (typeof requestedConversationId !== "string" ||
      requestedConversationId.length === 0 ||
      requestedConversationId.length > 256)
  ) {
    response.status(422).json({ error: "El identificador de conversación no es válido." });
    return;
  }

  let operation = "conversation creation";
  try {
    const conversation = requestedConversationId
      ? requestedConversationId
      : (await openai.conversations.create()).id;
    operation = "response generation";
    const result = await openai.responses.create(
      {
        conversation,
        input: message.trim(),
      },
      agentReference,
    );

    if (typeof result.output_text !== "string") {
      throw new Error("Foundry no devolvió texto para la respuesta.");
    }

    response.json({
      reply: result.output_text,
      conversation_id: conversation,
    });
  } catch (error) {
    const statusCode = error && typeof error === "object"
      ? error.statusCode ?? error.status
      : undefined;
    const serviceError = error && typeof error === "object" &&
      "error" in error && error.error && typeof error.error === "object"
      ? error.error
      : undefined;
    const code = error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
    const diagnostic = error instanceof Error
      ? String(serviceError?.message ?? error.message)
          .replaceAll(projectEndpoint, "[endpoint]")
          .replaceAll(agentName, "[agent]")
          .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
          .slice(0, 300)
      : "Unknown error";
    console.error(
      "Foundry request failed:",
      operation,
      error instanceof Error ? error.name : "UnknownError",
      statusCode ?? "no HTTP status",
      code ?? "",
      diagnostic,
    );
    response.status(502).json({
      error: "No se pudo obtener una respuesta en este momento. Inténtalo de nuevo.",
    });
  }
});

app.use((error, request, response, next) => {
  if (request.path === "/api/chat" && error?.type === "entity.too.large") {
    response.status(422).json({
      error: "El mensaje debe tener entre 1 y 2000 caracteres.",
    });
    return;
  }

  next(error);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
