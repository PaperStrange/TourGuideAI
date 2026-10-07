# From one street to a city and a country

2026-10-07 · Lead synthesis with product, engineering, world-content and QA review.

The user approves **Borrow someone's eyes** and an A/B test, and asks us to evaluate
the original city/country ambition against cost, enjoyment and competition from
games and internet products, including AI travel agents. Approval is for the
experience experiment; its effectiveness and the eventual large-scale solution
remain open. The SOW continues to be initial guidance.

## Recommendation and the objective we are preserving

Preserve the ambition of a connected journey through a city and across a country.
Our leading candidate is **a journey map connecting authored local experiences,
personal perspectives and memories**, with detailed live 3D where its value is
demonstrated. Keep a map/photo/story version as a serious alternative. AI can help
discover and connect suitable experiences, and later assist practical travel;
building a general booking agent is a different business with different costs.

This recommendation is conditional on the approved experience test and a subsequent
continuity test. We should change it if the lighter experience is more enjoyable,
if transitions feel like a gallery, or if content production cannot sustain it.

Separate four promises when discussing scale:

| Promise | What it requires |
|---|---|
| Geographic reach | Destinations across a country can be found and placed in context. A map alone can provide reach. |
| Journey continuity | Arrival, discovery, departure and regional transitions make sense; the person's perspective and memories carry across them. |
| Experiential depth | Selected places offer worthwhile exploration, interaction and personal expression. Coverage alone cannot supply this. |
| Practical reliability | Routes, access, opening details and transport information support the intended real-world action and are maintained. Visual coverage does not establish this. |

A catalogue covering selected cities must say so. It is not comprehensive country
coverage or a surveyed, continuously walkable digital twin.

## Six solutions compared

Cost labels are relative team judgments for extending comparable source-backed
experiences. Enjoyment is a hypothesis, not a score from a user study.

| Solution | Initial / expansion cost | Enjoyment opportunity and likely failure | City/country fit | Competitive position |
|---|---|---|---|---|
| 1. Continuously authored, detailed 3D world | Very high / very high: environment art, navigation, interactions, performance and maintenance across all traversable space | Strong spatial freedom; risks empty travel, repetitive interactions and expensive realism that adds little enjoyment | Faithful continuous walking demands a major production operation; country scale is especially difficult | Competes for leisure time with polished exploration and simulation games, as well as real-world digital twins |
| 2. Procedural world from open geographic/city data, with selected hand-authored landmarks | High tooling / lower geometry cost, but substantial cleanup, content and QA | Broad freedom and orientation; generic facades can reproduce the exact recognition problem the user raised | Useful broad context where data exists; source gaps and interaction density remain | Geometry is accessible to others too; the experience and contributions must carry the value |
| 3. Streamed photorealistic tiles or linked panoramas | Medium integration / metered services plus rights, content and coverage work | Strong visual recognition; aerial meshes may fail at pedestrian scale, while panoramas restrict movement and consistent lighting | Fast visual reach where covered, with network/provider dependence; no automatic walkable/interactable city | Direct overlap with map previews, Street View and virtual-travel products; realism alone is a weak distinction |
| 4. Map, photos/stories and selected personal trails | Low–medium / low art cost, continuing editorial and community cost | Easy access, human stories and social context; risks becoming another content feed or travel album | Strong reach and journey continuity without modelling every street | Strong overlap with Polarsteps, Xiaohongshu and collaborative planners; must beat familiar low-friction formats |
| 5. AI travel planner/agent with maps and supplier integrations | Low–medium for a recommendation prototype; high for reliable transactions / ongoing retrieval, integrations and support | Personalization, anticipation and reduced effort can be enjoyable; generic answers or correction work undermine value | Broad recommendation reach; operational reliability varies by source, region and task | Direct competition with Google/Gemini, booking platforms, TripGenie, Amap and general assistants; an itinerary prompt alone offers little protection |
| 6. Connected journey with selected immersive chapters — leading candidate | Medium–high shared platform / adjustable content spend according to where 3D earns its cost | Recognizable places, shared perspectives and a continuing personal story; transitions and uneven quality can break immersion | Broad map/media coverage plus deeper selected districts, then cross-city journeys | A testable experience proposition; still overlaps social travel and city stories, with no established market advantage |

Solutions 2 and 3 are distinct: open geometry can be processed under its applicable
licence; a commercial streamed map is a service with its own display, attribution,
caching and access rules. Panoramas and 3D meshes also need separate movement and
lighting designs. None can simply replace today's model file and inherit a correct
simulation. Generative geometry may accelerate authoring, but a plausible invented
facade does not satisfy recognition of a specific real building.

