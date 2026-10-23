# Local validation

Candidate-6 package is `ca4b3c95bc2a6b94ad2cc978a083d1e3c3c109d65febce326a5e16e937dc271b`.
Its lossless transport package uses manifest
`deb00b97ca3e29e314a13225678c7e6827de59a0f8ff68d5d3bdccc7d3563458`.
Application checks pass **199/199**, repository gates pass **17/17**, and the
canonical build succeeds. Encoded/decoded identity and reproducibility evidence
is in `../world/transport/`. Browser acceptance and performance are separate.

| Candidate-6 report | Original SHA256 |
| --- | --- |
| `app-tests-candidate-6.txt.gz` decoded text | `36af46f2c8ac394fe6e59501263fed8a9972f68a26052213001f524b1df8a598` |
| `build-candidate-6.txt.gz` decoded text | `e47b82c902504e307a7e7507c634e97a43b309a8de70b111ea513668ac293a44` |
| `repository-gates-candidate-6.txt` | `43a16b6a9e37d69799f7f711f656ea8ae0dc879d15558f6b93f7d192cf632332` |

## Candidate-5

Candidate-5 package is `223fcf32ae41551aab0096dae95d8160c679dacb38469c0f7dbdfb4163b37f23`.
It adds verified hash-versioned caching and explicit retry recovery for cached
integrity/HTTP failures. Application checks pass **199/199**, including the
**19/19** targeted asset/lighting/transport checks. Repository gates pass **17/17**;
the canonical build succeeds. Scenery bytes remain unchanged.

| Candidate-5 report | Original SHA256 |
| --- | --- |
| `app-tests-candidate-5.txt.gz` decoded text | `c3831be7d21de36f7992f27b1839ab3b62ddee325bba130d2d94e0c7742dc46d` |
| `build-candidate-5.txt.gz` decoded text | `fc4598236751a975563b53694078c7512a8aa44c1515e79486334e635a80d47b` |
| `cache-retry-tests.txt.gz` decoded text | `c4791e193383b835b27087076cfd02d8d98d5785abf98b1b52850accde64655d` |
| `repository-gates-candidate-5.txt` | `43a16b6a9e37d69799f7f711f656ea8ae0dc879d15558f6b93f7d192cf632332` |

## Candidate-3

Candidate-3 source is `9a3b9e8d7e9f8ae078d4671117fc87c295ef7af0`; its 299-file
canonical package is `4fbeebdbde8ba750f619a0fc5c3e15637a49cdb92e90e22f376c41ce8d8c7922`.
The scenery bytes remain identical to candidate-2. After the inspection-click and
touch-help correction, application checks pass **191/191**, the canonical build
succeeds and font regeneration reports zero missing source glyphs.

| Candidate-3 report | Original SHA256 |
| --- | --- |
| `app-tests-candidate-3.txt.gz` decoded text | `3570b9b25ca568330adebe33b39b6d69af306d7d01d6ddea7c0e4ef6d2942b1b` |
| `build-candidate-3.txt.gz` decoded text | `79b7ede6623f6e8349f6a0b3f71903707fc8066af111a8bd42a7a18e99bf0f7a` |
| `font-candidate-3.txt` | `f519eb0af4ee0711f934cda2df4b23a98c8eebbb8398f99043d8f0b412b2fa48` |

## Candidate-2

Source: `88af351d9662a191762442022c21a0831e1b2feb`.
Canonical build copied to `artifacts/neighborhood-20261023/candidate-2`.
The 299-file package SHA256 is
`f27fbe22db95a007010d2d46a661f27752a2361f5d9d84aaa4e4588c498e0dc5`.
The scenery manifest SHA256 is
`90c0873c5e540147630c970d4a2ea692c1583b3c407c175a2659d4e1e93934c8`.

| Check | Result | Original report SHA256 |
| --- | --- | --- |
| Application `npm test` | 191/191 pass, zero skips | `9b51cd6c1602e7f936bba06a0fdce9bfaa6accd5c2f8d49667081dbf346465da` |
| Targeted resource, scheduling and actual-HTTP gzip checks | 9/9 pass, zero skips | `6de1fc6528e44e4e8174941efd9476f8752a12a5d16ef17d01ff12b79aaadfd6` |
| Repository gates | 17/17 pass, zero skips | `8410e5b2a44cee4f330f8a14c99e54e92c2d393eaa2bedbac04cbad29b42c3c2` |

Text reports are retained as deterministic gzip files. Hashes above identify their
decoded original bytes; the repository JSON is retained directly. Application
checks include the targeted checks, so their counts must not be added together.
The canonical Vite build succeeds. Browser appearance, complete-route acceptance,
loading/input/frame measurements and physical-device performance require their
separate evidence.
