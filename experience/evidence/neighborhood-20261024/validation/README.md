# Candidate 10 local validation

The canonical build is frozen at `artifacts/neighborhood-20261024/candidate-10`:
446 files, 96,790,615 bytes, package SHA256
`afc7934f1b0706ea59caae5e4b1a97a6a3f6366ac65b24cbe79bfc2c2d94e574`.
Scenery manifest SHA256:
`e58257879fb4ead8af14022e71e329ee3309f9920eec6fe2cf4717276573d108`.

Application tests pass **203/203**, repository gates pass **17/17**, and the
canonical Vite production build succeeds. Gzip files preserve the original output:

| Output | Decoded SHA256 |
| --- | --- |
| `app-tests.txt.gz` | `97561a80106de31ab019bc0a9e5061a698b6983c0d8878ff2199ce061f3e516a` |
| `build.txt.gz` | `c9a472f87d7e95678a7c61d844104fcaa4e471f7f85f142b5cce78d7349f7b51` |
| `gates.txt.gz` | `43a16b6a9e37d69799f7f711f656ea8ae0dc879d15558f6b93f7d192cf632332` |

The build includes source-supported torii paper and pavement-boundary refinements,
scene invalidation limited to visual changes, and preview-copy updates limited to
changes in visible stream status or retry availability. Streaming and walking
state notifications remain current. The independent world audit binds the exact
promoted asset directory; the prior public directory remains preserved under
`artifacts/neighborhood-20261024/candidate-9-public-before-refinement`.

Native appearance, error/recovery and measured performance acceptance are separate.
Candidate 9's completed full-route CI retains its original package identity.
