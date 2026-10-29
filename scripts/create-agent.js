import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const requiredVariables = [
  "FOUNDRY_PROJECT_ENDPOINT",
  "FOUNDRY_AGENT_NAME",
  "FOUNDRY_MODEL_DEPLOYMENT_NAME",
  "FOUNDRY_AGENT_INSTRUCTIONS",
];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

let endpointIsValid = false;
try {
  endpointIsValid =
    new URL(process.env.FOUNDRY_PROJECT_ENDPOINT).protocol === "https:";
} catch {
  endpointIsValid = false;
}

if (missingVariables.length > 0) {
  console.error(`Faltan variables de entorno: ${missingVariables.join(", ")}`);
  process.exitCode = 1;
} else if (!endpointIsValid) {
  console.error("FOUNDRY_PROJECT_ENDPOINT debe ser una URL HTTPS válida.");
  process.exitCode = 1;
} else {
  try {
    const project = new AIProjectClient(
      process.env.FOUNDRY_PROJECT_ENDPOINT,
      new DefaultAzureCredential(),
    );

    for await (const agent of project.agents.list()) {
      if (agent.name === process.env.FOUNDRY_AGENT_NAME) {
        throw new Error(
          `Ya existe un agente llamado "${process.env.FOUNDRY_AGENT_NAME}". No se creó ni modificó ningún agente.`,
        );
      }
    }

    const agent = await project.agents.createVersion(
      process.env.FOUNDRY_AGENT_NAME,
      {
        kind: "prompt",
        model: process.env.FOUNDRY_MODEL_DEPLOYMENT_NAME,
        instructions: process.env.FOUNDRY_AGENT_INSTRUCTIONS,
      },
    );
    console.log(`Agente creado: ${agent.name}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Ya existe un agente llamado")) {
      console.error(error.message);
    } else {
      console.error("No se pudo crear el agente. Verifica la conexión, la identidad y los permisos.");
    }
    process.exitCode = 1;
  }
}