## Costs: production, operation and acquisition

The current application proves a bounded Kyoto experience, not a city-production
rate. It has a 64 m navigable strip and seven sourced context-building footprints.
Its asset size, triangle count or agent wall time cannot be multiplied by city area
to produce a credible budget. Multi-scene state, coordinate frames, loading,
journey transitions and shared viewpoints still require implementation.

Use this budget structure before committing to a catalogue:

```text
Initial cost = shared platform + (3D chapters × accepted 3D chapter cost)
             + (media chapters × accepted media chapter cost)
             + transitions + acquisition of content/rights + localization + QA

Monthly cost = platform maintenance/operations + content refresh
             + contributor/editorial work + hosting/delivery
             + map/place/route calls + model/search calls + support/moderation
             + customer acquisition
```

Do not double-count tasks inside a chapter unit and again as shared work. Separate
fixed platform work, cost per accepted chapter, cost per active session and cost
per paying customer. Contributor labour is a cost even when contributed voluntarily.
An autonomous booking service also needs supplier agreements, availability/pricing
handling, payment/confirmation flows, cancellations, failures and customer support.

### A transparent content-cost sensitivity example

These are **invented planning inputs for sensitivity analysis**, not estimates
derived from this demo, vendor quotes or a proposed budget. An episode means a
bounded place experience including its content/art/integration review; it is not
an entire district. A media episode and a 3D episode need not deliver equal value.
Assume an existing runtime/art kit and bounded interactions with substantial reuse.
Bespoke landmark reconstruction or new mechanics may exceed every scenario below;
Scenario C is not an upper bound.

| Assumption in person-days per accepted episode | Scenario A | Scenario B | Scenario C |
|---|---:|---:|---:|
| Authored 3D episode | 3 | 5 | 10 |
| Curated map/photo/story episode | 0.5 | 1 | 2 |

For an illustrative catalogue of **20 episodes per city**, and a larger catalogue
of **20 selected cities / 400 episodes**, content-only effort is:

| Presentation allocation | One city: A / B / C person-days | 20-city catalogue: A / B / C person-days |
|---|---:|---:|
| Every episode authored in 3D | 60 / 100 / 200 | 1,200 / 2,000 / 4,000 |
| 25% 3D, 75% media | 22.5 / 40 / 80 | 450 / 800 / 1,600 |
| Every episode map/photo/story | 10 / 20 / 40 | 200 / 400 / 800 |

Multiply by the team's actual fully loaded day rate, then add the omitted shared
platform, transitions, rights, localization, release work and ongoing operation.
These are effort totals, not elapsed schedules, and do not price a seamless city
or establish how many episodes make a satisfying city. The 25% mix is an example,
not a target. Replace all unit assumptions with measured accepted-production and
revision time from the first comparable episodes before allocating a larger budget.

### Published service-price anchors

Read on 2026-10-07; USD list prices, before taxes/region differences. These illustrate
metered expenses and do not constitute an operating quote or provider selection.

