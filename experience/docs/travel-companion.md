# Travel companion · selected places and on-site context

2026-10-15 · Approved implementation in progress. Entry: `travel.html`.
Release evidence and resume state: [agent checkpoint](agent-checkpoint.md).

## What this milestone is for

The user approved adding Google Maps journey sharing and location-driven physical
exploration. This first companion connects selected places to practical directions
and offers nearby context on a phone. It covers the existing Shijō crossing,
Mitsui building and MUFG building references, with complete English/Chinese UI.
It adds no new destination, surveyed entrance or expanded virtual walking area.

The user's broader feedback remains open: checkpoint-only responses, details
presented mainly as text, and sharing that fails to express attachment to a place.
This companion does not resolve those problems by adding a directions link.
Continuous responsive exploration and a personal approach/pause/view remain the
separate proposed [experience correction](lean-iteration.md#latest-review-and-proposed-correction--2026-10-13).

## Player flow and distinct states

Choose places, arrange their order and review the journey. Open the selected
journey in Google Maps, or deliberately start location to explore nearby context.
A person can mark a place as meaningful. The existing perspective experience
provides personal views and optional notes through a separate entry.

| State | Meaning | What it does not establish |
|---|---|---|
| Planned place | The person selected it for a possible journey | A booking, open venue or completed visit |
| Virtual moment | A view or note created in the existing virtual experience | Physical presence |
| Nearby context | The current browser location estimate suggests relevant place references | An exact entrance, safe crossing or automatic visit |
| Meaningful place / personal note | The person chose to keep an observation | A verified place fact or a required emotional response |
| Real visit | Would require an explicit personal report; this companion adds no visit-marking action | Nearby context and meaningful marks never establish a real visit |

The companion must not overwrite the original walk or perspective saves.
There is no geofenced completion requirement. The existing personal-view sharing
remains separate; this milestone does not add recorded movement or emotional replay.

## Google Maps handoff

Use the [official Maps URLs interface](https://developers.google.com/maps/documentation/urls/guide),
with `api=1`; these URLs do not require a Maps API key. Selected source-backed
place coordinates are location references, not surveyed doors. Google calculates
the route between selected places; the link is neither a GPS trace nor proof of
where the person walked. It contains no live browser location sample.

Use the portable ceiling of **three intermediate waypoints**, hence at most
**five selected places** including origin/destination per directions link. Keep
each fully encoded URL within the documented **2,048-character** limit. Divide a
longer selection into ordered parts, repeating the boundary place to connect parts;
preserve every selected place and its order. Show all parts before sharing and
make the whole set available, rather than silently retaining only the first link.
The current catalogue contains only three places; longer-list grouping is a
reusable export behavior, not a claim of larger destination coverage.

Waypoint behavior varies by Google Maps client. Keep the selected order visible
so the person can check the external handoff. A successful copy or share handoff
does not demonstrate that Google displayed a route or that a recipient used it.
Denial, cancellation and unavailable sharing leave the selection intact.

For a whole-trip map, offer an optional CSV export and manual Google My Maps
workflow: sign in to My Maps, create/open a map, import the file, choose the location
and title columns, review the result, then explicitly configure sharing there.
Imported place rows are not a recorded track or a promise that My Maps creates a
directions layer. No Google account connection, automated upload or publication
is implemented. Private personal notes must not enter an external export silently.

## Foreground location

Location begins only after **Use my location / 使用我的位置** and the browser's
permission flow. Watch only while the companion is visible and the user has
started it. Hiding the page stops the watch; returning requires an explicit
**Resume / 继续定位**. Stop, navigation away and denied/unavailable location must
also release the watch. Manual place exploration remains usable without location.

Use reported accuracy and freshness when presenting nearby context. An imprecise,
stale or unavailable reading cannot assert an exact building or venue entry.
Show appropriate uncertainty and let the person choose the place they mean.
Location changes never mark visits, save notes or unlock virtual checkpoints.

The app uses location samples in memory for nearby context; it does not save a GPS
history, embed samples in shares or upload them to an application server. Browser
and operating-system location services retain their own permission behavior.
Opening Google Maps is an explicit external handoff of the selected place data.

## Delivery and human acceptance

Technical completion requires the unit suite, the packaged companion in EN/ZH on
phone/desktop layouts, applicable original/perspective regression checks, repository
gates, pushed source and verification that Pages serves the exact tested package.
Checks must cover ordered route parts/limits, state separation, permission failures,
accuracy/staleness, hide/resume/stop cleanup and no automatic real visits.

Browser-controlled location tests establish application behavior, not phone GPS
quality or successful field use. Physical usefulness, ordinary-device behavior,
emotional expression and enjoyment remain human review items. No field visit or
new participant evidence has been recorded for this milestone at this checkpoint.
