"""Subset known application copy from installed Noto CJK SC; user-entered text uses font fallbacks."""
import argparse
import hashlib
import json
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

parser = argparse.ArgumentParser()
parser.add_argument('--source', default='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
paths = [root / 'src/ui/i18n.js', root / 'src/content/kyoto.js', *sorted((root / 'src/app').glob('*.js'))]
characters = set(''.join(p.read_text() for p in paths)) | set(chr(i) for i in range(32, 127))
options = subset.Options()
options.flavor = 'woff'
font = TTFont(args.source, fontNumber=2)
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes={ord(c) for c in characters})
subsetter.subset(font)
font.flavor = 'woff'
out = root / 'src/ui/assets/kyoto-sans.woff'
font.save(out)
missing = sorted(ord(c) for c in characters if ord(c) > 31 and ord(c) not in font.getBestCmap())
assert not missing, f'Missing source-copy glyphs: {missing}'
manifest = {'source':'NotoSansCJK-Regular.ttc, face 2 (Simplified Chinese)',
 'sourceSha256':hashlib.sha256(Path(args.source).read_bytes()).hexdigest(),
 'sources':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
 'output':'src/ui/assets/kyoto-sans.woff', 'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
 'bytes':out.stat().st_size, 'glyphCoverage':'Known EN/ZH UI and content; arbitrary personal-note characters may use the declared system font fallbacks.',
 'missingSourceGlyphs':missing}
(out.parent / 'font-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'bytes':out.stat().st_size,'missingSourceGlyphs':missing}))
