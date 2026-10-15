# GitHub Pages with a local room service

Requires Node 24.19 or newer. From `experience/server`:

```sh
npm ci
npm run local:pages
```

For a fresh checkout, select the iteration branch that contains this homepage:

```sh
git clone --depth 1 --branch chore-sow-delivery-plan https://github.com/PaperStrange/TourGuideAI.git
cd TourGuideAI/experience/server
npm ci
npm run local:pages
```

Then open [Together on GitHub Pages](https://paperstrange.github.io/TourGuideAI/?mode=together)
in a browser on that computer. Keep the terminal running during the test.

The launcher listens on `http://127.0.0.1:8787`. It automatically permits the exact Pages origin `https://paperstrange.github.io` and retains development origins. `ALLOWED_ORIGINS` can add other exact origins. The repository path is excluded from an origin: `https://paperstrange.github.io/TourGuideAI/` is a page address.

Rooms persist in `experience/server/.data/rooms.sqlite` by default, independent of the process working directory. `DATABASE_PATH` selects another persistent file. Restarting the service retains rooms and participant credentials. Keep the database directory when updating code. Stop the service before copying its database files, or use SQLite's backup facility for an active service.

The launcher loads an existing `experience/server/.env`. Shell variables take precedence. Provider settings remain optional; AI planning reports unavailable until both `LLM_API_KEY` and `LLM_MODEL` are configured. Keep provider credentials on the backend computer. They are never part of browser connection settings, invitations or health responses.

## Use Pages on the backend computer

Open the published experience in that computer's browser. In Together connection settings, select `http://127.0.0.1:8787` and Live updates, then connect. The browser may request Local Network Access permission for the Pages origin. Grant it only when deliberately connecting to the local service. A denied or unsupported local connection remains an explicit connection error.

The API's CORS allowlist and the browser's local-network permission are separate checks. CORS permits the Pages origin; browser policy determines whether Pages may contact loopback. Browser behavior varies by version and policy. The local HTTP service and Pages CORS are covered by integration tests; a successful raw HTTP request alone does not establish browser access.

Every device resolves `127.0.0.1` to itself. A friend on another computer needs a reachable HTTPS service address. Sharing the Pages room invitation alone does not expose the backend computer.

## Use an explicitly approved temporary HTTPS tunnel

An operator-approved tunnel can forward a public HTTPS address to `http://127.0.0.1:8787`. Run the backend and tunnel on the same computer and keep both processes running throughout the test. Start the tunnel only after approving the provider and the information it transports. No public tunnel is created by `npm run local:pages`.

Choose the tunnel's HTTPS address in Together connection settings, select Periodic updates, and connect. Each invited participant must explicitly configure that same address. The connection panel does not automatically select an API from an invitation URL. A restarted temporary tunnel may have a different address; select the new address explicitly. Participant credentials are scoped to their selected service address and room.

After opening an unfamiliar invitation, check the displayed service address and select **Connect** before the invitation is sent there. Changing the service address clears the current invitation; reopen the invitation after selecting the correct address. A room with matching saved participant credentials can resume automatically on the same service.

Periodic updates issue ordinary authorized snapshot requests every three seconds after completion. Transient failures use a ten-second request deadline and increasing retry delays. The UI reports connection errors while requests fail. Mutation conflicts still require reviewing the latest room before another action.

[Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) provide temporary HTTPS hostnames without a Cloudflare account or domain. Their documentation states that they do not support SSE, allow up to 200 in-flight requests, have no uptime guarantee, and change hostname on each creation. Periodic updates use the existing JSON API. Their optional email gate requires an interactive browser session and is unsuitable for this cross-origin API client, which omits cookies and rejects redirects.

Tunnel providers that terminate HTTPS can inspect room content and the invitation or participant tokens carried by API requests. Sharing an invitation authorizes access to its room. The server-side LLM credential travels only to the configured model provider and is never returned by the room API.

Public tunnel operation has not been validated for this release. The local service, persistent rooms, two-client synchronization and buffered-response recovery are tested directly. Keep the host awake and connected during an approved test; stopping the backend or tunnel ends remote availability. Local database persistence does not make a temporary public address permanent.

## Stop and resume

Close the page to stop its room subscriptions. The connection panel's **Use default service** button restores the published service setting; changing the service address also closes the current room. Stop the backend with Ctrl+C. Resume with `npm run local:pages` and the same database. On the same service address, the current browser tab can reuse its stored participant credentials. A different address requires explicitly selecting the service and joining with the existing room invitation.

The service limits API traffic to 600 requests per minute per observed client IP. Three-second polling is intended for a small invited test group; a tunnel can make several participants share that observed IP. Larger groups need a suitable request budget or a streaming-capable deployment.
