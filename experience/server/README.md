# Shared travel rooms

This Node service stores invited rooms, participant contributions, shared destination focus, and an ordered plan in SQLite. Clients receive full room snapshots through Server-Sent Events. A configured OpenAI-compatible provider can propose an order using the room's supplied place catalog.

## Run locally

Requires Node 24.19 or newer. Run these commands from `experience/server`:

```sh
npm ci
npm test
npm start
```

The default address is `http://127.0.0.1:8787`. The default database is `.data/rooms.sqlite`, relative to the process working directory. The frontend development server can proxy `/api` to this address. For a separately hosted API, the frontend uses `VITE_TRAVEL_API_URL` and the service allows its exact origin through `ALLOWED_ORIGINS`.

`.env.example` documents the variables. Supply them through the shell, hosting service, or Node's `--env-file` option:

```sh
node --env-file=.env src/server.js
```

Keep credentials in `.env` or the hosting secret store. The service never returns its API key, model name, or provider endpoint from health checks.

| Variable | Meaning |
| --- | --- |
| `HOST` | Listen address; default `127.0.0.1`, use `0.0.0.0` inside a container. |
| `PORT` | HTTP listen port; default `8787`. |
| `DATABASE_PATH` | SQLite file on a persistent writable volume. |
| `ALLOWED_ORIGINS` | Comma-separated exact frontend origins, including scheme and port. |
| `TRUST_PROXY_HOPS` | Optional known reverse-proxy count, from 1 to 5. Leave unset for direct access. |
| `LLM_BASE_URL` | OpenAI-compatible API base; default `https://api.openai.com/v1`. HTTPS is required except for loopback development. |
| `LLM_MODEL` | Provider model supporting Chat Completions, strict JSON Schema, and `max_completion_tokens`. |
| `LLM_API_KEY` | Server-side provider credential. |

Both `LLM_MODEL` and `LLM_API_KEY` are required for planning. Missing configuration returns HTTP 503 with `llm_unconfigured`. Requests have a 30-second timeout and a 1,600-token output budget. Six planning requests per minute per client IP are allowed; configure provider spending limits separately.

## API

All request and response bodies use JSON, except the SSE stream. Error responses contain `{ "error": { "code": "...", "message": "..." } }`. Validation errors add a `fields` array. Responses use `Cache-Control: no-store`.

### Health and creation

`GET /api/health` returns:

```json
{
  "ok": true,
  "capabilities": { "rooms": true, "events": true, "planning": false },
  "provider": { "configured": false }
}
```

`POST /api/rooms` accepts `{title, displayName, catalog}` and returns HTTP 201 with `{room, inviteToken, participantId, participantToken}`.

A catalog place has `{id, name, kind, latitude, longitude, country?, city?, sourceUrl?}`. `kind` is `country`, `city`, or `poi`. Coordinates must be finite WGS84 degrees. A room supports 200 catalog places, 30 participants, and 300 contributed wishes. Place IDs are stable, unique identifiers containing letters, digits, colon, underscore or hyphen. The caller supplies place evidence; this service validates fields and preserves the supplied source reference.

Room snapshots contain:

```text
id, title, revision, catalog, createdAt, updatedAt
participants: [{id, displayName, focusedDestinationId, joinedAt}]
dreams: [{id, participantId, destinationId, note}]
plan: null | {title, summary, stopIds, proposedBy, acceptedBy, status}
```

Timestamps are ISO strings. The initial revision is zero. A participant's focus is the last destination they explicitly shared. The service stores no precise GPS position or connected/online assertion.

### Invitations and participant credentials

Room reads and live subscriptions require `Authorization: Bearer <inviteToken>`. Put the invitation token in the browser URL fragment when sharing an invitation, then send it in the authorization header. Tokens must stay out of query strings and logs.

`GET /api/rooms/:id` returns `{room}`.

`POST /api/rooms/:id/actions` accepts:

```json
{
  "expectedRevision": 0,
  "action": { "type": "participant.join", "displayName": "Friend" }
}
```

Joining returns `{room, participantId, participantToken}`. Retain the participant credential privately in that client. Every subsequent action also requires `X-Participant-Token: <participantToken>` and `participantId` in the body. A participant credential belongs to one room and one participant. Display names are user-provided labels.

| Action | Additional action fields | Behavior |
| --- | --- | --- |
| `catalog.add` | `place` | Add a validated place with a new ID. |
| `presence.focus` | `destinationId` or `null` | Publish the participant's chosen place. |
| `dream.add` | `destinationId`, optional `note` | Add a contributor-owned wish. |
| `dream.remove` | `dreamId` | Remove the caller's own wish. |
| `plan.propose` | `title`, `summary`, `stopIds` | Publish an explicitly chosen proposal. |
| `plan.reorder` | `stopIds` | Retain and reorder every existing plan stop once. |
| `plan.accept` | — | Record this participant's acceptance. |

