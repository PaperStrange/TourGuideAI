import json
import sys

import lxml
from lxml import etree, html


before = html.parse(sys.argv[1])
after = html.parse(sys.argv[2])
assert before.docinfo.doctype == after.docinfo.doctype
assert before.xpath('//link[@rel="icon"]') == []
icons = after.xpath('//link[@rel="icon"]')
assert len(icons) == 1
icon = icons[0]
assert dict(icon.attrib) == {
    "rel": "icon",
    "type": "image/svg+xml",
    "href": "./" + sys.argv[3],
}
assert icon.getparent().tag == "head"
icon.getparent().remove(icon)
identical = etree.tostring(before, method="html") == etree.tostring(after, method="html")
assert identical
print(json.dumps({
    "library": "lxml",
    "version": lxml.__version__,
    "addedIcon": sys.argv[3],
    "remainingDocumentIdentical": identical,
}))
