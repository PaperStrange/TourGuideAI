# Shijō–Karasuma façade references

Reviewed 2026-10-05. The bounded façade-character pass is implemented in the
exported model, with original simplified geometry and materials informed by all
four references below. This is not a photographic reconstruction or a survey.
No Google imagery, panorama pixels, measurements, or textures were imported.
The selected photographs were visually inspected; their pixels remain outside
the application. Machine-readable credits and original-image hashes are in
[`facade-references.json`](../public/content-evidence/facade-references.json).

The art lead confirmed the final pass. Direct review of
[`build_scene.py`](../art/build_scene.py) and
[`provenance.json`](../public/models/provenance.json) confirms the four reference
records and metadata hash match this evidence file. The six embedded color
textures are generated original materials, not copied photographs. Exported
`shijo-block.glb` SHA-256:
`68c2afa632505ddb6ae2a65d93c615403a476f4859885ca5860fbc3bfcd6980b`.
The accessible [credits page](../public/credits.html) ships full photographic
credits, source/license links, and the use/change statement. Final browser
acceptance belongs to the separate QA record.

## Street View: the applicable boundaries

The [Google Maps End User Additional Terms](https://maps.google.com/intl/en/help/terms_maps/)
(last modified 2026-01-27), §1, permit viewing and point to Google's permissions
guidance. §2 restricts copying except permitted uses or applicable law, bulk
download, and creating products based on Maps. Its §2.4 dataset restriction has
a substitute/substantially-similar-service condition; it is not an unrestricted
ban on every independent map dataset.

The [Geo Guidelines](https://about.google/brand-resource-center/products-and-services/geo-guidelines/),
**Street View → Additional restrictions**, explicitly list:

> “Creating data from Street View images, such as digitizing or tracing information from the imagery”

That section also restricts automated information extraction, separate downloads,
and stitching, across commercial, nonprofit and academic projects. **Street View
→ Web and apps** allows Google's provided embed/API routes but forbids screenshots
or removing imagery from embeds. **Google Maps → Web and apps** permits linking
to Maps. Attribution alone does not remove these restrictions.

These provisions do not define every case of a person's visual inspiration or
manual comparison. Ordinary viewing is different from extracting pixels or
tracing details into an asset. For this project's detailed façade reconstruction,
the published permission route does not support deriving Blender geometry or
textures from Street View. Use the independent licensed photographs below for
the model; a Maps link can remain a separate comparison aid. No actual Street
View panorama was inspected in this research.

The [Maps Platform terms](https://cloud.google.com/maps-platform/terms),
§3.2.3(a–c,e), separately restrict API-content extraction, caching, creation of
content, and use with non-Google maps. Those are customer/API provisions. The old
repository Places API review is not itself proof of the rules for a consumer
manually viewing Maps. Also, the Geo Guidelines' explicit Earth-to-3D restriction
belongs to its **Google Earth** section; the Street View conclusion above rests
on the separate Street View provisions.

## Selected open photographs

All four file pages identify the photographer and license. The two full-building
images also record Commons' review of the original Flickr license. Dates below
are capture dates, not a promise of unchanged conditions today. CC BY licenses
permit reuse/adaptation subject to their terms, including credit; no ShareAlike
photo is selected for this pass. Image licensing does not imply bank endorsement.

| ID / subject | Exact source | Author, date, license | Purpose |
| --- | --- | --- | --- |
| `mitsui-exterior-2021` / 京都三井ビル | [Kyoto Mitsui Building night 20210103183745.jpg](https://commons.wikimedia.org/wiki/File:Kyoto_Mitsui_Building_night_20210103183745.jpg) · [original Flickr](https://www.flickr.com/photos/94693136@N05/51340177505/) | inunami; 2021-01-03; [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Building mass, window pattern, corner feature, sidewalk canopy. |
| `mitsui-frontage-2026` / bank frontage in 京都三井ビル | [Sumitomo Mitsui Banking Corporation Kyoto Branch & Shijo Branch & Fushimi Branch.jpg](https://commons.wikimedia.org/wiki/File:Sumitomo_Mitsui_Banking_Corporation_Kyoto_Branch_%26_Shijo_Branch_%26_Fushimi_Branch.jpg) | Suikotei; 2026-01-04; [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Stone fascia, dark frames, glazing and canopy detail. |
| `daiya-exterior-2021` / 京都ダイヤビル | [Kyoto Dia Building at Shijo-Karasuma intersection 20210103183825.jpg](https://commons.wikimedia.org/wiki/File:Kyoto_Dia_Building_at_Shijo-Karasuma_intersection_20210103183825.jpg) · [original Flickr](https://www.flickr.com/photos/94693136@N05/51339907094/) | inunami; 2021-01-03; [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Vertical façade pattern, arched base, corner feature. |
| `daiya-frontage-2026` / MUFG frontage in 京都ダイヤビル | [MUFG Bank Kyoto Branch & Kyoto-Chuo Branch.jpg](https://commons.wikimedia.org/wiki/File:MUFG_Bank_Kyoto_Branch_%26_Kyoto-Chuo_Branch.jpg) | Suikotei; 2026-01-04; [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Glazing, metal framing, illuminated sign and curved soffit. |

For model credits, retain the full photo titles, author names, source and license
links from the JSON, and state the actual change/use: **“Visual reference for
original simplified façade geometry and materials; photograph pixels are not
included.”** Keep this credit with the distributed model's provenance and in the
application's accessible credits. Do not claim the photographers endorse it.
If an image is later cropped, recolored, or redistributed, record those changes
and the image's license separately. This handoff does not approve photo textures.

## Visible building character and limits

**North / Mitsui.** The full view shows pale stone-like cladding, a substantial
solid wall area, repeated individual dark rectangular windows, and a chamfered
intersection corner containing a curved classical columned feature. A uniform
glass curtain wall would miss its identity. The 2026 close-up shows a speckled
grey fascia with expressed joints, dark metal/glass bays, a continuous transom
and sign band, and a pale sidewalk canopy with a slender ribbed support. The
SMBC/lime accent is visible in that specific photograph, not a surveyed sign
coordinate. The corner's lit warm tone is partly night lighting, not a measured
material color.

**South / Daiya.** Pale vertical ribs surround tall dark glazing strips, with a
strong horizontal division and a stone-like lower base with broad arches. A
classical columned feature occupies the intersection corner. The 2026 close-up
shows clear glass, grey metal framing, a white illuminated MUFG sign above an
opening, a thin red stripe on the glass, and a warm curved soffit. It provides
entrance appearance, not a mapping to any authored `D-S*` slot. The model includes
the full south volume; hiding its upper groups is a camera visibility treatment,
not evidence of a low real-world elevation.

**Implemented bounded pass.** Mitsui now has solid pale stone, individual punched
windows and a simplified curved classical corner. Daiya's Shijō face has the
vertical stone/glass pattern and paired-column corner. Its single bounded arch
is on the west return; the clearer Karasuma arch array was not copied onto Shijō.
Canopy and ground-frame treatments use the close-up references. These are
original meshes/materials with authored dimensions and bay arrangement. Known
frontage spans, coordinate datum, crossing and ten authored door anchors remain
unchanged; tenant assignments remain unknown. A photograph showing a bank entrance does not identify which
anchor it belongs to, confirm accessibility, or authorize a reconstructed
enterable interior. Signs reproduced as descriptive labels must not turn an
authored door into a verified bank entrance.

Photo perspective is not a survey. Bay widths/counts, heights in metres, cornice
dimensions, recess depths, precise sign/entrance positions and unknown backfaces
remain authored unless separately sourced. The full views include two street
faces: Mitsui's Shijō face extends right from its corner in the photograph;
Daiya's extends left. Do not transpose the Karasuma face's opening pattern onto
Shijō. Neither winter lighting nor festival-like canopy lighting establishes
permanent lighting behavior. The close-ups alone do not establish face orientation.

## Official independent corroboration

These are original operator/developer/contractor sites, separate from their
embedded Google maps. Their public availability is not an open image license;
no photo redistribution grant was established, so their images are not selected
as reusable assets.

| Source | Supported use in this handoff |
| --- | --- |
| [Muromachi Building: Kyoto Mitsui](https://tm.muromachi.jp/estate/detail/kyoto-mitsui/) | Named exterior photographs; address 長刀鉾町8; eight above-ground floors and one basement; completed September 1984. Footer reserves rights. |
| [Mitsui Fudosan Office: Kyoto Mitsui](https://office.mitsuifudosan.co.jp/detail.php?id=10041) | Identity, exterior photograph and eight floors / one basement, with two rooftop structure levels. Listed typical ceiling height is not floor-to-floor or building height. |
| [Chitose: Kyoto Daiya](https://www.chitosenet.co.jp/corporation/buildings/kyoto/) | Named building photographs; 長刀鉾町10; October 2007; eight above-ground floors / one basement. Footer reserves rights. |
| [Takenaka: Kyoto Daiya](https://www.takenaka.co.jp/ja/majorworks/42601712007.html) | Contractor's named work page and independent building identity; no open photograph license established. |

Eight floors corroborate the existing OSM `building:levels=8` metadata. None of
these facts changes the source-provenance distinction between observed level
count and authored model height, roof, materials or interior.

## Optional comparison links and next geometry step

[Mitsui in Google Maps](https://www.google.com/maps/search/?api=1&query=%E4%BA%AC%E9%83%BD%E4%B8%89%E4%BA%95%E3%83%93%E3%83%AB)
and [Daiya in Google Maps](https://www.google.com/maps/search/?api=1&query=%E4%BA%AC%E9%83%BD%E3%83%80%E3%82%A4%E3%83%A4%E3%83%93%E3%83%AB)
are ordinary building searches, not verified panorama URLs or an in-game imagery
integration. Let users choose to open the external service.

The blank west edge is a separate geometry issue. Existing OSM corridor evidence
contains Karasuma road ways and Shijō–Karasuma junction node `302168548`; the
current `WORLD` has no supported cross-street surface polygon. A future
intersection extension needs projected edges/width provenance plus corresponding
walk and pointer surfaces. Filling the footprint gap with an invented road would
not establish those boundaries. This façade pass does not extend navigation.
