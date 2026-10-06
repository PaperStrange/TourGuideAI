# Day and night lighting resources

Reviewed 2026-10-06. Two local Poly Haven HDRIs supply image-based illumination
and reflections for the authored lighting modes. They were captured in London
and Berlin. They do not document Kyoto lighting, replace the street geometry,
or supply a visible panorama background. The existing building GLB, factual
content and four architectural reference photographs remain unchanged.

The resource manifest is
[`public/lighting/resources.json`](../public/lighting/resources.json). It records
source pages, official API responses and their hashes, creator credits, capture
dates, license evidence, download URLs, exact sizes and local SHA-256 values.
The application loads local files; no runtime CDN or provider API is required.

## Selected environment maps

| Mode | Source and creator | Local file | Encoded bytes / SHA-256 |
| --- | --- | --- | --- |
| Day | [Urban Street 04](https://polyhaven.com/a/urban_street_04), Andreas Mischok; London, captured 2019-09-14 | `public/lighting/environments/day-1k.hdr` | 1,724,368 / `d0b515b6741e44ceaa7dc2e42a64ec30f61871ae313762729c6a14f5343484f2` |
| Night | [Modern Buildings Night](https://polyhaven.com/a/modern_buildings_night), Greg Zaal; Berlin riverside, captured 2016-11-06 | `public/lighting/environments/night-1k.hdr` | 1,655,510 / `a690048dcecabf5ed1ad773f7abdec7cce7b1fea4d89b17f054a18f3e0fa2919` |

Both are 1024 × 512 equirectangular Radiance RGBE files, with header
`FORMAT=32-bit_rle_rgbe`. Total encoded size is **3,379,878 bytes**, about
3.22 MiB. These are exact official 1K downloads, renamed locally; this project
did not resample, crop, recolor or otherwise edit their pixels. Provider MD5 and
byte counts match both downloaded files. SHA-256 values were computed locally.
Runtime PMREM filtering is a separate rendering step, not a change to the
distributed source HDR files.

The official information and file APIs are linked separately because descriptive
metadata and downloadable file records answer different questions:

- Day: [asset information](https://api.polyhaven.com/info/urban_street_04) and
  [download records](https://api.polyhaven.com/files/urban_street_04).
- Night: [asset information](https://api.polyhaven.com/info/modern_buildings_night)
  and [download records](https://api.polyhaven.com/files/modern_buildings_night).

Poly Haven's [asset license page](https://polyhaven.com/license) states that its
assets are CC0 and expressly permits redistribution, including inside a product.
The applicable dedication is [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
Attribution is not required by that dedication; the project nevertheless credits
both creators and Poly Haven in the [accessible credits page](../public/credits.html).
This permission concerns the asset files, not every item of website content.

## Lighting interpretation and calibration

The selected daylight map has a partly cloudy sky, a distinct sun and nearby
building façades. It gives the glazing and rough stone more useful variation
than a flat ambient color. The night map has warm illuminated glass, cool sky
and small bright ground lights. Its broad light panels are useful reflection
sources but should not become the dominant light on every Kyoto façade.

These files are independently exposed and are **not a calibrated day/night
photometric pair**. Decoding with the installed Three.js `HDRLoader` produces
finite RGB values in both files. Approximate unweighted linear luminance
percentiles are day P50 0.090 / P95 0.376 and night P50 0.250 / P95 3.779.
These are relative image values, not lux or measured scene illumination. The
night map therefore needs a much lower authored environment intensity to read
as night. Do not infer a realistic exposure ratio from the capture names alone.

Environment yaw, intensity, exposure, direct lights and fog belong to the art
rig. Zero yaw means the unregistered source orientation; it does not establish
east or north in Kyoto. The day map's brightest pixel is near image UV
(0.600, 0.336), which can help the art lead align a shadow-casting sun, but this
is not a surveyed solar position. Document the final renderer transforms in
the rig rather than silently treating Blender and Three.js environment axes as
identical.

A PMREM environment supplies material illumination/reflections without knowing
where Kyoto's local walls, lamps or canopies are. It cannot alone establish
local occlusion, lamp falloff, or matching hard shadows. Direct lights and
renderer shadow settings remain necessary. Day and night should keep the same
mapped building positions; changing the lighting mode does not alter opening
hours, traffic signals, access, or simulated/real-visit status.

The inspection previews were generated only in temporary workspace files using
a simple Reinhard-to-sRGB view transform. They are not distributed assets,
alternate HDR files, or evidence of the final application's appearance.

## Kyoto-specific photographic guidance

The already licensed architectural images remain the evidence for building
identity and visible lighting hierarchy. Their full credits, dates and limits
are in [the façade reference review](facade-references.md) and its linked
machine-readable evidence; this review did not change their capture dates or
claim a new on-site verification.

- In the January 2021 Mitsui night photo, warm light emphasizes the lower curved
  classical columns and spills up the pale corner panel. The office façades are
  much less uniformly lit. A local warm accent on the existing corner geometry
  follows that reference more closely than a gold tint across the whole tower.
- The Daiya night photo shows warm upward light on the paired corner columns,
  small wall lamps and lit arched ground openings. Upper glazing stays mostly
  dark. Its clearer repeated arches are on Karasuma; the Shijō face remains
  partly obscured by the canopy.
- The 2026 frontage close-ups support the visible lightbox, glazing and soffit
  character. They do not measure luminous intensity or locate a light against
  a specific authored door slot.
- Multicolored canopy lights visible in January 2021 do not establish a
  permanent operating pattern. Neither photo establishes present-day lamp
  schedules, fixture models, color temperatures or measured photometric data.

No pixels from those Kyoto photographs are imported as lighting textures. Any
spotlight positions, cone angles, falloff and color choices are authored
approximations informed by the visible hierarchy. Night mode is a visual mode,
not a statement that an actual venue is open or a surveyed reconstruction of a
particular date and time.

## Alternatives checked, not installed

| Resource | Finding and decision |
| --- | --- |
| [Poly Haven Potsdamer Platz](https://polyhaven.com/a/potsdamer_platz) | Official API lists a low-contrast overcast urban environment. Useful softer daylight alternative; not downloaded because the selected partly cloudy map gives clearer light direction. |
| [Poly Haven Shanghai Bund](https://polyhaven.com/a/shanghai_bund) | Official API lists an urban night environment. Its landmark setting is less neutral for this interpretation; not downloaded. |
| [ambientCG Paving Stones 151](https://ambientcg.com/a/PavingStones151) and [Asphalt 031](https://ambientcg.com/a/Asphalt031) | Current official API confirms PBR material entries; [ambientCG's license](https://docs.ambientcg.com/license/) permits use and redistribution under CC0. No material files were downloaded: replacing building or pavement materials is outside this lighting pass, and a generic material does not establish Kyoto's actual surface composition. |
| ambientCG IES profiles | No supported IES download was confirmed. The [official API type list](https://docs.ambientcg.com/api/v2/full_json/) includes materials and HDRIs but no IES type; the [IES keyword query](https://ambientcg.com/api/v2/full_json?q=ies&limit=5) returned zero results on the review date. This is a bounded catalog finding, not a claim about all historical or future offerings. No IES profile is shipped or claimed. |

The selected environmental images are sufficient for this increment. Further
HDRIs, PBR maps or photometric profiles require their own selected-file record
and a concrete rendering need; this review does not add an unused asset corpus.

## Verification boundary

Resource checks cover provider checksum/size, local SHA-256, HDR headers,
successful decoder output and source/license records. The HDRIs are local and
unchanged; the total asset budget is below 4 MB. Art owns final yaw/exposure and
light placement. Browser QA owns switching behavior, visual results, memory,
shadows and build-relative URLs. Resource validation alone does not establish
that the runtime lighting modes or offline renders have passed those checks.
