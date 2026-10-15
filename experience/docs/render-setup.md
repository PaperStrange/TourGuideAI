# Deploy the shared-trip service

Recommended setup: retain the existing GitHub Pages website and deploy the room
service to Render in Singapore. The repository's `render.yaml` selects one
512 MB web instance and a 1 GB persistent disk for the trip database. It leaves
automatic deployment off so source pushes do not change the running service.

As checked on 2026-10-15, the selected compute is $7/month and disk storage is
$0.25/GB/month: approximately **$7.25/month**, before taxes, usage overages and
separate LLM-provider charges. Review the amount shown by Render before creation.
[Current pricing](https://render.com/pricing) ·
[Persistent storage](https://render.com/docs/disks)

1. Create a Render account using GitHub, then open
   [the prepared deployment](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FPaperStrange%2FTourGuideAI%2Ftree%2Fchore-sow-delivery-plan).
   Grant access to this repository if Render requests it. Review the one service
   and disk, and approve its displayed subscription cost.
2. Wait for the service to become healthy. Share its public `https://…onrender.com`
   address with the developer. It contains no secret. The frontend must be rebuilt
   with that address as `VITE_TRAVEL_API_URL` and published before room invitations
   work on GitHub Pages. The deployment does not automatically change Pages.
3. For AI planning, add `LLM_API_KEY` and `LLM_MODEL` in the Render service's
   Environment settings. The provider must support the server's structured Chat
   Completions request. `LLM_BASE_URL` defaults to the OpenAI API; set a different
   compatible provider URL only when deliberately choosing that provider. Use its
   own billing controls. Do not put keys in the repository or chat.

Rooms can operate before model configuration; AI suggestions remain visibly
unavailable until the provider is configured. A real generated proposal and two
separate public browsers must be checked after hosting. The local container and
browser reports establish implementation behavior, not Render deployment success.

The disk preserves the SQLite database across restarts. Maintain SQLite-aware
backups; the service's SSE clients reconnect after a deployment interruption.
This configuration is intended for a small invited pilot with one server process.
Account authentication, invitation revocation and a participant-facing deletion
flow remain future requirements before wider public operation.

Blueprint fields were checked against Render's published JSON schema. Account
creation, billing approval and actual deployment remain the owner's actions.
[Render's deployment-button instructions](https://render.com/docs/deploy-to-render)
describe the branch-specific link above.
