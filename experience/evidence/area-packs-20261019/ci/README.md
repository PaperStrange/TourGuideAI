# Complete packaged browser regressions

GitHub Actions run `39281251953`, source
`379e9d3223d5352ca298e841a7ccbb3694c75d8c`.
All seven downloaded reports bind the same 94-file package:
`5a8e0f67506cd164e7422e8aaf22c6a77685c4a7996168aac16703a6b0d0deb7`.
Each complete browser report passes. The workflow completed successfully; the
actual API [run response](run.json) preserves that conclusion separately from the
browser reports. The [job response](jobs.json) retains its observed state at capture.

| Report | Passed / failed | Artifact ID | Report SHA-256 |
| --- | --- | --- | --- |
| [Original walk](original/browser-result.json) | 133 / 0 | 12202965423 | `83cdecf2ea57ac0a69ebed890dfa5be32ae9d7da221e58ff11c181571aab38d1` |
| [Perspective](perspective/perspective-result.json) | 80 / 0 | 12202405568 | `29aa6f6cf875a5d53ac6a7fcf813e8dea9c9ee2f3d76061669f60748413ca09f` |
| [Travel companion](travel/travel-result.json) | 73 / 0 | 12200222922 | `8abcc2e1069d41fe2b00a9fe65e52c3aa353ef34f1bb340bc144b11a32c1322a` |
| [Homepage](homepage/homepage-result.json) | 65 / 0 | 12200887195 | `ed47dd796f12115c07fe6c6ef2f281695dd319d36acb9bf1c2886bea0abd2a48` |
| [Solo](solo/solo-result.json) | 75 / 0 | 12200982338 | `00551194410dff142cb6cf418295cae6e2caa4e5fd98bab1cf2f43744fae0c2d` |
| [Reviewed packs](packs/packs-result.json) | 75 / 0 | 12201711511 | `371b9ca7eb2be77b5501f5470cd5397488091ac78e2d9b13fe871a1cf51fc9ca` |
| [Extended walkthrough](walkthrough/walkthrough-result.json) | 264 / 0 | 12201987881 | `7823046f6d94f9f79ef872e4f4675ef0439f4d85291886758ce8592f9fd94ec4` |

Counts overlap and remain separate. These are unchanged downloaded JSON reports;
their screenshot paths refer to the corresponding full GitHub artifact archives.
Local final screenshots are retained separately under `../final/` and `../art/`.
The actual delayed nearby response is retained beside the pack report. All report
drivers and package file hashes are recorded inside the reports. Successful
requests exercise actual immutable files and real providers; denied/delayed
requests belong to explicitly identified recovery scenarios.
