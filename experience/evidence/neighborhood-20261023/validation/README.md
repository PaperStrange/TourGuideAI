# Local validation

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
