# Candidate 3 inspection and camera verification

The frozen 299-file package `4fbeebdbde8ba750f619a0fc5c3e15637a49cdb92e90e22f376c41ce8d8c7922` ran from `artifacts/neighborhood-20261023/candidate-3`, on source `9a3b9e8d7e9f8ae078d4671117fc87c295ef7af0`. Scenery remains bound to manifest `90c0873c5e540147630c970d4a2ea692c1583b3c407c175a2659d4e1e93934c8`.

All **53 focused checks passed** in 386.849 seconds, from `2026-10-23T03:06:35.000Z` to `2026-10-23T03:13:01.849Z`. The [exact report](neighborhood-result.json.gz) has decoded SHA256 `4c61741481c8ecd6583689ac5babbbea698cb8068d2fa5bbd506562a8804ba13`. The [executed driver](browser-neighborhood.mjs.gz) has decoded SHA256 `b229277589539aad59d331b750e1bc508514e6b1fed7bef12fe74d162269b2b0`.

## Actual inputs and results

- A genuine Market surface was found through deliberate keyboard framing and native pointer movement. Clicking the observed surface selected `shijo-east:nishiki-market` while retaining the player position.
- In normal and reduced motion, a mouse click and a single touch tap on ground remained stationary during Look closer. Saved and rendered camera poses remained unchanged. Escape preserved the camera ray; applying the same input at that ground point subsequently produced actual grounded walking.
- Revised English and Chinese touch instructions explain choosing Keep walking to move. Actual locale taps retained touch guidance, visible text fitted its element, and the player stayed stationary.
- Native wheel, drag and keyboard camera adjustments began from the recovered rendered pose. Horizontal middle-button drags and three-finger movements left the pose and inspection aiming state unchanged. Recorded native events establish pointer types, button state, touch count and trusted delivery.
- Both motion settings settled through actual update-frame observations. Hidden Together scenes produced zero scene updates, renders or new section requests during two seconds. Returning retained the saved view and night lighting. Legacy storage bytes remained unchanged.
- Packaged gzip transport and decoded identities passed the existing preflight checks. No page exceptions or unexpected network origins occurred.

## Evidence boundaries

This run uses the exact previously visited interior position, with its public journey session wrapper recorded in the report. It verifies the corrected inspection interaction and affected camera paths. [Candidate 2](../candidate-2/README.md) retains its 67 passing checks and two failing inspection-click checks, including actual approach/interior walking, rendered-direction movement, and river day/night resource evidence. Its failed report remains unchanged.

The browser was Chromium 151.0.7922.34 at 1440×1000. Native-input cases used an explicitly touch-capable desktop context and both `no-preference` and `reduce` motion settings. Actual software-rendered browser results do not establish physical-device fluency or human enjoyment. The broader full-route CI remains a separate final-package gate.

Raw report and ten screenshots are retained at `artifacts/neighborhood-20261023/qa/candidate-3-input/`. Portable captures include the selected source feature and English/Chinese touch guidance. Reproduction uses the retained driver at `experience/tests/browser-neighborhood.mjs`, `EXPERIENCE_QA_ONLY=arcade-inspection,recovered-camera-input`, the immutable candidate3 build, an explicit output directory, repository-local `TMPDIR`, and the existing proxy/certificate configuration.
