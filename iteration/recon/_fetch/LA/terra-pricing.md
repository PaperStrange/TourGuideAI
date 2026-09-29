---
updatedAt: 2026-06-16T15:33:12.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Discover Usage-based Pricing

## Summary

The Discover self-service package on Terra uses usage-based pricing. Usage is measured as billable entities: for most location-related endpoints, each location ID returned in a successful response counts as one billable entity. This model applies whether you request one location per HTTP call or use multi-get to fetch several locations in a single call (each returned location ID counts the same as if you had made separate requests). See below for more details about how billable entities are calculated.

Discover includes a one-time free usage allowance where the **first 1,000 billable entities for your account are free**. After you exceed 1,000 billable entities for the lifetime of your account, then volume-based rates apply per billing period. Higher monthly volume receives automatic tier discounts down to a published floor rate.

## Who this applies to

Usage-based charges apply to partners on the Discover package. Other packages may use different commercial models.

## Billable unit: “billable entity”

Endpoints are documented in the Terra API reference. Usage metering follows these patterns:

| Area                     | Routes                     | How each "billable entity" is counted |
| :----------------------- | :------------------------- | :------------------------------------ |
| Locations                | /locations                 | Per location ID returned              |
| Search locations         | /locations/search          | Per location ID returned              |
| Search nearby locations  | /locations/nearby          | Per location ID returned              |
| Search locations catalog | /catalog/locations/search  | Per location ID returned              |
| Search locations nearby  | /catalog//locations/nearby | Per location ID returned              |
| Location reviews         | /locations/reviews         | Per location (one per API call)       |
| Location photos          | /locations/photos          | Per location (one per API call)       |
| Geo                      | /geos                      | Per geo ID returned                   |

If your project adds or changes endpoints, the authoritative list is always the current API documentation plus your commercial agreement.

## Which responses and endpoints count toward usage

4xx client errors and 5xx server errors are not counted toward billable usage. Implementations should still treat non-success responses correctly for retries, backoff, and rate limiting (for example 429).

For customers with access to the Feed file API and Allowlist API, requests against these endpoints do not count towards usage.

## Free allowance and volume tiers (Discover)

Pricing is per billable entity, aggregated per invoice cycle (aligned to your monthly billing period), after any published free allowance.

The following tier structure is the reference for how usage maps to price per billable entity for Discover, after you have exceeded the published one-time free allowance (for the avoidance of doubt, the free allowance is granted once per account lifetime and does not repeat monthly):

| Price Tier | Usage (billable entities per invoice cycle) | Price per Billable Entity (USD) |
| :--------: | ------------------------------------------- | ------------------------------: |
|      1     | 1 – 1,000                                   |                        $0.01500 |
|      2     | 1,001 – 2,000                               |                        $0.01350 |
|      3     | 2,001 – 3,000                               |                        $0.01215 |
|      4     | 3,001 – 4,000                               |                        $0.01094 |
|      5     | 4,001 – 5,000                               |                        $0.00984 |
|      6     | 5,001+                                      |                        $0.00900 |

Exact totals for a billing cycle are computed by our billing system from **metered usage**; the table is the reference for tier boundaries and list prices.