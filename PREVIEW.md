# Review without a local server

The verified guided 3D build is published as source files on the `gh-pages`
branch at `e7fa424`. It contains the exact distribution tested from application
commit `6641f1a78c4d882741714c444aa8471560a299c1`, plus `.nojekyll` and
`review-build.json`. No additional application changes were made for hosting.

## Activate the playable review link

GitHub Pages is not enabled yet. The connected integration received HTTP 403
when requesting activation, so a repository administrator must do this once:

1. Open [Settings → Pages](https://github.com/PaperStrange/TourGuideAI/settings/pages).
2. Under Build and deployment, set Source to **Deploy from a branch**.
3. Select **gh-pages** and **/ (root)**, then **Save**.
4. Wait for GitHub's Pages deployment to finish and use the live URL shown there.

The repository and resulting Pages site are public. Personal notes are stored
only in each visitor's browser; there is no note-upload or online-sharing service.
The hosted origin starts with its own local save, separate from localhost.

## Visual review available now

- [English opening](https://github.com/PaperStrange/TourGuideAI/blob/6641f1a78c4d882741714c444aa8471560a299c1/experience/evidence/browser/opening-en.png)
- [Chinese bank approach](https://github.com/PaperStrange/TourGuideAI/blob/6641f1a78c4d882741714c444aa8471560a299c1/experience/evidence/browser/south-bank-approach.png)
- [Validation record and further evidence](https://github.com/PaperStrange/TourGuideAI/blob/6641f1a78c4d882741714c444aa8471560a299c1/experience/docs/validation.md)

Screenshots support artwork review. Interaction fluency still needs the playable
site on the reviewer's device. No successful live deployment is claimed yet.
