# Candidate-2 local validation

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