Successful actions return `{room}`. A stale revision returns HTTP 409 with `{error:{code:"revision_conflict",message},room}`. Review the new snapshot before retrying the intended change. The server never retries a conflicting mutation automatically.

Every plan edit or wish change clears previous acceptances. A proposal must include every current contributed destination; an older proposal missing a newly added wish cannot be accepted. The plan becomes `accepted` when every participant has accepted it. A newly joined participant must accept it before that status returns. Invitations and memberships persist with the room; account recovery, participant removal, and invitation rotation are not provided by this service.

### Live updates

`GET /api/rooms/:id/events` accepts the same invitation header and returns `text/event-stream`. Use fetch streaming with an SSE parser so authorization remains in headers. Each `room` event contains the full snapshot; the SSE event ID equals its revision. A connection immediately receives the latest snapshot, followed by committed changes and a heartbeat comment every 15 seconds.

Reconnect by opening a new stream and replacing the local snapshot with the latest revision. `Last-Event-ID` is accepted by CORS; the service supplies current state rather than an event-history replay. A room permits 64 simultaneous streams. Slow readers are disconnected if their pending HTTP response buffer exceeds 4 MiB.

Service shutdown ends live streams, rejects new requests and closes remaining HTTP sockets after a five-second grace period. This also covers unfinished connections created during client reconnects.

### LLM proposal

`POST /api/plan` requires both invitation and participant headers, with body `{roomId,participantId,preferences?,locale?}`. `locale` is `en` or `zh`; preferences are limited to 2,000 characters. The room must contain at least one contributed destination.

The response is `{plan:{title,summary,stopIds},basedOnRevision}`. Every returned ID must exist in the room catalog, each contributed destination must be included, and the plan may contain at most 30 unique stops. Coordinates and source data remain the supplied catalog values. The model's title and summary are AI-authored suggestions; the service does not verify physical routes, opening hours, prices or bookings. Model instructions prohibit inventing those claims.

Generation leaves room state unchanged. Publish a chosen result with `plan.propose` at its `basedOnRevision`, so intervening group changes trigger a visible conflict. Provider failures, malformed output, unknown places, omitted wishes and incomplete responses return explicit errors. No substitute plan is produced.

## Deployment

Deploy one service process with a durable local volume. SQLite transactions serialize writes; SSE subscriptions are held in that process. Multiple replicas would require a shared event service before clients can receive changes across replicas.

The Dockerfile builds the isolated service:

```sh
docker build -t tourguideai-rooms experience/server
docker volume create tourguideai-room-data
docker run --name tourguideai-rooms --restart unless-stopped \
  --publish 127.0.0.1:8787:8787 \
  --mount source=tourguideai-room-data,target=/data \
  --env ALLOWED_ORIGINS=https://your-frontend.example \
  --env-file /secure/path/rooms.env \
  tourguideai-rooms
```

Configure the hosting ingress to terminate HTTPS, forward the API paths, preserve authorization headers, disable response buffering/compression for SSE, and allow connections longer than 15 seconds. Set `TRUST_PROXY_HOPS` to the actual trusted ingress count. Set the frontend API URL to the final HTTPS service origin. Use an operator-controlled persistent volume and backup the database with SQLite's backup facility or with the service stopped; copying a live database file alone can omit WAL changes.

Room contents and hashed invitation/member credentials are retained in the database. Establish a retention/deletion policy and restrict volume/backup access before inviting external users. The current service has no public room directory or authenticated user-account system. HTTPS and possession of an invitation control room access.

The Docker image has been built and exercised locally, including two participants, database recovery after container restart, runtime UID 1000 and cleanup of the test container and volume. The build-only proxy CA is absent from the runtime container. Reports are saved in `../evidence/homepage-20261015/server/`.

Public deployment still requires a hosting account, HTTPS hostname, durable production volume and model credentials. A real provider-generated plan remains unverified until credentials are supplied.

## Validation

`npm test` starts actual local HTTP servers on assigned ports and uses isolated SQLite files under ignored `.data/tests/`. It covers two clients, initial and live SSE snapshots, concurrent edits and explicit conflict retry, participant authorization, contributor ownership, proposal acceptance/reordering, CORS, invalid inputs, restart persistence, reconnect and service shutdown with an open stream.

The grounding function is tested directly with catalog data. The suite does not substitute a successful model provider. An unconfigured planning request is verified as HTTP 503 and leaves the room unchanged.

QA can import `startServer` from `src/server.js` with `{port:0,host:'127.0.0.1',databasePath,config:{provider:{apiKey:'',model:''}}}`. It returns `{url,app,store,close}`; call `close()` after each isolated run.

On a host with Docker's local Unix socket, `node test/container-smoke.js <image-tag>` creates and removes its own container and named volume. It checks real container health, invited contributions, persistence after restart, and runtime permissions. It requires a previously built image.
