# Superseded candidate 12 CI

Run `40062728715` tested source
`06a2c496da689b5c18797b2f77ef1f03cb2857ab`. It was cancelled when candidate 13
started. Six jobs succeeded; the original-walk and connected-neighborhood jobs
were interrupted. No restart was requested.

Six completed browser reports contain **638 passes and zero failures**:
packs 81, homepage 65, perspective 80, solo 75, extended walkthrough 264 and
travel 73. The source-preparation job separately passed 18 workbench tests and
13 neighborhood source tests.

The original-walk partial report contains 80 positive checks and zero negative
checks. The neighborhood partial report contains 51 positive checks and zero
negative checks. Neither has a final summary or completion timestamp. The
neighborhood reached Nishiki Market through actual walking and retry, completed
visible market inspection, and was interrupted during the outbound Tenmangū
leg. Its five recorded captures are preserved unchanged under `captures/`.
These partial counts do not establish completion of either suite.

All eight ZIP SHA-256 digests and sizes match GitHub artifact metadata. Each
report binds the same 446-file CI package:
`7b5e6fc65c83944294aaa41bf98f4f843a58185f8f5d336444ba9f94b45ab106`.
The retained local package is
`e86aa1c715fb76cd111feae41a0383ee34005aefd64fe5c48eba7615676e5733`.
Every path is present and **425 files match exactly**. The remaining 21 files
are JavaScript source maps. Parsing each local map and changing only `sources[]`
prefixes from `../../../../experience/` to `../../` reproduces the corresponding
CI size and SHA-256 exactly. Source contents, mappings and all executable,
HTML/CSS/font/model/image/data bytes are preserved. Full package identities
remain distinct.

[verification.json](verification.json) records every artifact ID/digest,
original report hash, completion scope, exact source driver/helper checks,
capture hashes and per-map proof. Each retained local map, complete original
report, executed source/helper, verification script, local package manifest and
source-job log is losslessly compressed. [observed-run.json](observed-run.json)
contains the observed cancelled job metadata. Signed temporary download URLs
are excluded. Raw ZIPs remain in
`artifacts/neighborhood-20261024/ci/candidate-12/`.

The interrupted neighborhood report decoded SHA-256 is
`141c0ac1b10b89266fa5afdb1c936f40a66301db071de5fa6c6124038a8296a2`;
the original-walk partial report is
`58022397175d840934c231c4d5e1c3cb64e163fa79be62756bc688dee4417d25`.
Current candidate 13 results are recorded separately.
