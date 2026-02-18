// ================================
// REACT SDK
// ================================
import * as LDReact from "launchdarkly-react-client-sdk";

// Try typing: LDReact.
console.log("React SDK exports:", LDReact);

// Common React SDK exports:
// LDReact.asyncWithLDProvider
// LDReact.withLDProvider
// LDReact.useFlags
// LDReact.useLDClient
// LDReact.useLDClientError
// LDReact.LDProvider



// ================================
// BROWSER JS CLIENT SDK
// ================================
import * as LDJS from "launchdarkly-js-client-sdk";

// Try typing: LDJS.
console.log("JS Client SDK exports:", LDJS);

// Example initialize (DO NOT hardcode real key in production)
const jsClient = LDJS.initialize("client-side-id", {
  kind: "user",
  key: "demo-user"
});

jsClient.on("ready", () => {
  const value = jsClient.variation("demo-flag", false);
  console.log("Browser flag value:", value);
});



// ================================
// NODE SERVER SDK
// ================================
import * as LDNode from "@launchdarkly/node-server-sdk";

// Try typing: LDNode.
console.log("Node SDK exports:", LDNode);

// Example (SERVER ONLY — do not use in frontend)
async function exampleNodeUsage() {
  const nodeClient = LDNode.init("sdk-key");

  await nodeClient.waitForInitialization();

  const value = await nodeClient.variation(
    "secure-flag",
    { kind: "user", key: "server-user" },
    false
  );

  console.log("Server flag value:", value);
}



// ================================
// BROWSER TELEMETRY
// ================================
import * as BrowserTelemetry from "@launchdarkly/browser-telemetry";

// Try typing: BrowserTelemetry.
console.log("Browser Telemetry exports:", BrowserTelemetry);

// Example
BrowserTelemetry.initTelemetry();
const inspectorList = BrowserTelemetry.inspectors();



// ================================
// FRONTEND OBSERVABILITY
// ================================
import Observability from "@launchdarkly/observability";

// Example plugin instance
const frontendObservability = new Observability({
  serviceName: "demo-service",
  version: "1.0.0",
  tracingOrigins: true,
});



// ================================
// NODE OBSERVABILITY
// ================================
import ObservabilityNode from "@launchdarkly/observability-node";

const backendObservability = new ObservabilityNode({
  serviceName: "backend-service",
  version: "1.0.0",
});



// ================================
// SESSION REPLAY
// ================================
import SessionReplay from "@launchdarkly/session-replay";

const sessionReplay = new SessionReplay({
  serviceName: "demo-session",
  privacySetting: "none",
});



// ================================
// TOOLBAR
// ================================
import * as LDToolbar from "@launchdarkly/toolbar";

// Try typing: LDToolbar.
console.log("Toolbar exports:", LDToolbar);



// ================================
// SERVER SDK AI
// ================================
import * as LDSdkAI from "@launchdarkly/server-sdk-ai";

// Try typing: LDSdkAI.
console.log("AI SDK exports:", LDSdkAI);



// ================================
// OPENTELEMETRY NODE SDK
// ================================
import * as OpenTelemetry from "@opentelemetry/sdk-node";

// Try typing: OpenTelemetry.
console.log("OpenTelemetry exports:", OpenTelemetry);

