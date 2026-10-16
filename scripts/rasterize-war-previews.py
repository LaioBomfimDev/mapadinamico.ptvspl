"""Render the exporter-generated orthographic triangle SVGs with Pillow, offline."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import xml.etree.ElementTree as ET

PREVIEWS = Path(__file__).resolve().parents[1] / "public" / "war-assets" / "previews"
AA = 3
try:
    heading = ImageFont.truetype("arialbd.ttf", 20*AA)
    caption = ImageFont.truetype("arial.ttf", 11*AA)
except OSError:
    heading = ImageFont.load_default(size=20*AA)
    caption = ImageFont.load_default(size=11*AA)

for source in sorted(PREVIEWS.glob("*.svg")):
    tree = ET.parse(source)
    output = Image.new("RGB", (320*AA, 338*AA), "#e4eee0")
    draw = ImageDraw.Draw(output)
    for element in tree.getroot():
        tag = element.tag.rsplit("}", 1)[-1]
        if tag == "ellipse":
            x, y, rx, ry = [float(element.attrib[a])*AA for a in ["cx", "cy", "rx", "ry"]]
            draw.ellipse((x-rx, y-ry, x+rx, y+ry), fill=element.attrib["fill"])
        elif tag == "polygon":
            points = [tuple(float(c)*AA for c in pair.split(",")) for pair in element.attrib["points"].split()]
            draw.polygon(points, fill=element.attrib["fill"])
        elif tag == "text":
            font = heading if float(element.attrib["font-size"]) > 15 else caption
            x = float(element.attrib["x"])*AA
            # Pillow anchor mm is more predictable across fonts than an SVG baseline.
            y = (float(element.attrib["y"])-6)*AA
            draw.text((x,y), element.text or "", fill=element.attrib["fill"], font=font, anchor="mm")
    output.resize((320,338), Image.Resampling.LANCZOS).save(source.with_suffix(".png"), optimize=True)
    print(source.with_suffix(".png").name)

paths = [PREVIEWS / f"{kind}.png" for kind in ["infantry", "tank", "artillery", "drone", "aircraft"]]
contact = Image.new("RGB", (320*5, 338), "#e4eee0")
for i, source in enumerate(paths):
    with Image.open(source) as im:
        contact.paste(im, (320*i,0))
contact.save(PREVIEWS / "miniaturas.png", optimize=True)
