import path from "path";
import { config as loadEnv } from "dotenv";
import { init } from "@launchdarkly/node-server-sdk";
import { initAi } from "@launchdarkly/server-sdk-ai";

// Ensure .env.local is loaded when running locally (Next.js can miss it with Turbopack/cwd)
if (process.env.NODE_ENV !== "production") {
  loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });
}

const TRIAGE_DEFAULT = {
  enabled: true,
  model: { name: "anthropic.claude-3-5-sonnet-20241022-v2:0" },
  instructions: `You are an expert triage agent for a medical insurance customer support system.
CLASSIFICATION TASK: Analyze the customer's query and classify into ONE of: policy_question, provider_lookup, schedule_agent.
CONTEXT EXTRACTION: Extract policy IDs, locations, specialties, urgency.
CONFIDENCE: 0.9-1.0 clear, 0.7-0.89 minor ambiguity, 0.5-0.69 moderate, <0.5 default to schedule_agent.
Set escalation_needed = true if confidence < 0.7, multiple questions, frustration/urgency, or request for human.

Customer Context: {{ user_context }}
Customer Query: {{ query }}

Respond ONLY with valid JSON (no markdown): {"query_type": "policy_question|provider_lookup|schedule_agent", "confidence_score": 0.95, "extracted_context": {}, "escalation_needed": false, "reasoning": "..."}`,
};

let ldClient = null;

export async function getLdClient() {
  const key = process.env.LD_SDK_KEY;
  if (!key) throw new Error("LD_SDK_KEY is required");
  if (!ldClient) {
    ldClient = init(key);
    await ldClient.waitForInitialization({ timeout: 10 });
  }
  return ldClient;
}

function substituteContext(template, contextVars) {
  let out = template;
  for (const [key, value] of Object.entries(contextVars)) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    out = out.replace(re, String(value));
    out = out.replace(new RegExp(`\\{\\{ldctx\\.${key}\\}\\}`, "g"), String(value));
  }
  return out;
}

export function buildMessagesFromLdConfig(ldConfig, contextVars) {
  const instructions = ldConfig._instructions || ldConfig.instructions;
  if (instructions) {
    const substituted = substituteContext(instructions, contextVars);
    const query = (contextVars.query ?? "").toString();
    const userContext = { ...contextVars };
    delete userContext.query;
    return [
      { role: "system", content: substituted },
      {
        role: "user",
        content: `User query: ${query}\n\nUser context:\n${JSON.stringify(userContext, null, 2)}`,
      },
    ];
  }
  throw new Error("No instructions in LaunchDarkly AI Config for triage_agent.");
}

const AI_CONFIG_KEY = process.env.LD_AI_CONFIG_KEY || "triage_agent";

export async function getTriageConfig(context) {
  const ldClient = await getLdClient();
  const aiClient = initAi(ldClient);
  const ldContext = {
    kind: "user",
    key: (context.user_key || "anonymous").toString(),
    ...context,
  };
  const fallbackConfig = TRIAGE_DEFAULT;
  const agent = await aiClient.agentConfig(
    AI_CONFIG_KEY,
    ldContext,
    fallbackConfig,
    {},
  );
  const modelFromLd = agent.model?.name;
  const usedDefault = !modelFromLd || modelFromLd === fallbackConfig.model.name;
  if (usedDefault) {
    console.warn(
      `[LaunchDarkly] AI Config "${AI_CONFIG_KEY}" not found or returned no model; using default: ${fallbackConfig.model.name}`
    );
  } else {
    console.info(`[LaunchDarkly] Using AI Config "${AI_CONFIG_KEY}" → model: ${modelFromLd}`);
  }
  const config = {
    _instructions: agent.instructions ?? fallbackConfig.instructions,
    model: agent.model
      ? { name: agent.model.name ?? fallbackConfig.model.name }
      : fallbackConfig.model,
  };
  return { config, tracker: agent.tracker };
}
