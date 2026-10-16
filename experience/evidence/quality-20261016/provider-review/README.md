# Wikipedia coordinate review · 2026-10-16

The actual Eiffel Tower nearby response returned Wikipedia page **48435351**, “Palazzo Bernardo Nani”, at **48.8583, 2.2923**. Its description says “Palace on the Grand Canal, Venice”. The article's own coordinate template supplies those Paris coordinates; its opening text identifies Dorsoduro, Venice, Italy. The linked Wikidata entity **Q16585996** supplies **45.433737, 12.326719**, about **848.14 km** from the article coordinate.

The reviewed record in `src/discovery/coordinate-reviews.js` excludes this page from normalized nearby places when its supplied coordinate is more than **2,000 metres** from that reviewed Wikidata point. A corrected upstream coordinate within that tolerance passes the ordinary nearby-radius checks automatically. The filter preserves source coordinates, makes no additional network requests, and applies only to this reviewed page ID. Other articles have no new validation claim.

Captured public responses and HTTP headers were fetched through the configured environment proxy on 2026-10-16. JSON files are copied byte-for-byte from `artifacts/homepage-walkthrough-20261016/provider-review/`.

| Evidence | Request / revision | SHA-256 |
| --- | --- | --- |
| `nearby-eiffel.json` | [Actual geosearch request](https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&generator=geosearch&ggscoord=48.8582599%7C2.2945006&ggsradius=1200&ggslimit=30&ggsnamespace=0&prop=coordinates%7Cpageprops%7Cdescription&coprimary=primary&colimit=max&ppprop=wikibase_item%7Cdisambiguation&origin=*&maxage=3600&smaxage=3600) | `f6c5cbc884c7b161ae97b7b17d6882b4afe6ede4ec983b8c7bb3857c6f0aec3f` |
| `palazzo-article.json` | [Article query](https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&pageids=48435351&prop=coordinates%7Cextracts%7Crevisions&coprimary=primary&exintro=1&explaintext=1&rvprop=ids%7Ctimestamp%7Ccontent&rvslots=main&origin=*); revision **1194537782**, **2024-01-09T13:47:48Z** | `26bb28659f60b90a3910511f74cd8ef4c0831461a67d3e4f1f2f67c49497ce5c` |
| `palazzo-wikidata.json` | [Entity data](https://www.wikidata.org/wiki/Special:EntityData/Q16585996.json); revision **2539212320**, **2026-09-01T21:05:48Z** | `3868144144afe916605782eb1c11729092878729d7741c1b423c94b0b93e599a` |

Wikipedia article material is attributed to Wikipedia contributors under CC BY-SA; the captured article includes its revision identity. Wikidata structured data is CC0. These files document the source inconsistency and support local regression tests; they are not replacement provider responses. The corrected-coordinate test is an explicit candidate correction using the captured Wikidata point, not a claim that Wikipedia has already been corrected.