- [Mapbox web map pricing](https://www.mapbox.com/pricing): first 50,000 monthly
  GL JS map loads are free; the next tier is $5 per 1,000. Thus 100,000 loads cost
  $250 for that SKU. A load is an initialization, not a person; place search,
  directions and other services have separate pricing.
- [GPT-5.4 mini model pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini):
  $0.75 per million input tokens and $4.50 per million output tokens.
  [Web search](https://developers.openai.com/api/docs/pricing) adds $10 per 1,000
  calls plus retrieved tokens at model rates. An assumed task with 10,000 total
  billed input tokens, 2,000 total billed output tokens and three search calls costs
  $0.0465; 10,000 such tasks cost $465. Input must include retrieved content and
  repeated context, output must include billed reasoning. Longer sessions, retries,
  images, additional providers and support change the result. This is no model
  quality benchmark or assumption of availability in every target market.
- [Google Maps pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
  meters Photorealistic 3D Tiles separately. Map events must not be equated with
  users; validate the applicable SKU, session behaviour and regional terms before
  budgeting. A rendered city is not a licensed local asset library.
- [PLATEAU's official FAQ](https://www.mlit.go.jp/plateau/faq/) permits commercial
  use of its open data under applicable licences, notes simplified LOD1 heights,
  and describes region-dependent updates typically spanning one to five years.
  Its [policy](https://www.mlit.go.jp/plateau/site-policy/) requires attribution and
  marking processing, with exceptions to check. Free source data still requires
  conversion, optimization, missing-detail work and factual updates.

The strategic implication is that affordable inference or map viewing does not
remove the harder costs of reliable content, enjoyable interaction and distribution.
Likewise, detailed art is worthwhile only where its incremental value covers its
production and delivery burden.

## Competition beyond games

Primary sources checked 2026-10-07. Capabilities below are documented claims,
not our hands-on comparative benchmark. Announcement launch regions do not prove
universal current access, and feature overlap does not prove user preference.

| Substitute | Documented offering and material limit | What it means for us |
|---|---|---|
| [Google Maps / Gemini](https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/) | March 2026: conversational place/itinerary questions, reservations and saved/shared places; Ask Maps launch US/India, Immersive Navigation launch US with 3D surroundings and destination/entrance previews | Planning and arrival confidence already overlap; geographic data and distribution are substantial incumbent assets |
| [Booking.com AI support](https://news.booking.com/bookingcom-debuts-agentic-ai-innovations-adding-to-its-robust-suite-of-genai-tools-for-customers/) | October 2025 announcement: property/reservation assistance with human escalation and market/language rollout limits; browsing can hand off to booking | A practical travel agent competes against supplier context and service operations, not only answer quality |
| [Expedia Trip Matching](https://www.expedia.com/tripmatching) | Public Instagram Reels become suggested places/stays and booking links; official FAQ says US-optimized and Instagram-only | Turning another person's travel inspiration into a plan already exists |
| [TripGenie](https://us.trip.com/tripgenie/) | Free travel Q&A; [May 2025 release](https://jp.trip.com/newsroom/tripgenie25update-jp/) describes shared itineraries, hotel comparison, menu explanation and live translation; historical usage cap not confirmed as current | Strong planning/in-trip and multilingual overlap; do not promise differentiation from a chat interface alone |
| [Wanderlog](https://wanderlog.com/) | Collaborative maps/itineraries, reservations and AI assistance; [free unlimited trips/collaborators](https://help.wanderlog.com/hc/en-us/articles/13302997563547-Is-Wanderlog-free), optional Pro; exact current Pro price not verified | Organization alone faces a free baseline; [bookings also support its business](https://help.wanderlog.com/hc/en-us/articles/13303034352667-How-does-Wanderlog-make-money) |
| [Amap / 高德](https://www.alibabagroup.com/zh-HK/document-1889126073686294528) | August 2025 Alibaba release: voice/chat, cross-city multiday driving plans, supported booking requests, adjustments and AR place memories; describes mainland travel/life | Relevant China substitute for the whole journey, spatial assistance and digital memories; universal overseas availability is not established |
| [Xiaohongshu / 小红书](https://apps.apple.com/cn/app/rednote/id741292507) | Publisher listing: interest discovery, personal stories and online inspiration → offline experience → sharing; free with in-app purchases | Human perspectives and memory sharing already compete for attention; compare against good creator stories/video, not an empty map |
| [Polarsteps](https://www.polarsteps.com/travel-planner) | Personalized AI itinerary, route map, bookings and community trips; [Travel Together](https://support.polarsteps.com/hc/en-us/articles/24266789457170-What-is-Travel-Together) shares steps/photos/video | Close overlap with planning, footprints and memories. [Free core with Plus, books and affiliate revenue](https://support.polarsteps.com/hc/en-us/articles/29003435822866-Is-Polarsteps-free) raises the bar for charging for the same bundle |
| [Questo](https://questoapp.com/faq) | Real-world walking stories/puzzles, creator tools, free and paid quests, creator revenue share | Place-based stories and community authorship already have a commercial format; our remote embodied perspective needs its own reason to exist |
| [GeoGuessr](https://www.geoguessr.com/free) and [Microsoft Flight Simulator](https://www.flightsimulator.com/msfs2024-preorder-now-available/) | GeoGuessr's indexed official page offers geographic play; live open failed in this review. Microsoft's 2024 release describes streamed high-detail scenery and authored content within a global world | Geography can support a compelling game; wide rendering coverage does not itself provide our travel loop. Large-world streaming is an architectural precedent, not a comparable production budget |

The earlier Minecraft/Terraria/Animal Crossing/The Sims 4 references remain useful
for agency, discovery, attachment and personal stories; see [positioning](positioning.md).
They compete for entertainment time even when their geography and intended use differ.

Our candidate distinction is **participating in how another person notices a real
place, forming one's own response, and carrying that relationship across a journey**.
No individual ingredient is unique. Potential durable value would come from excellent
authored interactions, trusted contributors, contextual personal memories and repeat
use. Those are assets to earn, not an existing moat. A public catalogue also creates
discovery, moderation and contributor-recruitment work that private link sharing avoids.

For China and other target markets, EN/ZH translation is only one requirement.
Provider reach, licensing, payment/distribution and device/network behaviour need
market-specific verification. Do not assume an international AI/map stack or
Amap's mainland offering is available everywhere. No new provider is selected here.

## A product people might choose and pay for

The first audience hypothesis is people curious about a place or another person's
perspective, including armchair travelers and people anticipating a trip. Test these
segments separately: a useful planner can satisfy one and fail to entertain another.

| Possible offer | Why someone might value it | What would have to be demonstrated |
|---|---|---|
| A curated city chapter or a trusted creator's collection | A distinctive, enjoyable experience with a natural ending | Repeat interest in another chapter and willingness to buy a concrete offer; subscription only if recurring value appears |
| A personal/collective keepsake | Meaningful moments across virtual and optional physical travel | People voluntarily keep, reopen and share it; existing free albums and Polarsteps are strong alternatives |
| Practical trip assistance or booking referrals | Saves correction/research effort and supports real actions | Reliable utility, viable supplier economics and clear handoff; commissions must not silently determine recommendations |
| Commissioned local/cultural experience | A partner funds a specific story and distribution | Partner demand and maintenance ownership; custom work may become a services business rather than a scalable consumer product |

Do not launch all four. Suggested first offer is a small authored chapter/collection
if the enjoyment test is positive. Monetization, acquisition cost and willingness to
pay are unproven; a proposed price is not revenue. View-based popularity is not the
same as sustainable contribution or paid retention.

## Approved A/B and expansion decisions

The **new experience test** is separate from the delivered live-render-versus-Blender
comparison. Both new variants retain the same author, viewpoint/story, facts,
destinations and save/share opportunities:

- **Immersive:** navigate the short live 3D approach, follow a shared look, notice,
  then optionally frame a view and leave a sentence.
- **Story/map:** explore equivalent photos/map/story and express/share a moment
  with comparable affordances. Use a credible polished alternative.

Primary question: **does participating in the place increase enjoyment enough to
justify its effort and friction?** Observe freely chosen continuation, discovery and
response alongside explanations of enjoyment. Separate load failures/control confusion
from loss of interest. Record device, city/game familiarity and relationship to author.
Visual treatment cannot be perfectly equal; this compares delivered experiences, not
a pure isolated 3D variable. Use different participants or counterbalanced comparable
unfamiliar scenes; replaying the same story cannot establish independent recall gains.

Authored sample stories can test interest and comprehension. Reciprocal connection
needs a real consenting contributor/recipient. No fabricated contributors, completed
test, statistical power or acceptance percentage is implied. First use formative
observations, then choose a quantitative primary measure, meaningful effect and sample
size from baseline data before a scaled randomized A/B test.

Run an **AI-planner utility comparison separately**: same travel brief and source
pack, evaluate constraints, factual uncertainty, correction effort and useful next
action. A later ecological comparison may allow each product its own information,
but then the result concerns the whole offering, not one mechanism. Enjoyment,
confidence, unseen-photo transfer and successful real-world use remain distinct.

| Decision stage | Evidence needed before larger spending |
|---|---|
| 1. Approved experience experiment | Implement and compare the matched short experiences; measure production/revision time as well as human reaction. If formative observations reveal no compelling added value from 3D and media causes less friction, prefer media provisionally; this does not establish statistical equivalence. |
| 2. One city journey | Connect contrasting districts with understandable arrival/departure/transit and retained moments. Test whether the journey feels coherent and worth continuing rather than like disconnected thumbnails or waiting. |
| 3. A two-city corridor | Carry the author/personal record through a meaningful regional transition and a different city. Test continuity, content variation, loading/state and production repeatability. |
| 4. Expand selected coverage | Add chapters with demonstrated demand and viable update costs; expose actual coverage. Repeat engagement and economics justify broader investment, not a map with more pins. |

The precise route, episode count, team rate, traffic, budget and dates are not fixed.
Ginza/Wako remains the [selected parallel architectural study](recognition-study.md),
not an implemented second city. This evaluation adds no runtime features, recruits
no testers, buys no services and changes no hosted build.
