# Verbatim clauses — geodata licensing evidence

Extracted verbatim from the fetched pages in this directory. Every line beginning
with `> ` is a quote and is verified against the fetched source by
`tools/verify-quotes.mjs`. Text is a plain-text rendering of the fetched HTML
(tags and scripts removed); internal line breaks within a clause were flattened to
single spaces so each quoted span is a contiguous string.

Fetched 2026-09-28 via `curl` (the harness `web_fetch` tool is blocked in this
environment; `curl` reaches these hosts).

---

## 1. GOOGLE MAPS PLATFORM SERVICE TERMS

Source file: `google-maps-service-terms.html`
URL: https://cloud.google.com/maps-platform/terms/maps-service-terms

### 1.1 Section 14 — Places API (Legacy and New)

> 14.1 Use without a Google Map. Customer may use Google Maps Content from the Places API in Customer Applications without a corresponding Google Map.

> 14.2 No use with a non-Google map. Customer must not use Google Maps Content from the Places API in conjunction with a non-Google map.

> 14.3 Caching. Customer may temporarily cache latitude and longitude values from the Places API for up to 30 consecutive calendar days, after which Customer must delete the cached latitude and longitude values.

### 1.2 Section 11.8 — Caching (Directions / Distance Matrix family)

> 11.8 Caching. Customer may temporarily cache latitude (lat), longitude (lng), distance, duration, time, and estimated time of arrival values for up to 30 consecutive calendar days, after which Customer must delete the cached values.

### 1.3 Section 12 — Navigation SDK

> 12.2 No Use with a non-Google map. Customer must not use Google Maps Content from the Navigation SDK in conjunction with a non-Google map.

> 12.3 Caching. Customer may temporarily cache latitude (lat) and longitude (lng) values from the Navigation SDK for up to 30 consecutive calendar days, after which Customer must delete the cached latitude and longitude values.

### 1.4 Section 15 — Places UI Kit

> 15.2 Caching. Customer may temporarily cache latitude and longitude values from the Places UI Kit for up to 30 consecutive calendar days, after which Customer must delete the cached latitude and longitude values.

### 1.5 Section 2 — Attribution

> 2. Attribution Customer will attribute all the Services in accordance with the Documentation.

### 1.6 The 30-day rule is platform-wide, not per-API

The service terms contain 17 distinct numbered caching clauses: 1.3, 2.2, 3.3,
4.3, 6.3, 7.3, 11.8, 12.3, 13.2, 14.3, 15.2, 16.2, 17.3, 18.3, 19.3, 20.2, 21.2.

---

## 2. OPENSTREETMAP — DATA LICENCE (ODbL)

Source file: `osm-copyright-odbl.html`
URL: https://www.openstreetmap.org/copyright

> OpenStreetMap is open data, licensed under the Open Data Commons Open Database License (ODbL) by the OpenStreetMap Foundation (OSMF). In summary:

> You are free to copy, distribute, transmit and adapt our data, as long as you credit OpenStreetMap and its contributors. If you alter or build upon our data, you may distribute the result only under the same license.

> Our documentation is licensed under the Creative Commons Attribution-ShareAlike 2.0 license (CC BY-SA 2.0).

> Where you use OpenStreetMap data, you are required to do the following two things:

> Provide credit to OpenStreetMap by displaying our attribution notice. Make clear that the data is available under the Open Database License.

---

## 3. OPENSTREETMAP FOUNDATION — TILE USAGE POLICY

Source file: `osm-tile-usage-policy.html`
URL: https://operations.osmfoundation.org/policies/tiles/

> You must not: Bulk download (“scrape”) tiles or offer prefetch features.

> Features such as “Download city/country for offline use” or “Save area for later” rely on prefetch/bulk downloading and are therefore prohibited.

> Note: If you require offline maps, use self-hosted tiles or a provider that explicitly allows offline/prefetching. Vector tiles are often more suitable for this use-case.

> Permitted usage (examples): Normal interactive viewing by a human where the client requests only the tiles needed for the current viewport (with modest, short-range look-ahead typical of browsers).

> Preloading entire towns/regions or multiple zoom stacks “just in case”.

> Enforcement: Prefetch/offline patterns place disproportionate load on community-funded servers and will be blocked without notice. Repeated violations may lead to longer-term or network-level blocks.

> Show OpenStreetMap licence attribution clearly on the map (typically bottom-right).

> Provide visible licence attribution, following the Attribution Guidelines.

---

## 4. GEOFABRIK — JAPAN EXTRACT

Source file: `geofabrik-japan.html`
URL: https://download.geofabrik.de/asia/japan.html

> Download OpenStreetMap data for this region: Japan

> Commonly Used Formats japan-latest.osm.pbf, suitable for Osmium, Osmosis, imposm, osm2pgsql, mkgmap, and others. This file was last modified 13 hours ago and contains all OSM data up to 2026-09-27T20:23:36Z. File size: 2.4 GB.

> The OpenStreetMap data files provided on this server do not contain the user names, user IDs and changeset IDs of the OSM objects because these fields are assumed to contain personal information about the OpenStreetMap contributors and are therefore subject to data protection regulations in the European Union.

---

## 5. NOT RETRIEVED — recorded as gaps, not as findings

- **ODPT (公共交通オープンデータセンター)**, https://developer.odpt.org/ — the fetched
  page was 636 bytes with ~55 visible characters (a JavaScript shell). Its terms of
  use were NOT obtained, so nothing about Japanese open transit data is claimed.
- **Foursquare Places platform policy** — the URL attempted returned HTTP 404.
- **Google Places API pricing schedule** — `google-places-billing.html` was fetched
  (209,299 bytes) but its static text contains no per-1,000-call price table, so NO
  price is claimed.
- **Japanese fare and opening-hours sources** (official operator pages, じゃらん,
  食べログ) — not fetched, not claimed.
