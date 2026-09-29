---
updatedAt: 2026-06-18T16:20:04.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# API Access and Limits

## Rate Limiting and Quotas

Terra enforces rate limits to protect the platform and ensure fair usage. Limits are applied at two levels:

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Limit type
      </th>

      <th style={{ textAlign: "left" }}>
        Scope
      </th>

      <th style={{ textAlign: "left" }}>
        What it controls
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        Requests per second (QPS)
      </td>

      <td style={{ textAlign: "left" }}>
        Per account
      </td>

      <td style={{ textAlign: "left" }}>
        Maximum sustained request rate. Discover: 10 QPS. Growth: 25 QPS. Scale+: 50 QPS.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        Daily quota
      </td>

      <td style={{ textAlign: "left" }}>
        Per account
      </td>

      <td style={{ textAlign: "left" }}>
        Maximum total API calls per calendar day. Configured per your package and can be capped in the Dashboard.

        For customers using the Discover package, 10,000 calls per day per API (though you may further restrict your  API usage in your dashboard to help you manage your budget). For all other customers, the daily call limit is specified in your contract with Tripadvisor.
      </td>
    </tr>
  </tbody>
</Table>

When you exceed a limit, the API returns 429 Too Many Requests. Implement exponential backoff with jitter in your retry logic. Do not retry immediately or in a tight loop — this will extend your rate-limit window.

### Reducing unnecessary calls

1. **Cache responses** — Follow the Terra Caching Policy. Location data and reviews change infrequently; caching reduces quota consumption significantly.
2. **Use multi-get** — Fetch multiple locations in a single request to reduce round trips (note: billing is per entity, not per call).
3. **Set a daily budget cap** — Configure a daily call limit in your Dashboard to avoid unexpected overages.

## Endpoint Authorization

Your API key does not grant blanket access to every Terra endpoint. Access is controlled by your package (Discover, Growth, Scale, Innovate, Transform) and any add-ons you have enabled. Each package defines which API endpoints are authorized.

Attempting to call an endpoint outside your subscription returns `403 Forbidden` with the message "API Key does not have access to endpoint." To gain access to additional endpoints, upgrade your package or enable the relevant add-on in your Dashboard.