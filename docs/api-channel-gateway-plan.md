# API Channel Gateway Plan

## Recommendation

Keep API channel routing in the frontend by default. Use the local server only as an optional advanced gateway when a deployment needs one of these capabilities:

- hide API keys from the browser UI;
- share one channel pool across multiple devices or users;
- enforce global concurrency/RPM limits across all clients;
- collect usage/cost statistics in one place;
- add central failover, audit logs, or provider-specific secret rotation.

For single-user desktop usage, the app-level channel manager is simpler and avoids another service dependency.

## Current frontend responsibilities

The frontend now owns the default API management layer:

- protocol normalization and model-list request construction in `src/api/protocols/`;
- provider/channel schema fields in `src/api/schemas.js`;
- model route selection in `src/api/modelRouter.js`;
- local per-channel request scheduling in `src/api/requestScheduler.js`;
- settings UI fields for route strategy, priority, rate limits, timeout, and cost weight.

## Optional local gateway responsibilities

If enabled later, `localserver/tapnow-server-full.py` should remain an optional gateway rather than a hard dependency. A good staged design is:

1. Add a `/api-gateway/*` route namespace beside the existing `/proxy` route.
2. Store channels in the local server config with encrypted or OS-protected secrets where possible.
3. Apply global limit policies before forwarding requests.
4. Persist lightweight usage records: timestamp, channel id, model id, task type, status, latency, estimated cost.
5. Return OpenAI-compatible responses where practical, but preserve raw provider responses for custom templates.

## Suggested local config shape

```json
{
  "api_gateway": {
    "enabled": false,
    "channels": {
      "openai-main": {
        "apiType": "openai",
        "baseUrl": "https://api.openai.com",
        "apiKeyEnv": "OPENAI_API_KEY",
        "priority": 80,
        "limitPolicy": { "maxConcurrency": 4, "rpm": 60, "timeoutMs": 300000 },
        "pricing": { "currency": "USD", "costWeight": 1 }
      }
    }
  }
}
```

## Migration path

1. Continue using frontend routing and limits by default.
2. Add a gateway switch per provider: `direct`, `browser-proxy`, or `local-gateway`.
3. When `local-gateway` is selected, the frontend sends logical model/task metadata to the local server instead of raw provider credentials.
4. Move only the selected channel's secret and global accounting to the local server; keep model library and UI route editing in the app.

This keeps simple local usage lightweight while leaving a clear path to a self-hosted relay for team or high-volume scenarios.
