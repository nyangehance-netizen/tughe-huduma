"""Replace Capacitor's default Android icons and splash screens with TUGHE branding.

Run after `npx cap add android`:  python3 make_icons.py <logo.png>
"""
import pathlib
import sys

from PIL import Image

BLUE = (45, 53, 151, 255)  # TUGHE logo blue #2D3597
if len(sys.argv) > 2:  # optional splash colour, e.g. "#1B2160" for the officers' app
    h = sys.argv[2].lstrip("#"); BLUE = (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
WHITE = (255, 255, 255, 255)

logo = Image.open(sys.argv[1]).convert("RGBA")
res = pathlib.Path("android/app/src/main/res")

DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def circle_mask(size: int) -> Image.Image:
    from PIL import ImageDraw
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size - 1, size - 1), fill=255)
    return m


def fitted(size: int) -> Image.Image:
    """The round logo, cut to a circle so its square white corners don't show."""
    img = logo.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), circle_mask(size))
    return out


for name, scale in DENSITIES.items():
    folder = res / f"mipmap-{name}"
    folder.mkdir(parents=True, exist_ok=True)

    # Legacy square icon (48dp): logo on white
    n = round(48 * scale)
    sq = Image.new("RGBA", (n, n), WHITE)
    pad = round(n * 0.06)
    sq.alpha_composite(fitted(n - 2 * pad), (pad, pad))
    sq.convert("RGB").save(folder / "ic_launcher.png")

    # Legacy round icon
    rnd = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    rnd.paste(sq, (0, 0), circle_mask(n))
    rnd.save(folder / "ic_launcher_round.png")

    # Adaptive icon foreground (108dp canvas, logo inside the 66dp safe zone)
    f = round(108 * scale)
    fg = Image.new("RGBA", (f, f), (0, 0, 0, 0))
    inner = round(f * 0.62)
    fg.alpha_composite(fitted(inner), ((f - inner) // 2, (f - inner) // 2))
    fg.save(folder / "ic_launcher_foreground.png")

# Adaptive icon background colour: white
values = res / "values"
values.mkdir(parents=True, exist_ok=True)
(values / "ic_launcher_background.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n'
)

# Splash screens: logo on a white disc over TUGHE blue, at every size Capacitor generated
count = 0
for splash in res.rglob("splash.png"):
    w, h = Image.open(splash).size
    img = Image.new("RGBA", (w, h), BLUE)
    d = round(min(w, h) * 0.42)
    from PIL import ImageDraw
    disc = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse((0, 0, d - 1, d - 1), fill=WHITE)
    inner = round(d * 0.92)
    disc.alpha_composite(fitted(inner), ((d - inner) // 2, (d - inner) // 2))
    img.alpha_composite(disc, ((w - d) // 2, (h - d) // 2))
    img.convert("RGB").save(splash)
    count += 1

print(f"icons written for {len(DENSITIES)} densities, {count} splash images replaced")
