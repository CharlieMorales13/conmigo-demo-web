"""QR de la demo web con el logo completo de ConMigo al centro (ADR 0010).

    python herramientas/generar_qr.py [url] [salida.png]

Corrección de errores alta (H, ~30 %). El logo mide 45 % del ancho y tapa ~18 %
del código: se leyó reducido al 20 % y desenfocado; con 55 % ya no se lee.
Pruébalo con varios celulares antes de imprimirlo.
"""

import sys
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw

URL = "https://conmigo-demo-web.carlos-gomez-dev13.workers.dev/"
LOGO = Path(__file__).parents[1] / "public/logo_conmigo.png"
ANCHO_LOGO = 0.45  # del lado del QR; 0.55 ya no se lee
MARGEN_LOGO = 0.02  # borde blanco alrededor del logo, del lado del QR
AZUL_MARINO = "#0E2A47"
PIXELES_POR_MODULO = 20


def logo() -> Image.Image:
    imagen = Image.open(LOGO).convert("RGBA")
    return imagen.crop(imagen.getchannel("A").getbbox())


def generar(url: str) -> Image.Image:
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=PIXELES_POR_MODULO,
        border=4,
    )
    qr.add_data(url)
    imagen = qr.make_image(fill_color=AZUL_MARINO, back_color="white").convert("RGBA")
    figura = logo()
    figura.thumbnail((round(imagen.width * ANCHO_LOGO), imagen.width), Image.LANCZOS)
    margen = round(imagen.width * MARGEN_LOGO)
    ancho, alto = figura.width + 2 * margen, figura.height + 2 * margen
    fondo = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    ImageDraw.Draw(fondo).rounded_rectangle(
        (0, 0, ancho - 1, alto - 1), min(ancho, alto) // 5, fill="white"
    )
    fondo.alpha_composite(figura, (margen, margen))
    imagen.alpha_composite(
        fondo, ((imagen.width - ancho) // 2, (imagen.height - alto) // 2)
    )
    return imagen.convert("RGB")


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else URL
    salida = Path(sys.argv[2] if len(sys.argv) > 2 else "qr_demo_conmigo.png")
    generar(url).save(salida)
    print(f"{url} -> {salida}")
