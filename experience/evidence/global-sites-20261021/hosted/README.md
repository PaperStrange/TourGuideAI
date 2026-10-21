# Published runtime verification

Site: https://paperstrange.github.io/TourGuideAI/

Runtime source: `9f5725d94e5a82e18acdf116e6da8a034c82fe65`.
The tested 95-file package is
`3e72aa1c53596042a14d1fb2aae9556b0a2caa876be93d424ec9ebe2aebb0162`.
CI `39552515626` completed successfully. Pages runtime commit
`17b8f371e0f8a21d990837ea3f5606829a16c784` is published. All **95/95** actual HTTPS
files match in [published-files.json](published-files.json). The actual
[published journey](hosted-packs.json) passes **16/16** checks with zero page
exceptions: model draw, walking, orbit, night, both-area saves/reload/returns,
EN/ZH, actual Maps order, surrounding map and localized Shijō links.
Metadata-only Pages commit `09fec3a` records these results without changing runtime
files. The browser report retains the descriptor captured before that metadata
update. [Night view](ginza-night-en.png) and [saved Chinese return](ginza-return-zh.png)
retain their screenshot hashes and exact states in the report.
The final [published descriptor](review-build.json) was fetched over actual HTTPS
after the metadata deployment and matches the Pages working-tree bytes;
SHA-256 is `a23550c43c75d9632c49e62d8fcec68461f4170f2f14230a1bff88bd98e1412a`.

The file verifier downloads each actual HTTPS file through the inherited proxy
with default TLS verification and compares its bytes and SHA-256 with the tested
distribution. The browser verifier uses the actual public origin, real providers
and no request interception. Its scope is the desktop cross-area journey; packaged
CI separately covers phone, failure and resource scenarios.

Reproduce from the repository root after publication:

```sh
node experience/tools/verify-published.mjs experience/dist \
  https://paperstrange.github.io/TourGuideAI/ \
  experience/evidence/global-sites-20261021/hosted/published-files.json

TMPDIR="$PWD/artifacts/tmp" EXPERIENCE_QA_CHROMIUM=/usr/bin/chromium \
  node experience/tools/verify-packs-hosted.mjs \
  https://paperstrange.github.io/TourGuideAI/ artifacts/l21-hosted
```

The recorded hosted run uses system Chromium **151.0.7922.173**, a 1440×1000
viewport and reduced motion. The browser requires write access to the existing
`/home/agent/.pki` certificate store in this sandbox. Read-only access stopped the
initial [bundled](browser-readonly-nss-bundled.json) and
[system](browser-readonly-nss-system.json) Chromium probes at certificate validation
before the homepage loaded. The successful run uses the existing trust configuration, with
no certificate import, proxy bypass or disabled HTTPS verification.

Published saved views stay on their browser/origin. Test records do not establish
real-world visits. These checks do not establish physical-device performance,
human recognition or enjoyment. Q03 remains open P1 under its unchanged protocol.
