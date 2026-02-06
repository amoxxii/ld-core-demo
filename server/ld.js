import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";
import { init } from "@launchdarkly/node-server-sdk";
import { initAi } from "@launchdarkly/server-sdk-ai";

// Ensure .env.local is loaded when running locally (Next.js can miss it with Turbopack/cwd)
if (process.env.NODE_ENV !== "production") {
  loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load default AI configs from ai-config-defaults.json
const AI_CONFIG_DEFAULTS = JSON.parse(
  readFileSync(path.join(__dirname, "ai-config-defaults.json"), "utf-8")
);

export const TRIAGE_DEFAULT = AI_CONFIG_DEFAULTS.triage_agent;
export const BRAND_AGENT_DEFAULT = AI_CONFIG_DEFAULTS.brand_agent;

/** Map queryType from triage to LaunchDarkly AI Config key and fallback. */
export const SPECIALIST_AI_CONFIG = {
  policy_question: { configKey: "policy_agent", fallback: AI_CONFIG_DEFAULTS.policy_agent },
  provider_lookup: { configKey: "provider_agent", fallback: AI_CONFIG_DEFAULTS.provider_agent },
  scheduler_agent: { configKey: "scheduler_agent", fallback: AI_CONFIG_DEFAULTS.scheduler_agent },
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
  throw new Error("No instructions in LaunchDarkly AI Config.");
}

/**
 * Fetch AI config from LaunchDarkly for any agent (triage, specialist, brand).
 * @param {string} configKey - LaunchDarkly AI Config key (e.g. "triage_agent", "policy_agent")
 * @param {object} context - Context for targeting (user_key, query, user_context, etc.)
 * @param {object} fallbackConfig - Fallback { model, instructions } when LD is unavailable
 * @returns {Promise<{ config: object, tracker: object }>}
 */
export async function getAIConfig(configKey, context, fallbackConfig) {
  const ldClient = await getLdClient();
  const aiClient = initAi(ldClient);
  const ldContext = {
    kind: "user",
    key: (context.user_key || "anonymous").toString(),
    ...context,
  };
  const agent = await aiClient.agentConfig(configKey, ldContext, fallbackConfig, {});
  const modelFromLd = agent.model?.name;
  const usedDefault = !modelFromLd || modelFromLd === fallbackConfig.model?.name;
  if (usedDefault) {
    console.warn(
      `[LaunchDarkly] AI Config "${configKey}" not found or returned no model; using default: ${fallbackConfig.model?.name}`
    );
  } else {
    console.info(`[LaunchDarkly] Using AI Config "${configKey}" → model: ${modelFromLd}`);
  }
  const config = {
    _instructions: agent.instructions ?? fallbackConfig.instructions,
    model: agent.model
      ? { name: agent.model.name ?? fallbackConfig.model?.name }
      : fallbackConfig.model,
  };
  const noopTracker = {
    trackSuccess: () => {},
    trackError: () => {},
    trackTokens: () => {},
    trackTimeToFirstToken: () => {},
    trackDuration: () => {},
  };
  return { config, tracker: agent.tracker ?? noopTracker };
}
