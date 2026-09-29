# Q5 — AI-in-the-loop game design: the LLM as content generator (for a 2.5D browser overseas-travel sim, 1 owner + AI agents, React 18/Express reuse)

> **Method note (applies to every claim below).** The `web_fetch` tool in this session refused every host (`URL hostname ... resolves to a non-public IP address`), so I fetched pages over direct HTTP with a browser User-Agent and stripped tag noise myself. Pages marked **(JS-RENDERED / NOT RETRIEVABLE)** returned HTML whose body is client-side only; for those I cite the page and its search-result title, and I do **not** quote body text. Prices are quoted as displayed on the vendor's own pricing/docs page on the date I fetched it; treat all of them as "verified as displayed, subject to change".
>
> All arithmetic below is run in a calculator tool from the published per-1M-token prices; every assumption is labeled **JUDGMENT**. Anything I could not confirm is marked **UNVERIFIED** with the specific gap.

---

## 0. The three-line answer

| Question | Answer | Why |
|---|---|---|
| Where does LLM generation pay off for *this* game? | **Text-first, slot-filled, schema-constrained content**: NPC barks/ambient chatter, immigration-officer and vendor dialogue variants, item/menu/signage flavour text, hints, in-character translation glosses, and summarization of what the player just did. | These are exactly the categories shipped tools target — Ubisoft's Ghostwriter generates *barks*, "phrases or sounds made by NPCs during a triggered event" ([Ubisoft news](https://news.ubisoft.com/en-us/article/7Cm07zbBGy4Xml6WgYi25d/the-convergence-of-ai-and-creativity-introducing-ghostwriter), [TechCrunch](https://techcrunch.com/2023/03/22/ubisofts-new-ai-tool-automatically-generates-dialogue-for-non-playable-game-characters/)). |
| Where does it reliably fail? | Spatial layout, balance/numerics, long-horizon state truth, guaranteed-solvable puzzles, exact-mechanics reasoning, art consistency. | Grounded, independently-documented: [Hidden Door review](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game) (ungrounded state, world flicker, always-succeed choices); [AI-native games paper](https://arxiv.org/abs/2607.00527) (generation ≠ playability; needs "mechanical invariants"). |
| Cheapest architecture that still demos well? | **Pre-bake a human-reviewed content pack offline (Batch API, ~$0.13–$3), ship it as the default; call a cheap tier live at temperature 0.6–0.8 with `json_schema` strict + provider prompt caching for the slots that must react to player state; validate with Ajv/Zod; degrade to the pre-baked line on refusal/timeout.** | Pre-baking 500k output tokens costs **$0.13 (gpt-6-luna, batch)** and a full player-hour of live generation on a cached small tier costs **~$0.009–$0.021** at published rates. Compute in §3.3/§4. |

---

## 1. Where LLM generation works vs fails

### 1.1 Works well (each row names the shipped artefact or vendor guidance that demonstrates it)

| Use | Evidence it is a good fit |
|---|---|
| **NPC barks / ambient crowd chatter** | Ubisoft built an in-house tool for exactly this: "Ghostwriter isn't replacing the video game writer, but instead, alleviating one of the video game writer's most laborious tasks: writing barks." ([Ubisoft](https://news.ubisoft.com/en-us/article/7Cm07zbBGy4Xml6WgYi25d/the-convergence-of-ai-and-creativity-introducing-ghostwriter)). |
| **First drafts + variations with human selection** | Ghostwriter's loop is generate-N → scriptwriter picks/edits → pairwise preference teaches the model ([Ubisoft](https://news.ubisoft.com/en-us/article/7Cm07zbBGy4Xml6WgYi25d/the-convergence-of-ai-and-creativity-introducing-ghostwriter), [TechCrunch](https://techcrunch.com/2023/03/22/ubisofts-new-ai-tool-automatically-generates-dialogue-for-non-playable-game-characters/)). Human-in-the-loop is the *product design*, not an afterthought. |
| **Dynamic in-character dialog responses** | Hidden Door shipped it and the mechanism works — the reviewer confirms callbacks to earlier player choices appear in later prose, and that characters/locations/objects are held as "cards" that form the prompt ([Ian Bicking](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game)). *Fidelity* is the failure, not the capability. |
| **Naming, item descriptions, flavour text** | Infinite Craft uses an LLM purely to name a result and assign an emoji for each novel pair ([Wikipedia: Infinite Craft](https://en.wikipedia.org/wiki/Infinite_Craft)); the entire game is naming, and it was one of 2024's most-played web games. |
| **Translation / language-barrier text** | Gemini's pricing page explicitly lists a Flash-Lite tier positioned for "high-volume agentic tasks, **translation**, and simple data processing" ([Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)) — i.e. translation is a first-class, cheap-tier workload. |
| **Summarization / state compression** | Anthropic's context-engineering guidance names **compaction** ("summarizing its contents, and reinitiating a new context window with the summary") as "the first lever in context engineering to drive better long-term coherence" ([Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)). |
| **Broad, cheap variation at volume** | Pre-baked pack cost math in §3.3 — 500k output tokens is a rounding error at current small-tier prices. |

### 1.2 Works badly / unreliably

| Failure class | Concrete, sourced failure |
|---|---|
| **Spatial layout & world state** | Hidden Door: the player is "in a car, perhaps driving through Kansas" and then "the next moment I am on a dusty road"; "Throughout the introductory chapter the narrative flits back and forth from inside the car to an outside setting" ([Ian Bicking](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game)). |
| **Ungrounded state (worse than a bad layout)** | The reviewer's core diagnosis: "the story is written only as far as it's been presented to the player… There's no 'truth' behind the story." A chest "doesn't have traps. It also doesn't *not* have traps." Choice changes the **present**, not the future ([ibid.](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game)). **JUDGMENT:** this is the single most important warning for a travel sim, where the airport/visa/currency state *must* be a fact. |
| **Game balance / numerical design** | No shipped counter-example found. **UNVERIFIED:** I found no primary source showing an LLM reliably authoring balance numbers (damage tables, exchange rates, difficulty curves) for a shipped game. Vendor guidance does not claim it either: Ubisoft's tool only lists barks, and Ubisoft's own blog frames it as "first drafts … which gives scriptwriters more time" — narrative, not systems ([Ubisoft](https://news.ubisoft.com/en-us/article/7Cm07zbBGy4Xml6WgYi25d/the-convergence-of-ai-and-creativity-introducing-ghostwriter)). |
| **Guaranteed solvability / puzzles** | Hidden Door's objectives are created and completed in the same beat ("An objective appears but without my intervention it is also immediately completed: 'Deal with Boq.'") and "the LLM always says you guessed right" — i.e. the generator cannot maintain a solvability contract ([Ian Bicking](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game)). |
| **Long-horizon consistency** | Same source: "The mistakes that emerge often don't point directly to these inconsistencies, but are the result of a generally confused LLM"; the game's own setup allows contradictory attributes ("friendly" and "rival") and disagreeing genders/pronouns ([ibid.](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game)). |
| **Exact mechanics knowledge** | Voyager's design *concedes* this: it improves by an "iterative prompting mechanism that incorporates **environment feedback, execution errors, and self-verification**" — the model is not trusted to know the mechanics; it is corrected by the engine ([Voyager, arXiv:2305.16291](https://arxiv.org/abs/2305.16291)). |
| **Prompting is brittle and expensive to tune by hand** | Infinite Craft's creator: "It was a weird game of prompting the computer and explaining the rules to it… I went through **hundreds of different prompts**. It was kind of like talking to a five-year-old." ([Eurogamer](https://www.eurogamer.net/behind-infinite-craft-one-of-the-internets-favourite-time-killers-its-creator-wrangles-with-ai-alchemy)). |
| **Content breaks the fiction / offends** | Same source: "Combining 'Europe' and 'Cult' creates 'Vatican'. Combining 'Religion' with itself creates 'War'." Agarwal: "I get emails from fandoms, religions… 'I didn't choose these combinations!'" and "censoring the AI is a game of Whac-a-Mole" ([Eurogamer](https://www.eurogamer.net/behind-infinite-craft-one-of-the-internets-favourite-time-killers-its-creator-wrangles-with-ai-alchemy)). |
| **Art/asset consistency** | Not retrieved from a primary postmortem — **UNVERIFIED**. What is verified is the disclosure statistic: 60% of Steam generative-AI disclosures are for **virtual asset generation** (characters, backgrounds, art), the largest single category ([VGC / Totally Human analysis](https://www.videogameschronicle.com/news/steam-games-disclosing-generative-ai-use-are-up-800-this-year/)). |
| **Anchoring on a few salient attributes** | Hidden Door over-indexed on character traits: a "whimsical professor with a penchant for mismatched socks" had "mismatched socks made many an appearance… speeding me on my way, tripping me up, tripping up other people" ([Ian Bicking](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game)). |

---

## 2. Shipped examples & postmortems (verified status, not vibes)

| Project | What actually shipped | Reported problems / status | Source |
|---|---|---|---|
| **AI Dungeon** (Latitude) | GPT-2 (2019) → GPT-3 "Dragon" premium tier (July 2020) → "Griffin" free tier; multiplayer Apr 2020; "Worlds" late 2020; "See" mode announced Aug 20 2022 and added Aug 30 2022; **retired from Steam March 12, 2024**. 1.5M players by June 2020; Patreon ≈$15k/month as of Dec 2019. | **2021 filter incident:** April 2021 moderation to stop user-created CSAM; moderators read private stories; false positives on innocuous wording ("eight-year-old laptop" read as a child's age); affected porn *and* non-porn stories; controversy + review-bombing, "citing false positives and a lack of communication between Latitude and its user base". Resolution per Latitude (Aug 2021): input triggering OpenAI's filter is routed to **Latitude's own models** instead of blocking — fixing over-blocking but **"slower processing"**. Reviewers had already noted the model producing graphic/sexual content unprompted. | [Wikipedia: AI Dungeon](https://en.wikipedia.org/wiki/AI_Dungeon); [Techdirt/Copia case study](https://www.techdirt.com/2021/11/17/content-moderation-case-study-game-developer-deals-with-sexual-content-generated-users-own-ai-2021/) |
| **Hidden Door** | LLM collaborative storytelling; "recently had its first public release" — reviewer played it in **August 2025**; ships as a web game with card-based state (characters, locations, objects, plot directions) and free-text player input. | Detailed technical critique (§1.2): ungrounded world, narrative flicker, choices with no consequences, always-succeed rolls, unstable objectives, latency felt during choice generation, character-consistency and pronoun bugs. Reviewer's recommendation: **"start with choice-based fiction, entirely pregenerated in a static form"** and make the generator "incrementally more responsive". | [Ian Bicking](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game); [The Verge](https://www.theverge.com/games/757816/hidden-door-early-access-ai-story) (JS-RENDERED / NOT RETRIEVABLE — title confirms early access) |
| **Latitude** | Same company as AI Dungeon; Ghostwriter's creator Ben Swanson previously worked at "Latitude at AIDungeon" ([Ubisoft](https://news.ubisoft.com/en-us/article/7Cm07zbBGy4Xml6WgYi25d/the-convergence-of-ai-and-creativity-introducing-ghostwriter)). AI Dungeon seed round: **$3.3M in Feb 2021** (NFX led; Album VC, Griffin Gaming Partners) ([Wikipedia](https://en.wikipedia.org/wiki/AI_Dungeon)). | Company-level: retired AI Dungeon from Steam (Mar 2024). **UNVERIFIED:** Latitude's current product/company status in 2026 — I could not retrieve a primary statement. | [Wikipedia](https://en.wikipedia.org/wiki/AI_Dungeon) |
| **Suck Up!** (Proxima) | Openly LLM-driven: each door hides "an AI NPC driven in real time by OpenAI ChatGPT" with its own personality and doubts; early version published on the studio's own site **Dec 2023** with no marketing; iterated >1.5 years; **1.0 on Steam Oct 1 2025** adding achievements, Workshop, challenge mode. Steam page lists: "Connects to 3rd-Party Service for AI Content Generation: ChatGPT from OpenAI". | Zero-budget virality: >100M YouTube views reported. Reported problems: **(a)** server outage early in the viral spike ("服务器在爆红初期就曾因AI集成故障宕机"); **(b)** cost structure — mainstream LLM APIs bill per token, a full conversational exchange consumes hundreds to thousands of tokens, plus STT and TTS calls, and cost scales *multiplicatively* with concurrent players (4 players talking to different NPCs = 4 parallel LLM chains). **(c)** Heat decay: the novelty ("the AI can be fooled") is a one-time fuel; post-1.0 content sustains but does not re-ignite. **(d)** Design lesson from CEO Ran Mo: AI gives you speed but not direction — after the spike Proxima iterated nightly, and "三个月后回头一看，方向完全走偏" (three months later the direction had drifted entirely). | [GameLook](http://www.gamelook.com.cn/2026/05/592917/); [Steam page (app 2726370)](https://store.steampowered.com/app/2726370/) |
| **1001 Nights** (Ada Eden) | Story-crafting game where you tell stories to an AI King to survive; **built in 2020 as an academic/art project, "way before the release of ChatGPT"**; itch.io demo (Windows/macOS), still "in development" at fetch time. Two papers: AIIDE-23 and ICIDS 2022. Ships an **LLM configuration tutorial** — the demo uses the player's own LLM service. | Documented real-world breakage in the comments: a user reports "some **JSON parse error**. Also, doesn't work with the current OpenAI version anymore, since Project API keys have replaced user API keys." Dev response: "we will try to fix the OpenAI problem soon". **This is a first-hand example of free-text/JSON parsing fragility shipping to users.** | [itch.io page + devlog](https://ada-eden.itch.io/1001-nights-official) |
| **Infinite Craft** (Neal Agarwal) | Released **Jan 31 2024** on neal.fun (iOS Apr 30 2024, Android May 21 2024). Uses **Llama 2 and Llama 3.1**; licensed Llama 2 via **TogetherAI** hosting; each element capped at **20 Llama 2 tokens**. **Caching approach:** on combining two elements the game first looks up its own database; only if the pair is unseen does the LLM create the element, which is then persisted — "done to reduce repeated queries, and to ensure that the same pair of elements always outputs the same result for all players." First discoverer gets a "First Discovery" label. | Money: "Last month was the most money I've ever spent in my life… By licensing Meta's generative AI Llama 2… plus separate server hosting costs via TogetherAI, Infinite Craft racks up quite the maintenance bill. **It's breaking even now**… It's not making money, but at least it's not losing any." Model selection was trial and error: "Some models were cheap and dumb. Others were smart but would have bankrupted me. I tried ChatGPT, but I didn't get the results I wanted, so I went for an open-source model for the flexibility." Agarwal publicly tweeted "I'm never going to financially recover from this" (Feb 13 2024). **UNVERIFIED: an exact dollar cost per request.** Neither source gives a per-call figure; do not quote one. | [Wikipedia](https://en.wikipedia.org/wiki/Infinite_Craft); [Eurogamer interview](https://www.eurogamer.net/behind-infinite-craft-one-of-the-internets-favourite-time-killers-its-creator-wrangles-with-ai-alchemy) |
| **Ubisoft Ghostwriter** | In-house tool from **Ubisoft La Forge** (Ben Swanson, R&D Scientist, La Forge Montreal), announced **March 21 2023**, presented at **GDC 2023** as "Machine Learning Summit: Natural Language Generation for Games Writing". Generates first-draft barks; scriptwriters select/polish; **pairwise comparison** as the feedback signal; a companion web back-end called **Ernestine** lets anyone build their own models. | Ubisoft's own framing of the *unfinished* part: "the focus has now shifted to supporting adoption by productions… requires scriptwriters to learn how to not only use the tool, but also integrate it in their video game production process." Announced as "Ghostwriter's **later** implementation in video games". **UNVERIFIED: no publicly named shipped title using Ghostwriter.** Also: developer backlash at announcement; Ubisoft replied that it was built with writers and is about variation for short NPC lines ([TechCrunch](https://techcrunch.com/2023/03/22/ubisofts-new-ai-tool-automatically-generates-dialogue-for-non-playable-game-characters/)). **UNVERIFIED: the "2021 paper" referenced in Ubisoft's blog by Ben Swanson — I did not locate its arXiv ID.** | [Ubisoft](https://news.ubisoft.com/en-us/article/7Cm07zbBGy4Xml6WgYi25d/the-convergence-of-ai-and-creativity-introducing-ghostwriter); [TechCrunch](https://techcrunch.com/2023/03/22/ubisofts-new-ai-tool-automatically-generates-dialogue-for-non-playable-game-characters/) |
| **Ubisoft NEO NPCs** | Prototype announced with **NVIDIA + Inworld AI**: "Ubisoft, Nvidia, and Inworld AI partnership to produce 'Neo NPC' game characters with AI-backed responses" ([Yahoo Tech](https://tech.yahoo.com/gaming/articles/ubisoft-nvidia-inworld-ai-partnership-201703130.html)); Eurogamer coverage titled it a generative-AI NPC unveiling ([Eurogamer](https://www.eurogamer.net/ubisoft-unveils-generative-ai-neo-npcs-and-the-spirit-of-peter-molyneuxs-milo-lives-on)). | **UNVERIFIED as a shipped product**: both sources present it as an unveiled prototype/partnership, not a released game. Treat "shipped NEO NPC game" as false until a store page is cited. | [Yahoo Tech](https://tech.yahoo.com/gaming/articles/ubisoft-nvidia-inworld-ai-partnership-201703130.html); [Eurogamer](https://www.eurogamer.net/ubisoft-unveils-generative-ai-neo-npcs-and-the-spirit-of-peter-molyneuxs-milo-lives-on) |
| **NVIDIA ACE** | NVIDIA's own GeForce news headline: "**NVIDIA ACE Autonomous Game Characters Debut This Month In inZOI & NARAKA: BLADEPOINT MOBILE PC VERSION**". | **JS-RENDERED / NOT RETRIEVABLE**: the article body did not render, so I can verify only the headline claim (debut in inZOI and NARAKA BLADEPOINT mobile/PC) and not dates, model sizes or on-device vs cloud details from this page. | [NVIDIA GeForce news](https://www.nvidia.com/en-us/geforce/news/nvidia-ace-naraka-bladepoint-inzoi-launch-this-month/) |
| **Inworld AI** | Positions itself as "Realtime AI for consumer-facing applications" / "The #1 Realtime Voice AI"; publishes `TTS-2` from **$25 to $5 per million characters**; cites customer outcomes Talkpal "**40% lower TTS cost**", Bible Chat "about **85%**", Wishroll Status "about **95% lower AI cost**" (vendor-reported, customer-specific). | Vendor-reported numbers with different baselines — Inworld itself says they "should inform test design, not be treated as guarantees". No public per-interaction price for the character/runtime engine was retrievable. | [Inworld cost article](https://inworld.ai/resources/voice-agent-cost-per-minute-2026) |
| **Convai** | Sells a character platform with a **credit calculator** that "estimates how many credits your character uses per turn and per month"; inputs are the LLM + voice, whether the character uses long-term memory / knowledge bank / animation, conversation length and speaking time per turn, and monthly conversation count. | **JUDGMENT:** the fact that a vendor ships a per-turn estimator is itself the useful signal — per-turn cost is the unit of account for LLM NPCs, and memory + knowledge bank are *separately metered* add-ons. | [Convai docs](https://docs.convai.com/api-docs/credits-and-billing/convai-credits/estimate-credit-usage) |
| **Whispers from the Star** (Anuttacon) | Steam store page: **Anuttacon**, released **Aug 14, 2025**; "Save a stranded astronaut… through real-time AI conversations"; requires a 3rd-party Anuttacon account; carries an **"AI Generated Content Disclosure"**: "This game features fully voiced, AI-powered conversations and performances created in collaboration with an actor, with select visu[al assets]…" (page text truncated at fetch). | Secondary reporting (QbitAI, July 31 2026): after tech validation the team **strategically halted further version development of the game**; the companion AI-chat app AnuNeko was **permanently shut down** within a year of launch; Anuttacon shifted ~90% of compute to LLM/Agent work; Cai Haoyu's public profile lists Anuttacon ending July 2026. Also reports the design critique that Stella "has no pre-written full script" but "as a game, still lacks conflict and goal rhythm — the model is novel for a few exchanges, then feels just so-so". **UNVERIFIED: Anuttacon has not officially announced closure** (QbitAI says so explicitly). | [Steam page 3730100](https://store.steampowered.com/app/3730100/Whispers_from_the_Star/); [QbitAI](https://www.qbitai.com/2026/07/464169.html) |
| **AI People** (GoodAI) | **Correction to a common assumption: not on Steam.** GoodAI's alpha announcement states plainly: "AI People is currently available exclusively through our platform, **not on Steam or other stores at launch**"; distribution is via a waiting list/batch approval, and community scenarios come from **Mod.io**. GoodAI characterises the alpha itself as "essentially a **proof of concept** for our AI NPC and AI Director technology. While the scenario progressions play out nicely and the agents perform their tasks well, **game challenges are currently minimal**… there are **no scenario end goals or objectives in this initial release**." NPCs are "powered by advanced language models with **long-term memory** capabilities". | GoodAI's own patch notes for update **0.4.4 "A Little Celebration" (March 6 2025)** document: NPCs "attack with items instead of throwing them", "NPCs correctly use the toilet instead of just walking to it", "Prevented thrown items from hovering above the ground", a max-message-length cap on copy-paste, and — critically — "**Confirmed the fix for the 'Cannot reach LLM' errors**". This is one of the most honest public records of an LLM game in maintenance: an LLM-connectivity error class reached production, and NPC embodiment bugs coexist with LLM behaviour. | [GoodAI alpha announcement](https://www.goodai.com/ai-people-alpha-officially-released/); [GoodAI patch note](https://www.goodai.com/ai-people/) |
| **Mantella** (Skyrim/Fallout 4 mod) | Open-source mod: "Bring Skyrim and Fallout 4 NPCs to life with AI" using speech-to-text (**Moonshine** / **Whisper**), LLMs, and TTS (**Piper** / **xVASynth** / **XTTS**). Setup requires the *user* to supply their own key: "Create a file called `GPT_SECRET_KEY.txt` and paste your secret key in this file." Python 3.11 required. | Architectural lesson: the mod externalises cost and quota to the player and re-implements the whole loop in a side process (Python venv + `main.py`), because the host game has no LLM affordance. **UNVERIFIED:** per-line cost or latency figures — none published on the README. | [Mantella README](https://raw.githubusercontent.com/art-from-the-machine/Mantella/main/README.md) |
| **Minecraft LLM agents — Voyager** | First LLM-powered embodied lifelong-learning agent in Minecraft; three components: automatic curriculum, ever-growing **skill library of executable code**, and iterative prompting with environment feedback + execution errors + self-verification; GPT-4 via black-box queries, no fine-tuning. Reported: **3.3× more unique items, 2.3× longer distances, up to 15.3× faster** tech-tree milestones vs prior SOTA; skill library transfers to a new world. | The mechanism is the lesson: it never trusts the LLM with truth — skills are executable code **verified by running them**, and failures feed back as errors. | [arXiv:2305.16291](https://arxiv.org/abs/2305.16291) |
| **Generative Agents** (Stanford, Park et al.) | 25 agents in a Sims-like sandbox; architecture = **memory stream** (natural-language experience log) + **reflection** (synthesised higher-level inferences) + **planning** (recursive top-down decomposition); retrieval scores recency × importance × relevance; ablations show all three components contribute critically. | **Cost is the missing number.** The model used was **gpt-3.5-turbo** (GPT-4 was invite-only then) per an independent paper analysis ([somnigraph notes](https://github.com/AlexisOlson/somnigraph/blob/main/research/sources/generative-agents.md)). A Chinese trade article reports the experiment cost "数千美元" (thousands of dollars) in two days ([TechWeb](https://m.techweb.com.cn/article/2023-04-12/2924451.shtml)) — **UNVERIFIED: I could not retrieve a primary cost figure from the paper itself**, and the TechWeb article is secondary. Do not cite a dollar amount for Generative Agents as fact. |
| **Steam AI-disclosure policy** | Valve requires disclosure and it appears on the store page under "**AI Generated Content Disclosure**". **Feb 2024-era rule:** disclosure since 2024. **Jan 2026 rewrite** (spotted by GameDiscoverCo's Simon Carless): 'AI-powered tools' such as code helpers **no longer require disclosure**; the two remaining categories are "**AI to generate content for the game**" (in-game, store page, or marketing) and "**AI content generated during gameplay**"; the form now applies only to content "consumed by players"; the scope explicitly includes artwork, audio, localization, **narrative**, marketing materials, the store page and Steam Community assets. Players still see only "AI Generated Content Disclosure". | **JS-RENDERED / NOT RETRIEVABLE:** both `store.steampowered.com/ai_disclosure` and `partner.steamgames.com/doc/gettingstarted/ai_disclosure` return navigation-only HTML with zero occurrences of "generative"/"AI"; I could not quote Valve's own wording. Citing journalism instead. | [Game Developer (Jan 16 2026)](https://www.gamedeveloper.com/business/valve-tweaks-and-clarifies-ai-disclosure-rules-for-steam); [VGC (Jan 17 2026)](https://www.videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use/); [80.lv (Jan 19 2026)](https://80.lv/articles/steam-has-clarified-its-rules-on-the-use-of-ai-in-video-games); Valve pages: [store](https://store.steampowered.com/ai_disclosure), [Steamworks](https://partner.steamgames.com/doc/gettingstarted/ai_disclosure) |
| **How many Steam games disclose AI** | **Jul 2025 (Totally Human analysis):** nearly **8,000** titles disclose GenAI, vs ~**1,000** a year earlier — an **800%** rise, **7% of the total Steam library** and **20% of all games released so far in 2025**. **60%** of disclosures are for virtual asset generation; other categories include audio, text, marketing assets, code, flagging offensive UGC, and player-prompted in-game content. Disclosures are **voluntary** so the real number is likely higher. SteamDB added a filter. **GDC survey:** **52%** of developers reported working at companies that use generative AI tools; interest fell to **9%** (from 15%), and **27%** said their companies had no interest (+9 pts vs 2024). | The negative-signal study: **Game Oracle**, ~**10,000** Steam games released before last November, ~**21%** disclosing AI use, using review counts as a sales proxy: AI-tagged games received **53% fewer reviews** on average; ~**20%** of AI games got zero reviews vs **15%** for non-AI; first-month reviews **~4 vs ~7**; among games past 100 reviews, average rating **84.6% vs 88.3%**; for experienced developers/large publishers the estimated sales effect is **−40% to −60%**, while "young and lesser-known developers suffer significantly less". | [VGC (Jul 17 2025)](https://www.videogameschronicle.com/news/steam-games-disclosing-generative-ai-use-are-up-800-this-year/); [VGC (Jan 17 2026)](https://www.videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use/); [ixbt.games on the Game Oracle study](https://ixbt.games/en/news/2026/06/24/419230-prostoe-upominanie-ii-instrumentov-na-stranice-igry-v-steam-obrusit-ee-prodazi-na-40-60-issledovanie.html); [ExtremeTech headline (page 403s; title is the citable part)](https://www.extremetech.com/gaming/games-that-use-generative-ai-receive-53-poorer-firstmonth-reviews-study) |

### 2.1 Academic anchors (2023–2026)

- **Generative Agents** — Park, O'Brien, Cai, Morris, Liang, Bernstein; submitted 7 Apr 2023, v2 6 Aug 2023; cs.HC: "an architecture that extends a large language model to store a complete record of the agent's experiences using natural language, synthesize those memories over time into higher-level reflections, and retrieve them dynamically to plan behavior." ([arXiv:2304.03442](https://arxiv.org/abs/2304.03442))
- **Voyager** — Wang, Xie, Jiang, Mandlekar, Xiao, Zhu, Fan, Anandkumar; 25 May 2023, v2 19 Oct 2023 ([arXiv:2305.16291](https://arxiv.org/abs/2305.16291)).
- **GPTCache** — Fu Bang, NLP-OSS 2023, pp. 212–218, DOI 10.18653/v1/2023.nlposs-1.24: semantic cache "can increase response speed **2–10 times when the cache is hit**" and "network fluctuations will not affect GPTCache's response time" ([ACL Anthology](https://aclanthology.org/2023.nlposs-1.24/)).
- **Echoes of Others: Real-Time LLM Dialogue Generation for Immersive NPC Interaction** — McGrath, Lorandi, Belz; INLG 2025 system demonstrations, pp. 1–2, Hanoi, October 2025 ([ACL Anthology](https://aclanthology.org/2025.inlg-demos.1/)). A 2-page demo paper — treat as a pointer, not a cost study.
- **AI-native games taxonomy** — Xu et al., v1 1 Jul 2026, v2 3 Jul 2026: screens **53 publicly available AI-native games and prototypes**; defines AI-nativeness by a counterfactual ("if the AI component were removed or trivially replaced, the central form of play would collapse"); finds the corpus "concentrated around language-forward designs, especially narrative adventure, epistemic interaction, and generative narrative"; concludes "**the central design problem is organizing semantic openness into stable gameplay**… AI-native design depends on mechanical invariants: goals, rules, state, feedback, pacing, and player agency that make open-ended AI outputs interpretable and consequential." ([arXiv:2607.00527](https://arxiv.org/abs/2607.00527))
  - **JUDGMENT:** this is the best one-sentence thesis for the travel sim. Immigration, customs, FX and transit are *mechanical invariants* — they give the LLM's openness something to be consequential against.

---

## 3. Engineering practice (with the actual docs)

### 3.1 Structured output — the only reliable interface

| Provider | Mechanism | Verified specifics |
|---|---|---|
| **OpenAI** | `response_format` / `text.format` with `type: "json_schema"`, `strict: true` | Supports a **subset** of JSON Schema. Types: String, Number, Boolean, Integer, Object, Array, **Enum**, **anyOf**. String: `pattern`, `format` (`date-time`, `time`, `date`, `duration`, `email`, `hostname`, `ipv4`, `ipv6`, `uuid`). Number: `multipleOf`, `maximum`, `exclusiveMaximum`, `minimum`, `exclusiveMinimum`. Array: `minItems`, `maxItems`. **"all fields must be required"** — emulate optionality with a union type with `null` (`"type": ["string","null"]`). Object limits: **up to 5,000 object properties total, up to 10 levels of nesting**. First-party helpers exist for **Pydantic** and **Zod** (`zodTextFormat` / `zodResponseFormat`). **Refusals:** "a refusal does not necessarily follow the schema you have supplied… the API response will include a new field called `refusal`" — branch on it. **No token limit is stated on the current page** — it mentions "context window" twice but publishes no numeric cap for Structured Outputs. **UNVERIFIED: an 8,192-token Structured-Outputs cap** (widely repeated for 2024-era `gpt-4o-mini`); I grepped the live `.md` for `8192`, `8,192`, `16384`, `16,384` and found **zero** occurrences, so do not rely on that number. | [Structured Outputs guide (.md)](https://platform.openai.com/docs/guides/structured-outputs.md) |
| **Anthropic** | Tool use with `input_schema` + **`strict: true`** on custom tools | "Add `strict: true` to your custom tool definitions to ensure Claude's tool calls always match your schema exactly." `tool_choice` can force a tool call rather than relying on prompting; `disable_parallel_tool_use` is available; SDK "Tool Runner" skips the manual round-trip. | [Anthropic tool use overview](https://docs.claude.com/en/docs/build-with-claude/tool-use/overview) |
| **Google Gemini** | `response_format` with `mime_type: "application/json"` + `schema`, or SDK-side **Pydantic/Zod** | "You can configure Gemini models to generate responses that adhere to a provided JSON Schema. This ensures predictable, type-safe results"; the doc's own example calls it ideal for data extraction, **structured classification**, and **agentic workflows**. | [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) |

**Validation layer.** Zod is the TypeScript schema library whose docs are at [zod.dev](https://zod.dev/); the OpenAI SDK's own helpers convert a Zod schema into a strict JSON Schema (`zodTextFormat`), which means one schema is both the generation contract and the runtime validator. Ajv is the JSON-Schema validator ([ajv.js.org](https://ajv.js.org/)) for the case where the schema ships as JSON rather than code (useful if the content schema is edited by a designer).

**Why free-text parsing is fragile — first-hand evidence:** the shipped 1001 Nights demo produced "some **JSON parse error**" and broke against a change in OpenAI's key model ("Project API keys have replaced user API keys") ([itch.io](https://ada-eden.itch.io/1001-nights-official)). **JUDGMENT:** that is the whole argument for schema-constrained output plus a validator plus a retry, in one user report.

**Retry-and-repair loop (JUDGMENT, no vendor doc retrieved for the policy itself):** `strict: true` guarantees the *shape*, not the *meaning* — the model will happily return a syntactically valid `{"canEnter": true}` that contradicts your visa rule. So the loop must be: **generate → validate against the schema (Ajv/Zod) → validate against game rules in ordinary code → on failure, retry once with the validation error appended → on second failure, fall back to a pre-baked line.** Domain checks are the cheap part; never let the model be the authority on a boolean that the fiction depends on.

### 3.2 RAG over a "content bible", or a big cached prompt?

**Anthropic's context-engineering guidance is the right frame, and it is not "always RAG":**
- **Context rot is real and universal:** "as the number of tokens in the context window increases, the model's ability to accurately recall information from that context decreases… This characteristic emerges across all models." Model this as an **"attention budget"**, not a cliff. ([Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents))
- **Therefore the goal is the smallest high-signal token set:** "good context engineering means finding the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome." ([ibid.](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents))
- **Two retrieval strategies, and a hybrid is explicitly endorsed:** embedding-based *pre-inference* retrieval vs **"just in time"** — "maintain lightweight identifiers (file paths, stored queries, web links, etc.) and use these references to dynamically load data into context at runtime using tools." Trade-off stated plainly: "runtime exploration is slower than retrieving pre-computed data." ([ibid.](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents))
- **For very long horizons:** compaction, structured note-taking, multi-agent architectures ([ibid.](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).

**JUDGMENT for a travel sim:** the "content bible" here is small and *closed* — one city's customs rules, one airline's check-in script, one currency's denominations, one country's tipping norms. That is **not** a RAG problem. It is a **static, cacheable prefix** problem. Rule of thumb:
- Bible ≤ ~10k tokens and *the same for most calls* → put it in the cached system prefix. No embeddings, no vector store, no index staleness.
- Bible ≥ ~50k tokens **or** varies per city/NPC and only a slice is relevant → retrieve. But then wean it: retrieve **by structured key** (city id, NPC id, scene id) rather than by embedding similarity, because keys are deterministic and debuggable.
- **Embeddings are nearly free at this scale:** `text-embedding-3-small` is **$0.02 / 1M tokens**, `text-embedding-3-large` **$0.13 / 1M tokens** ([OpenAI pricing](https://platform.openai.com/docs/pricing.md)); Google's `gemini-embedding-2` text input is **$0.20 / 1M tokens** ($0.10 batch) ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)). A 500k-token bible costs **$0.01** to embed once with the small OpenAI model. **The embedding cost is not the reason to avoid RAG — the operational surface area is.**
- **Managed vector store pricing if you want one:** OpenAI File search = **$0.10 / GB-day storage (1 GB free)** plus **$2.50 / 1,000 tool calls** ([OpenAI pricing](https://platform.openai.com/docs/pricing.md)). Pinecone's page offers Starter free / Builder / Standard / Enterprise tiers but **JS/price-table content was not extractable** ([pinecone.io/pricing](https://www.pinecone.io/pricing/)) — **UNVERIFIED: exact Pinecone tier prices.**
- If you do want semantic search without building it, the OpenAI **Retrieval API / vector stores** is the lowest-effort option ([Retrieval guide](https://developers.openai.com/api/docs/guides/retrieval.md)).

**Verdict:** for a 1-owner + agents team, **large cached prompt > RAG** until the bible genuinely outgrows the cacheable prefix or needs per-entity slicing at scale.

### 3.3 Provider prompt caching — the numbers that decide the architecture

| Provider | Write cost | Read/hit cost | Minimum cacheable | TTL | Source |
|---|---|---|---|---|---|
| **Anthropic** | **1.25×** base input for 5-minute TTL; **2×** for 1-hour TTL | **0.1×** base input (0.025× on Fable 5.1/Mythos 5.1; 0.05× on Opus 5.5) | 512 tokens (Fable/Mythos 5.1, Opus 5.5/5, Fable/Mythos 5); 1,024 (Opus 4.8, Sonnet 5, Sonnet 4.6/4.5); **4,096 for Haiku 4.5**; 2,048 (Mythos Preview, Opus 4.7, Haiku 3.5); 4,096 (Opus 4.6/4.5) | 5 min default, refreshed free on each use; 1 h option | [Anthropic prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching) |
| **Anthropic (prices)** | Haiku 4.5 $1 in / $5 out, writes $1.25 (5 m) / $2 (1 h), hits **$0.10**; Sonnet 5 $2 / $10, writes $2.50 / $4, hits **$0.20**; Opus 5.5 $4 / $20, hits $0.20; Fable 5.1 $10 / $50, hits $0.25 | — | — | — | [ibid.](https://docs.claude.com/en/docs/build-with-claude/prompt-caching) |
| **OpenAI** | **1.25×** uncached input for GPT-5.6 and later | **0.1×** ("discounted up to 90%") | **1,024 tokens for GPT-5.6+**; varies by request settings for earlier models; hidden system tokens don't count toward the minimum | implicit by default; up to **4 cache writes per request** | [OpenAI prompt caching](https://platform.openai.com/docs/guides/prompt-caching) |
| **Google Gemini** | implicit caching (no write fee published) | savings "passed on" automatically when the request hits cache | **4,096 tokens** for Gemini 3.8/3.7/3.6/3.5 Flash and 3.1 Pro Preview; **2,048** for Gemini 2.5 Flash and 2.5 Pro | implicit, prefix-based | [Gemini context caching](https://ai.google.dev/gemini-api/docs/caching) |
| **Google (cache read price)** | — | Gemini 2.5 Flash cached input **$0.03** (text/image/video) + **$1.00 / 1M tokens per hour storage**; Gemini 3.5 Flash-Lite cached **$0.03** + $1.00/1M/hour; Gemini 3.8 Flash cached **$0.075** (through 2026-12-31) | — | paid-tier only (free tier: "Not available") | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |

**Two facts that bite:** (1) **Anthropic's Haiku 4.5 has a 4,096-token cache minimum** — a "cheap model + small cached bible" plan fails silently ("Any requests to cache fewer than this number of tokens will be processed without caching, and no error is returned"). (2) OpenAI's **order matters**: caching covers `tools → system → messages`, and changing `tools`, `text.format` (your JSON schema!), `reasoning.effort`, or `text.verbosity` invalidates the prefix ([OpenAI](https://platform.openai.com/docs/guides/prompt-caching)). **JUDGMENT: freeze the schema and the tool list early; treating them as hot-swappable silently destroys your cache-hit rate.**

**Batch discounts for the pre-bake pass:**
- OpenAI Batch: gpt-6-luna $0.05 in / $0.25 out (vs $0.10 / $0.50); gpt-5.6-terra $1.00 / $6.00 (vs $2.00 / $12.00) ([OpenAI pricing](https://platform.openai.com/docs/pricing.md)).
- Anthropic Message Batches: "**All usage is charged at 50% of the standard API prices**", up to 10,000 queries per batch, results within 24 hours, **and batch + prompt caching discounts stack** ([Anthropic batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing), [Anthropic blog](https://claude.com/blog/message-batches-api)).
- Google: Batch API = "**50% cost reduction**" ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)).

**Semantic caching (only worth it if you have genuinely repeated free-text queries):** GPTCache stores LLM responses and returns them before the provider is called, "**increas[ing] response speed 2–10 times when the cache is hit**" and shielding you from provider network jitter ([ACL Anthology](https://aclanthology.org/2023.nlposs-1.24/)). Redis LangCache is the managed equivalent ([redis.io docs](https://redis.io/docs/latest/develop/ai/context-engine/langcache/concepts/)). **JUDGMENT for this game:** most of your calls are slot-filled and near-unique (player state + scene), so semantic cache hit rates will be poor; use it for **player-facing free-text questions** ("how do I say thank you in Japanese?") where phrasings genuinely repeat, not for barks.

### 3.4 Cost budgets **per player hour** (real published prices, explicit assumptions)

**Published prices used** (per 1M tokens, standard tier, fetched from vendor pages):

| Model | Input | Cached in | Cache write | Output | Source |
|---|---|---|---|---|---|
| gpt-6-astra | $10.00 | $1.00 | $12.50 | $50.00 | [OpenAI](https://platform.openai.com/docs/pricing.md) |
| gpt-6-sol | $2.00 | $0.20 | $2.50 | $10.00 | ibid. |
| **gpt-6-luna** | **$0.10** | **$0.01** | **$0.125** | **$0.50** | ibid. |
| gpt-5.6-sol | $4.00 | $0.40 | $5.00 | $20.00 | ibid. |
| gpt-5.6-terra | $2.00 | $0.20 | $2.50 | $12.00 | ibid. |
| gpt-5.6-luna | $0.20 | $0.02 | $0.25 | $1.20 | ibid. |
| gpt-5.4-mini | $0.75 | $0.075 | — | $4.50 | ibid. |
| gpt-5.4-nano | $0.20 | $0.02 | — | $1.25 | ibid. |
| gpt-5-mini | $0.25 | $0.025 | — | $2.00 | ibid. |
| gpt-4.1-mini | $0.40 | $0.10 | — | $1.60 | ibid. |
| gpt-4o-mini | $0.15 | $0.075 | — | $0.60 | ibid. |
| Claude Haiku 4.5 | $1.00 | $0.10 | $1.25 / $2.00 | $5.00 | [Anthropic](https://docs.claude.com/en/docs/build-with-claude/prompt-caching) |
| Claude Sonnet 5 | $2.00 | $0.20 | $2.50 / $4.00 | $10.00 | ibid. |
| Claude Opus 5.5 | $4.00 | $0.20 | $5.00 / $8.00 | $20.00 | ibid. |
| Gemini 2.5 Flash | $0.30 | $0.03 | — | $2.50 | [Google](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3.5 Flash-Lite | $0.30 | $0.03 | — | $2.50 | ibid. |
| Gemini 3.8 Flash | $0.75 (thru 2026-12-31) | $0.075 | — | $3.75 (thru 2026-12-31) | ibid. |

**Assumed session shape — JUDGMENT, stated so it can be argued with:** a 0.5-hour session contains **60 barks** (60 in / 35 out), **40 flavour or hint lines** (50 in / 45 out), **6 dialog turns** (700 in / 120 out), **1 quest** (1,500 in / 900 out), and **3 NPC chats × 3 turns** (900 in / 90 out). That totals **116 calls, 19,400 input, 6,330 output** per half hour → **232 calls, 38,800 input, 12,660 output per player-hour**.

**Per player-hour, small cached tier** (assume 10,000 of the 38,800 input tokens are a stable cached prefix — system + content bible; remainder uncached):

| Model | $ / player-hour (cached read) |
|---|---|
| gpt-6-luna | **$0.0093** |
| gpt-4o-mini | $0.0127 |
| gpt-5.6-luna | $0.0212 |
| gpt-5.4-nano | $0.0218 |
| Gemini 2.5 Flash / 3.5 Flash-Lite | $0.0406 |
| Gemini 3.8 Flash | $0.0698 |
| Claude Haiku 4.5 | $0.0931 |
| Claude Sonnet 5 / gpt-6-sol | $0.1862 |
| gpt-5.6-terra | $0.2115 |
| Claude Opus 5.5 | $0.3704 |
| gpt-6-astra | $0.9310 |

**Per player-hour, no caching at all** (worst case, for comparison): gpt-6-luna $0.0102; gpt-4o-mini $0.0134; gpt-4.1-mini $0.0358; Gemini 2.5 Flash $0.0433; Claude Haiku 4.5 $0.1021; Claude Sonnet 5 $0.2042; gpt-5.6-terra $0.2295; gpt-6-sol $0.4084; gpt-6-astra $1.0210.

> **JUDGMENT — the headline number:** a full player-hour of live LLM content costs **between about one cent and ten cents** on a current small/fast tier, and **~$0.19–$0.21** on a mid tier, using published rates and the session shape above. The *cost* is not the risk. The risks are **latency**, **schema/rule failures**, and **cache-invalidation drift** (see §3.3 note 2 and the price table's cache-write columns).

**Latency.** Measured first-answer-token latencies (1,320 requests; reasoning and non-reasoning reported separately because "reasoning models spend several seconds thinking before the first visible answer"): **claude-opus-4-8 0.75 s, gpt-5-2 0.8 s, claude-haiku-4-5 0.96 s, claude-sonnet-5 1.5 s, claude-opus-4-7 2.0 s, mimo-v2-5 1.2 s** ([AIMultiple LLM latency benchmark](https://aimultiple.com/llm-latency-benchmark)). Vendor docs also sell prompt caching primarily as a *latency* win ("Reduce the time spent processing input before the response starts"), not only a cost win ([OpenAI](https://platform.openai.com/docs/guides/prompt-caching)).

**Where to hide the latency (JUDGMENT):**
- **Barks/flavour: never block the frame.** Generate on scene entry and during the *previous* scene; a bark that arrives 400 ms late is still a bark. There is no streaming requirement here.
- **Free-text NPC conversation: stream.** The Hidden Door reviewer's complaint is that "when the game makes a choice feel effortful the entire reading process feels effortful" ([Ian Bicking](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game)) — and his own note is the design escape hatch: "the pace of the interface doesn't have to align with the tasks given to the LLM." Show the character *typing/thinking* immediately (`stream: true`), stream tokens into the bubble, and never show a spinner-and-freeze.
- **Immigration/customs queue = free generation window.** A 3–8 second border-control queue animation is a legitimate loading screen; pre-generate the officer's line during it. This is the one place where the fiction *justifies* the wait.
- **Quest generation: pre-bake, never live.** A quest is 900 output tokens with a solvability contract — the exact thing §1.2 says not to trust. Generate a pool offline, review it, and serve it from a pack.

### 3.5 Caching layers, cheapest first

1. **Exact-match cache in your own DB** (the Infinite Craft pattern): key = `(a, b)` → result, "to reduce repeated queries, and to ensure that the same pair of elements always outputs the same result for all players" ([Wikipedia](https://en.wikipedia.org/wiki/Infinite_Craft)). For the travel sim the key is `(sceneId, npcId, playerStateHash)`.
2. **Pre-baked content pack** (see §3.6) — a cache with a 100% hit rate.
3. **Provider prompt caching** for the stable prefix: 0.1× reads ([OpenAI](https://platform.openai.com/docs/guides/prompt-caching), [Anthropic](https://docs.claude.com/en/docs/build-with-claude/prompt-caching), [Gemini](https://ai.google.dev/gemini-api/docs/caching)). Cheapest and highest-leverage single change.
4. **Semantic cache** (GPTCache / Redis LangCache) only for near-duplicate free-text questions ([ACL Anthology](https://aclanthology.org/2023.nlposs-1.24/)).

### 3.6 Moderation, safety, and the legal/ratings surface

- **OpenAI Moderation API is free**: "The `omni-moderation-latest` model accepts text and image inputs. **It doesn't classify audio.** The moderation endpoint is **free to use**, and image files can be up to 20 MB." You can also request moderation scores inline with generation via a top-level `moderation` object and read `response.moderation.input` / `.output` — "The model still generates normally. Review the moderation results before you show the output to a user." **Child safety:** "Do not send known or suspected child sexual abuse material (CSAM) to the Moderation API… not a substitute for dedicated child-safety safeguards." ([OpenAI moderation guide](https://developers.openai.com/api/docs/guides/moderation.md); free price rows also on [pricing](https://platform.openai.com/docs/pricing.md))
- **Structured-output refusals are a normal branch, not an exception:** handle the `refusal` field explicitly ([Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs.md)).
- **Infinite Craft proves the filter is an unbounded maintenance commitment:** "censoring the AI is a game of Whac-a-Mole. Eventually it doesn't even feel like programming anymore. It's more like alchemy" ([Eurogamer](https://www.eurogamer.net/behind-infinite-craft-one-of-the-internets-favourite-time-killers-its-creator-wrangles-with-ai-alchemy)).
- **Age ratings / ESRB:** the ESRB ratings-guide page documents rating categories (E, E10+, T, M17+, AO18+, RP) and content descriptors, and it has an **"INTERACTIVE ELEMENTS"** axis separate from content ([ESRB ratings guide](https://www.esrb.org/ratings-guide/)). **UNVERIFIED: I could not retrieve an ESRB or IARC statement specifically requiring disclosure of AI-generated or online-generated content.** The interactive-elements category is where online/user-interaction notice traditionally lives; confirm with ESRB/IARC directly rather than assuming.
- **COPPA / GDPR:** **UNVERIFIED.** I retrieved only secondary/legal-commentary search results and no primary FTC or EDPB text on AI-generated content in games. Do not ship claims about COPPA/GDPR obligations on the strength of this research; this needs a lawyer, not a search.
- **The practical problem, restated precisely:** LLM output that "breaks the fiction" is not an edge case, it is the *normal* case at volume. Hidden Door's objectives resolved themselves the moment they appeared; Infinite Craft generates "Vatican" from Europe+Cult and "War" from Religion+Religion; Anuttacon's Stella "is novel for a few exchanges, then feels just so-so" ([Ian Bicking](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game), [Eurogamer](https://www.eurogamer.net/behind-infinite-craft-one-of-the-internets-favourite-time-killers-its-creator-wrangles-with-ai-alchemy), [QbitAI](https://www.qbitai.com/2026/07/464169.html)).

### 3.7 Pre-baking / offline fallback — the strongest argument in this whole report

**Why a reviewed content pack beats live generation for a 1-owner team:**

| Dimension | Pre-baked pack | Live generation |
|---|---|---|
| Cost for a full game's worth of text | **500k output + 120k input tokens = $0.13** (gpt-6-luna batch: $0.05 in / $0.25 out) or **$3.12** (gpt-5.6-terra batch: $1.00 / $6.00) — or **$13.10** on gpt-6-astra batch ($5.00 / $25.00) if you insist on the flagship | scales with players × hours |
| Quality control | 100% reviewable before ship; can be edited by hand | unreviewable tail: the 0.1% offensive line ships to someone |
| Determinism | same input → same output for all players (Infinite Craft's explicit design goal) | nondeterministic; bug reports unreproducible |
| Failure mode | none at runtime | rate limits, outages, "Cannot reach LLM" ([GoodAI](https://www.goodai.com/ai-people/)) |
| Latency | 0 | 0.75–2.0 s TTFT measured ([AIMultiple](https://aimultiple.com/llm-latency-benchmark)) plus your network |
| Ratings/legal exposure | small and knowable | open-ended |
| Store disclosure | still required for the *pack* (Valve's "AI to generate content for the game") | required **and** "AI content generated during gameplay" ([Game Developer](https://www.gamedeveloper.com/business/valve-tweaks-and-clarifies-ai-disclosure-rules-for-steam)) |

**The hybrid (JUDGMENT, and it is the industry-consistent answer):**
- **Offline (Batch API, 50% off — [Anthropic](https://platform.claude.com/docs/en/build-with-claude/batch-processing), [OpenAI](https://platform.openai.com/docs/pricing.md), [Google](https://ai.google.dev/gemini-api/docs/pricing)):** generate 10–20× more lines than you need per slot; a human (or a rubric-driven second model pass) rejects ~80%; ship the survivors as the pack. This is exactly Ubisoft's loop at a smaller scale — generate variations, human selects, tool learns ([Ubisoft](https://news.ubisoft.com/en-us/article/7Cm07zbBGy4Xml6WgYi25d/the-convergence-of-ai-and-creativity-introducing-ghostwriter)).
- **Runtime:** live-generate **only** where the content must react to player state — customs officer reaction to *this* passport, vendor haggling on *this* price, a language-barrier misunderstanding the player just triggered. Everything else is a pack lookup. This is the Hidden Door reviewer's explicit recommendation: "start with choice-based fiction, entirely pregenerated in a static form… Making that generator incrementally more responsive and dynamic seems like a feasible path where story quality is prioritized" ([Ian Bicking](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game)).
- **Fallback is not optional:** if the live call fails validation, times out, or refuses, serve a pack line. GoodAI shipping a fix for "Cannot reach LLM" errors tells you this happens in production ([GoodAI](https://www.goodai.com/ai-people/)).

---

## 4. The cheapest architecture that reaches a good demo

### 4.1 Recommended stack

| Layer | Choice | Justification (with a number or a doc) |
|---|---|---|
| **Pre-bake ("content pack v1")** | **Batch API** on a cheap tier — `gpt-6-luna` batch ($0.05 in / $0.25 out) or `gpt-5.6-terra` batch ($1.00 / $6.00), or Claude via Message Batches at **50% off with stacking prompt caching** | 500k output tokens ≈ **$0.13** (luna) / **$3.12** (terra); Anthropic batch = "All usage is charged at 50% of the standard API prices", results < 24 h ([OpenAI pricing](https://platform.openai.com/docs/pricing.md), [Anthropic batch](https://platform.claude.com/docs/en/build-with-claude/batch-processing)) |
| **Live generation tier** | **`gpt-6-luna`** ($0.10 in / $0.01 cached / $0.125 write / $0.50 out) as default; escalate nothing until measured | **$0.0093–$0.021 per player-hour** cached; 232 calls/hour is well inside normal rate limits ([OpenAI pricing](https://platform.openai.com/docs/pricing.md)) |
| **Live "flagship" escape hatch** | **`gpt-5.6-terra`** ($2.00 / $0.20 / $2.50 / $12.00) for the ~1–2 calls/hour that actually matter (customs officer, quest epilogue) | Using terra for **everything** would be **$0.2115 / player-hour**, but at 2 of 232 calls the blended hour is **$0.0111** — escalation is nearly free at low call counts ([ibid.](https://platform.openai.com/docs/pricing.md)) |
| **Alternative if you want provider spread** | **Gemini 3.5 Flash-Lite** ($0.30 in / $0.03 cached / $2.50 out) | **$0.0406 / player-hour**; implicit caching needs **4,096 tokens** minimum ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini caching](https://ai.google.dev/gemini-api/docs/caching)) |
| **Avoid** | Claude **Haiku 4.5** as the volume workhorse *if* your cached prefix is < 4,096 tokens | Its cache minimum is **4,096 tokens** and short prompts "will be processed without caching, and no error is returned" — you'd silently lose the 0.1× read rate ([Anthropic caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)) |
| **Structured outputs** | **`json_schema` + `strict: true`** on every generating call; first-party **Zod** helper; **Ajv** to re-validate the raw JSON; **branch on `refusal`** | Docs-verified constraints: all fields required, `null`-union for optionality, ≤5,000 properties / ≤10 nesting levels ([OpenAI](https://platform.openai.com/docs/guides/structured-outputs.md)); Anthropic equivalent is `strict: true` on tools ([Anthropic](https://docs.claude.com/en/docs/build-with-claude/tool-use/overview)) |
| **Temperature** | **0.6–0.9** for bark/flavour variation; **0.0–0.2** for anything that fills a game-state slot (visa decision, price, item id, quest reward) | **JUDGMENT.** No vendor doc retrieved pins a number for games. Rationale: the same knobs that buy variety are the ones that break canon; split the workload by *consequence*, not by call type. |
| **Cache layer 1** | Own DB keyed `(sceneId, npcId, playerStateHash)` | Infinite Craft's proven pattern: "reduce repeated queries, and… ensure that the same pair of elements always outputs the same result for all players" ([Wikipedia](https://en.wikipedia.org/wiki/Infinite_Craft)) |
| **Cache layer 2** | Provider prompt caching: freeze `tools` + `system` + schema; put the content bible there; put volatile player state **last** | 0.1× reads vs 1.25× writes for OpenAI GPT-5.6+; changing `tools`/`text.format`/`reasoning.effort` invalidates the prefix ([OpenAI](https://platform.openai.com/docs/guides/prompt-caching)); Anthropic 5-min TTL refreshes free on use ([Anthropic](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)) |
| **Cache layer 3** | Semantic cache **only** for player free-text questions | GPTCache: 2–10× faster on hit ([ACL](https://aclanthology.org/2023.nlposs-1.24/)) — but slot-filled calls won't hit |
| **Moderation** | `omni-moderation-latest` inline via the `moderation` object, **free**, text+image (not audio) | [OpenAI moderation](https://developers.openai.com/api/docs/guides/moderation.md) |
| **Human review sits** | **Between generation and ship for the pack (100% of shipped pack lines); never in the live loop.** In the live loop, the *validator* is the reviewer | Pre-bake is the only place review is affordable; live review means live latency |
| **Latency plan** | Stream the NPC chat bubble (TTFT 0.75–2.0 s measured); generate barks ahead of scene entry; use the customs queue animation as a real generation window | [AIMultiple](https://aimultiple.com/llm-latency-benchmark); [Hidden Door review](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game) |
| **Mechanical invariants** | Visa/immigration rules, FX arithmetic, transit schedules, item ids and quest solvability live in **ordinary deterministic code**; the LLM only *narrates* decisions made there | This is the paper's conclusion: "**organizing semantic openness into stable gameplay**… mechanical invariants: goals, rules, state, feedback, pacing, and player agency" ([arXiv:2607.00527](https://arxiv.org/abs/2607.00527)) |
| **Store disclosure** | Disclose **both** categories: "AI to generate content for the game" (the pack) and "AI content generated during gameplay" (live dialogue) | [Game Developer](https://www.gamedeveloper.com/business/valve-tweaks-and-clarifies-ai-disclosure-rules-for-steam); [VGC](https://www.videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use/) |

### 4.2 Cost of the whole demo, itemised

| Item | Cost | Basis |
|---|---|---|
| Content pack v1 (500k out / 120k in) | **$0.13** (gpt-6-luna batch) or **$3.12** (gpt-5.6-terra batch) | [OpenAI pricing](https://platform.openai.com/docs/pricing.md) |
| Pack, if regenerated 10× while iterating | **$1.30–$31.20** | 10× above |
| Live play, per player-hour (all-live, cached small tier) | **$0.0093–$0.021** | §3.3 math |
| Live play, per player-hour (**2 flagship calls**, remaining 230 calls small tier) | **$0.0111** — because the 2 flagship calls are only 2/232 of the volume, escalating two calls per hour adds ≈$0.0017, not a tier change | §3.3 math |
| Assumption: local demo, ~50 player-hours total | **≈ $0.47–$1.05** of live API spend | §3.3 math × 50 |
| Moderation | **$0** | [OpenAI](https://developers.openai.com/api/docs/guides/moderation.md) |
| Embeddings, if you insist on RAG over a 500k-token bible | **$0.01** once (`text-embedding-3-small` $0.02/1M) | [OpenAI pricing](https://platform.openai.com/docs/pricing.md) |
| Managed vector store, if you insist | **$0.10/GB-day + $2.50/1k searches** | [OpenAI pricing](https://platform.openai.com/docs/pricing.md) |

**JUDGMENT — the strategic conclusion.** For this game the binding constraint is *not* API cost; it is that (a) the LLM must never be the authority on a fact the fiction depends on, and (b) every live call needs a reviewed fallback. Both point the same way: **a reviewed, pre-baked content pack is the product; live generation is a garnish on the 2–4 call sites per session where player state genuinely must change the words.** That also maximises the odds of avoiding the disclosure-driven review penalty that appears in the Game Oracle study for larger studios while keeping the "AI content generated during gameplay" box honest — and it matches what the one independent, detailed LLM-game review recommends. On top of that, one further risk deserves a line: **AI-tagged games averaged 53% fewer reviews** in that ~10,000-game study, though "young and lesser-known developers suffer significantly less" — which is the cohort a 1-owner project is in ([ixbt.games on Game Oracle](https://ixbt.games/en/news/2026/06/24/419230-prostoe-upominanie-ii-instrumentov-na-stranice-igry-v-steam-obrusit-ee-prodazi-na-40-60-issledovanie.html)).

### 4.3 Concrete build order (JUDGMENT)

1. Write the **content bible as data** (JSON: cities, airports, customs scenarios, FX rates, NPC personas, tone rules). Keep it ≤10k tokens per city so it fits a cached prefix.
2. Freeze the **JSON Schemas** for every generated slot (`Bark`, `OfficerLine`, `VendorResponse`, `HintLine`, `TravelerSummary`). Generate the Zod/Ajv validators from the same file.
3. **Batch-generate 10× per slot**, run a rubric pass + human pass, ship ~10% as `pack.json`. Cost: cents.
4. Wire a **single `generateSlot()`** server function with: exact-match DB cache → provider cached prefix → strict schema → rule validator → one repair retry → pack fallback. Instrument **cache-hit rate, schema-failure rate, refusal rate, p95 latency** from day one.
5. Only after the pack ships: enable live generation at the 2–4 highest-value call sites, temperature split by consequence.
6. Re-check disclosure wording against Valve's current form **at submission time** — the rules were rewritten in January 2026 and the primary page is JS-rendered, so read the live form in Steamworks rather than any cached copy.

---

## Sources

**Vendor documentation & pricing (fetched directly)**
1. https://platform.openai.com/docs/guides/structured-outputs.md
2. https://platform.openai.com/docs/guides/prompt-caching
3. https://platform.openai.com/docs/pricing.md
4. https://platform.openai.com/docs/guides/moderation
5. https://developers.openai.com/api/docs/guides/moderation.md
6. https://developers.openai.com/api/docs/guides/retrieval.md
7. https://platform.openai.com/docs/guides/function-calling.md
8. https://docs.claude.com/en/docs/build-with-claude/prompt-caching
9. https://docs.claude.com/en/docs/build-with-claude/tool-use/overview
10. https://platform.claude.com/docs/en/build-with-claude/batch-processing
11. https://claude.com/blog/message-batches-api
12. https://ai.google.dev/gemini-api/docs/pricing
13. https://ai.google.dev/gemini-api/docs/caching
14. https://ai.google.dev/gemini-api/docs/structured-output
15. https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview
16. https://redis.io/docs/latest/develop/ai/context-engine/langcache/concepts/
17. https://docs.convai.com/api-docs/credits-and-billing/convai-credits/estimate-credit-usage
18. https://inworld.ai/resources/voice-agent-cost-per-minute-2026
19. https://zod.dev/
20. https://ajv.js.org/
21. https://www.pinecone.io/pricing/

**Platform policy & industry data**
22. https://store.steampowered.com/ai_disclosure *(JS-rendered; body not retrievable)*
23. https://partner.steamgames.com/doc/gettingstarted/ai_disclosure *(JS-rendered; body not retrievable)*
24. https://www.gamedeveloper.com/business/valve-tweaks-and-clarifies-ai-disclosure-rules-for-steam
25. https://www.videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use/
26. https://www.videogameschronicle.com/news/steam-games-disclosing-generative-ai-use-are-up-800-this-year/
27. https://80.lv/articles/steam-has-clarified-its-rules-on-the-use-of-ai-in-video-games
28. https://ixbt.games/en/news/2026/06/24/419230-prostoe-upominanie-ii-instrumentov-na-stranice-igry-v-steam-obrusit-ee-prodazi-na-40-60-issledovanie.html
29. https://www.extremetech.com/gaming/games-that-use-generative-ai-receive-53-poorer-firstmonth-reviews-study
30. https://www.esrb.org/ratings-guide/

**Games, tools, postmortems**
31. https://en.wikipedia.org/wiki/AI_Dungeon
32. https://www.techdirt.com/2021/11/17/content-moderation-case-study-game-developer-deals-with-sexual-content-generated-users-own-ai-2021/
33. https://news.ubisoft.com/en-us/article/7Cm07zbBGy4Xml6WgYi25d/the-convergence-of-ai-and-creativity-introducing-ghostwriter
34. https://techcrunch.com/2023/03/22/ubisofts-new-ai-tool-automatically-generates-dialogue-for-non-playable-game-characters/
35. https://www.eurogamer.net/ubisoft-unveils-generative-ai-neo-npcs-and-the-spirit-of-peter-molyneuxs-milo-lives-on
36. https://tech.yahoo.com/gaming/articles/ubisoft-nvidia-inworld-ai-partnership-201703130.html
37. https://www.nvidia.com/en-us/geforce/news/nvidia-ace-naraka-bladepoint-inzoi-launch-this-month/ *(JS-rendered; headline only)*
38. https://en.wikipedia.org/wiki/Infinite_Craft
39. https://www.eurogamer.net/behind-infinite-craft-one-of-the-internets-favourite-time-killers-its-creator-wrangles-with-ai-alchemy
40. https://ada-eden.itch.io/1001-nights-official
41. https://store.steampowered.com/app/2726370/
42. http://www.gamelook.com.cn/2026/05/592917/
43. https://store.steampowered.com/app/3730100/Whispers_from_the_Star/
44. https://www.qbitai.com/2026/07/464169.html
45. https://www.goodai.com/ai-people/
45b. https://www.goodai.com/ai-people-alpha-officially-released/
46. https://raw.githubusercontent.com/art-from-the-machine/Mantella/main/README.md
47. https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game
48. https://www.theverge.com/games/757816/hidden-door-early-access-ai-story *(JS-rendered; title only)*

**Academic**
49. https://arxiv.org/abs/2304.03442 — Generative Agents
50. https://arxiv.org/abs/2305.16291 — Voyager
51. https://arxiv.org/abs/2607.00527 — AI-native games (53 games screened)
52. https://aclanthology.org/2023.nlposs-1.24/ — GPTCache
53. https://aclanthology.org/2025.inlg-demos.1/ — Echoes of Others (INLG 2025 demo)
54. https://github.com/AlexisOlson/somnigraph/blob/main/research/sources/generative-agents.md — independent paper analysis (secondary)
55. https://m.techweb.com.cn/article/2023-04-12/2924451.shtml — secondary claim on Generative Agents cost **(UNVERIFIED)**

**Context-engineering guidance**
56. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
57. https://aimultiple.com/llm-latency-benchmark
