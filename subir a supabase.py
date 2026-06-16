"""
LoteFinder — Subir propiedades a Supabase
Lee el archivo properties.json y sube todas las propiedades a la base de datos.

Uso:
    pip install supabase
    python subir_a_supabase.py
"""

import json
import os
from datetime import datetime

# ── CONFIGURACIÓN SUPABASE ────────────────────────────────────────────────────
SUPABASE_URL = "https://btfnwarqfbzmmodcghmz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Zm53YXJxZmJ6bW1vZGNnaG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDk5ODgsImV4cCI6MjA5NzEyNTk4OH0.iuyeTL3BB2MYi1E5RrKC62MbuSS2MiUTcdYDa2hnT4c"

def subir_propiedades():
    try:
        from supabase import create_client
    except ImportError:
        print("❌ Falta instalar supabase. Corriendo: pip install supabase")
        os.system("py -m pip install supabase")
        from supabase import create_client

    print("🏙️  LoteFinder — Subiendo propiedades a Supabase")
    print("=" * 40)

    # Conectar a Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✓ Conectado a Supabase")

    # Leer properties.json
    try:
        with open("properties.json", "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ No se encontró properties.json")
        print("   Asegurate de correr primero scraper_zonaprop.py")
        return

    propiedades = data.get("propiedades", [])
    print(f"✓ {len(propiedades)} propiedades encontradas en properties.json")

    # Subir cada propiedad
    subidas = 0
    errores = 0

    for p in propiedades:
        try:
            # Preparar el registro para insertar
            registro = {
                "direccion":           p.get("direccion") or p.get("titulo", "")[:200],
                "barrio":              p.get("barrio", "")[:100],
                "tipo":                p.get("tipo", ""),
                "precio_usd":          p.get("precio_usd"),
                "superficie_m2":       p.get("superficie_m2"),
                "descripcion":         (p.get("descripcion") or "")[:1000],
                "url":                 (p.get("url") or "")[:500],
                "fuente":              p.get("fuente", "zonaprop"),
                "duenio_directo":      p.get("duenio_directo", True),
                "urgencia_detectada":  p.get("urgencia_detectada", False),
                "palabras_urgencia":   p.get("palabras_urgencia", []),
                "meses_publicado":     p.get("meses_publicado", 0),
                "score":               p.get("score", 0),
                "score_breakdown":     p.get("score_breakdown", {}),
                "fecha_scraping":      p.get("fecha_scraping") or datetime.now().isoformat(),
                "activa":              True,
                "descartada":          False,
            }

            # Insertar en Supabase
            result = supabase.table("propiedades").insert(registro).execute()
            subidas += 1

            if subidas % 10 == 0:
                print(f"  → {subidas}/{len(propiedades)} subidas...")

        except Exception as e:
            errores += 1
            if errores <= 3:
                print(f"  ⚠ Error en propiedad: {e}")

    print(f"\n✅ Proceso completado:")
    print(f"   Subidas exitosamente: {subidas}")
    print(f"   Errores: {errores}")
    print(f"\n🎉 Ya podés ver las propiedades en:")
    print(f"   https://supabase.com/dashboard/project/btfnwarqfbzmmodcghmz/editor")


if __name__ == "__main__":
    subir_propiedades()
