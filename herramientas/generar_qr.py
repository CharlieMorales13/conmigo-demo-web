"""QR de la demo web con el oso de ConMigo al centro (ADR 0010).

    python demo_web/herramientas/generar_qr.py [url] [salida.png]

Corrección de errores alta (H, ~30 %): el oso tapa menos de eso y el QR se
sigue leyendo. Pruébalo con varios celulares antes de imprimirlo.
"""

import sys
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw

URL = "https://conmigo-db4e3.web.app"
LOGO = Path(__file__).parents[2] / "assets/iconos/logo_conmigo.png"
FRACCION_OSO = 0.375  # el oso ocupa la parte izquierda del logo (sin el texto)
LADO_LOGO = 0.26  # del lado del QR; con corrección H basta y sobra
AZUL_MARINO = "#0E2A47"
PIXELES_POR_MODULO = 20


def oso() -> Image.Image:
    logo = Image.open(LOGO).convert("RGBA")
    recorte = logo.crop((0, 0, round(logo.width * FRACCION_OSO), logo.height))
    return recorte.crop(recorte.getbbox())


def generar(url: str) -> Image.Image:
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=PIXELES_POR_MODULO,
        border=4,
    )
    qr.add_data(url)
    imagen = qr.make_image(fill_color=AZUL_MARINO, back_color="white").convert("RGBA")
    lado = round(imagen.width * LADO_LOGO)
    figura = oso()
    figura.thumbnail((lado * 0.85, lado * 0.85), Image.LANCZOS)
    fondo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    ImageDraw.Draw(fondo).rounded_rectangle(
        (0, 0, lado - 1, lado - 1), lado // 5, fill="white"
    )
    fondo.alpha_composite(
        figura, ((lado - figura.width) // 2, (lado - figura.height) // 2)
    )
    imagen.alpha_composite(
        fondo, ((imagen.width - lado) // 2, (imagen.height - lado) // 2)
    )
    return imagen.convert("RGB")


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else URL
    salida = Path(sys.argv[2] if len(sys.argv) > 2 else "qr_demo_conmigo.png")
    generar(url).save(salida)
    print(f"{url} -> {salida}")
