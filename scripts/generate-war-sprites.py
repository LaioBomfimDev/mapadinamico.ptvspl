"""Original stylized VFX, drawn from mathematical shapes; no external art or API."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import hashlib
import json
import math
import random

OUT = Path(__file__).resolve().parents[1] / "public" / "war-assets"
SIZE, COLS, ROWS, AA = 256, 8, 4, 2
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(22013)
puffs = [(rng.uniform(-1, 1), rng.uniform(-0.5, 0.5), rng.uniform(0.8, 1.2)) for _ in range(11)]
frames = []


def frame_image(index):
    p = index / 31
    im = Image.new("RGBA", (SIZE * AA, SIZE * AA))
    d = ImageDraw.Draw(im)

    def oval(x, y, rx, ry, color):
        d.ellipse(((x-rx)*AA, (y-ry)*AA, (x+rx)*AA, (y+ry)*AA), fill=color)

    def line(points, color, width):
        d.line([(x*AA, y*AA) for x, y in points], fill=color, width=max(1, round(width*AA)))

    fade = max(0, min(1, (1-p)/0.28))
    oval(128, 219, 35 + 45*p, 6 + 5*p, (46, 52, 52, round(36*fade)))
    # Expanding ground ring; no full-frame fill or baked square background.
    if p < 0.48:
        ring = 12 + p * 155
        box = ((128-ring)*AA, (216-ring*0.16)*AA, (128+ring)*AA, (216+ring*0.16)*AA)
        d.ellipse(box, outline=(246, 194, 102, round(170*(1-p/0.48))), width=3*AA)

    # Smoke develops behind the fire, drifts upward and fades to transparency.
    smoke = max(0, min(1, (p-0.16)/0.25))
    for j, (dx, dy, variation) in enumerate(puffs):
        sx = 128 + dx * (18 + p * 45)
        sy = 157 - p * 93 + dy * (18 + p*30) + (j % 3) * 13
        radius = (10 + p * 26) * variation
        alpha = round(180 * smoke * fade)
        oval(sx, sy, radius, radius * 0.95, (74, 91, 99, alpha))
        oval(sx-3, sy-5, radius*0.82, radius*0.77, (129, 145, 148, round(alpha*0.93)))
        if j % 2 == 0:
            oval(sx-7, sy-9, radius*0.43, radius*0.38, (169, 181, 176, round(alpha*0.66)))

    fire = max(0, 1 - p / 0.7)
    fire_alpha = round(255 * min(1, fire * 2.8))
    radius = (12 + 66 * math.sin(min(1, p/0.55)*math.pi/2)) * max(0.12, fire**0.28)
    cy = 187 - p * 70
    if fire > 0:
        # Rounded irregular flame crown, with charcoal outline for toy-scale contrast.
        for j in range(10):
            angle = j / 10 * math.tau
            r = radius * (0.74 + 0.12 * math.sin(j*2.7))
            sx, sy = 128 + math.cos(angle)*r*0.66, cy + math.sin(angle)*r*0.61
            oval(sx, sy, radius*0.43+3, radius*0.46+3, (157, 74, 45, round(fire_alpha*0.92)))
            oval(sx, sy-2, radius*0.42, radius*0.43, (245, 119, 48, fire_alpha))
        oval(128, cy, radius*0.73, radius*0.78, (255, 173, 62, fire_alpha))
        for j in range(6):
            angle = j / 6 * math.tau + 0.3
            oval(128 + math.cos(angle)*radius*.33, cy + math.sin(angle)*radius*.34,
                 radius*.35, radius*.38, (255, 211, 101, fire_alpha))
        oval(127, cy+3, radius*.34, radius*.43, (255, 247, 195, fire_alpha))
        # Short graphic sparks, animated outward rather than stationary texture detail.
        for j in range(9):
            angle = j/9*math.tau + 0.22
            reach = 20 + p*160
            x, y = 128+math.cos(angle)*reach, cy+math.sin(angle)*reach*.75
            if 8 < x < 248 and 8 < y < 230:
                length = 3 + 8*fire
                line([(x, y), (x+math.cos(angle)*length, y+math.sin(angle)*length)],
                     (255, 220, 132, round(fire_alpha*.9)), 2.2)

    # A brief bright flash in the first four frames.
    if index < 4:
        r = 5 + index * 5
        points = []
        for j in range(16):
            a, length = j/16*math.tau, r*(1.7 if j % 2 == 0 else .45)
            points.append(((128+math.cos(a)*length)*AA, (187+math.sin(a)*length)*AA))
        d.polygon(points, fill=(255, 252, 212, 255))
    return im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


for i in range(32):
    frames.append(frame_image(i))

atlas = Image.new("RGBA", (SIZE*COLS, SIZE*ROWS))
for i, im in enumerate(frames):
    atlas.paste(im, ((i % COLS)*SIZE, (i // COLS)*SIZE))
atlas.save(OUT / "explosions.png", optimize=True)

preview = Image.new("RGB", (4*SIZE, 2*(SIZE+30)), "#e9eee9")
pd = ImageDraw.Draw(preview)
for cell, index in enumerate([0, 3, 7, 11, 15, 20, 25, 30]):
    x, y = (cell % 4)*SIZE, (cell//4)*(SIZE+30)
    for a in range(0, SIZE, 16):
        for b in range(0, SIZE, 16):
            color = "#dce5e2" if (a//16+b//16) % 2 else "#eef2ec"
            pd.rectangle((x+a, y+b, x+a+15, y+b+15), fill=color)
    preview.paste(frames[index], (x, y), frames[index])
    pd.text((x+12, y+SIZE+8), f"QUADRO {index+1:02d} / 32", fill="#35505b")
preview.save(OUT / "explosion-contact-sheet.png", optimize=True)

gif_frames = []
for im in frames:
    bg = Image.new("RGB", (SIZE, SIZE), "#dce8dc")
    bg.paste(im, (0, 0), im)
    gif_frames.append(bg)
gif_frames[0].save(OUT / "explosion-preview.gif", save_all=True, append_images=gif_frames[1:], duration=40, loop=0, disposal=2)
frames[7].save(OUT / "explosion-preview.png", optimize=True)

manifest = {
    "name": "Projeto 2 — explosão de miniatura",
    "origin": "Original procedural drawing for this project; no external image, remote generation or paid credit.",
    "generator": "scripts/generate-war-sprites.py",
    "seed": 22013,
    "atlas": {"file": "explosions.png", "width": SIZE*COLS, "height": SIZE*ROWS, "columns": COLS, "rows": ROWS, "frames": 32, "frameWidth": SIZE, "frameHeight": SIZE, "order": "left to right, top to bottom", "fps": 25, "durationSeconds": 1.28, "transparent": True, "pivot": [0.5, 0.85]},
    "files": [],
}
for name in ["explosions.png", "explosion-contact-sheet.png", "explosion-preview.gif", "explosion-preview.png"]:
    content = (OUT / name).read_bytes()
    manifest["files"].append({"file": name, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
(OUT / "sprites-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

assert atlas.mode == "RGBA" and atlas.size == (2048, 1024)
assert atlas.getpixel((0, 0))[3] == 0
assert frames[-1].getextrema()[3][1] == 0
print(f"Generated 32 original RGBA frames, atlas {atlas.size}, {len((OUT/'explosions.png').read_bytes())} bytes.")
