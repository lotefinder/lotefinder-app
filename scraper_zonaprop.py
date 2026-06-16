"""
LoteFinder — Scraper ZonaProp
Extrae propiedades de dueño directo en venta en CABA.
Detecta señales de oportunidad: tiempo publicado, urgencia en texto, precio, superficie.

Uso:
    pip install requests beautifulsoup4 lxml
    python scraper_zonaprop.py

Salida:
    properties.json  — lista de propiedades con señales detectadas
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
from datetime import datetime

# ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────

BASE_URL = "https://www.zonaprop.com.ar"

# URLs a scrapear — dueño directo, venta, CABA
URLS = {
    "todos":    "/inmuebles-venta-capital-federal-dueno-directo.html",
    "casas":    "/casas-venta-capital-federal-dueno-directo.html",
    "ph":       "/ph-venta-capital-federal-dueno-directo.html",
    "locales":  "/locales-comerciales-venta-capital-federal-dueno-directo.html",
}

# Headers para simular un navegador real
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-AR,es;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Palabras que indican urgencia en la descripción
PALABRAS_URGENCIA = [
    "urge", "urgente", "oportunidad", "liquido", "liquida", "acepto oferta",
    "negociable", "permuto", "permuta", "viaje", "necesito vender",
    "precio a convenir", "dueño viaja", "particular vende", "sin intermediarios",
    "trato directo", "rebajado", "precio rebajado", "última oportunidad"
]

# ── FUNCIONES AUXILIARES ──────────────────────────────────────────────────────

def limpiar_precio(texto):
    """Extrae el precio numérico en USD de un string como 'USD 210.000'"""
    if not texto:
        return None
    match = re.search(r'[\d\.]+', texto.replace(",", ""))
    if match:
        try:
            return int(match.group().replace(".", ""))
        except:
            return None
    return None

def limpiar_superficie(texto):
    """Extrae m² de un string como '180 m² tot.'"""
    if not texto:
        return None
    match = re.search(r'(\d+)\s*m²', texto)
    return int(match.group(1)) if match else None

def detectar_urgencia(descripcion):
    """Detecta palabras de urgencia en la descripción del aviso"""
    if not descripcion:
        return False, []
    desc_lower = descripcion.lower()
    encontradas = [p for p in PALABRAS_URGENCIA if p in desc_lower]
    return len(encontradas) > 0, encontradas

def extraer_barrio(texto_ubicacion):
    """Extrae el barrio del texto de ubicación 'Barrio, Capital Federal'"""
    if not texto_ubicacion:
        return "CABA"
    partes = texto_ubicacion.split(",")
    return partes[0].strip() if partes else texto_ubicacion.strip()

def calcular_score_preliminar(prop):
    """
    Score preliminar basado solo en los datos de ZonaProp.
    (Deuda ABL y sucesión se agregan después desde AGIP y Boletín Oficial)
    """
    score = 0
    breakdown = {}

    # Dueño directo (ya filtrado en la URL, siempre true acá)
    breakdown["duenio_directo"] = 20
    score += 20

    # Tiempo publicado
    meses = prop.get("meses_publicado", 0)
    if meses >= 12:
        breakdown["tiempo_venta"] = 20
        score += 20
    elif meses >= 6:
        breakdown["tiempo_venta"] = 12
        score += 12
    elif meses > 0:
        breakdown["tiempo_venta"] = 5
        score += 5
    else:
        breakdown["tiempo_venta"] = 0

    # Urgencia en descripción
    if prop.get("urgencia_detectada"):
        breakdown["urgencia_texto"] = 15
        score += 15
    else:
        breakdown["urgencia_texto"] = 0

    prop["score"] = score
    prop["score_breakdown"] = breakdown
    return prop

# ── SCRAPER PRINCIPAL ─────────────────────────────────────────────────────────

def scrapear_pagina(url_path, tipo="todos", pagina=1):
    """Scrapea una página de resultados de ZonaProp"""

    # Construir URL con paginación
    if pagina > 1:
        url_path_paginado = url_path.replace(".html", f"-pagina-{pagina}.html")
    else:
        url_path_paginado = url_path

    url = BASE_URL + url_path_paginado
    print(f"  → Fetching: {url}")

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  ✗ Error al acceder a {url}: {e}")
        return [], False

    soup = BeautifulSoup(resp.text, "lxml")
    propiedades = []

    # ZonaProp carga propiedades en divs con data-id o clases específicas
    # Buscar los postings
    listings = soup.find_all("div", attrs={"data-id": True})

    # Fallback: buscar por clase
    if not listings:
        listings = soup.find_all("div", class_=re.compile(r"(postingCard|listing-item|property-card)", re.I))

    if not listings:
        # Intentar con script JSON embebido (ZonaProp a veces usa Next.js)
        scripts = soup.find_all("script", type="application/json")
        for script in scripts:
            try:
                data = json.loads(script.string or "")
                # Buscar lista de propiedades en la estructura JSON
                if isinstance(data, dict):
                    props_raw = (
                        data.get("props", {})
                           .get("pageProps", {})
                           .get("initialProps", {})
                           .get("realEstates", [])
                    )
                    if props_raw:
                        for p in props_raw:
                            prop = parsear_json_property(p, tipo)
                            if prop:
                                propiedades.append(prop)
                        break
            except (json.JSONDecodeError, AttributeError):
                continue

    # Parsear listings HTML clásicos
    for listing in listings:
        prop = parsear_html_listing(listing, tipo)
        if prop:
            propiedades.append(prop)

    # Verificar si hay página siguiente
    siguiente = soup.find("a", attrs={"aria-label": re.compile(r"siguiente|next", re.I)})
    hay_siguiente = siguiente is not None

    print(f"  ✓ {len(propiedades)} propiedades encontradas en página {pagina}")
    return propiedades, hay_siguiente


def parsear_html_listing(div, tipo):
    """Extrae datos de un div de listing HTML de ZonaProp"""
    try:
        prop = {
            "fuente": "zonaprop",
            "tipo": tipo,
            "duenio_directo": True,
            "fecha_scraping": datetime.now().isoformat(),
        }

        # ID único
        prop["id_externo"] = div.get("data-id") or div.get("data-posting-id") or ""

        # Precio
        precio_div = (
            div.find(class_=re.compile(r"price|precio", re.I)) or
            div.find("span", string=re.compile(r"USD|U\$S|\$", re.I))
        )
        prop["precio_texto"] = precio_div.get_text(strip=True) if precio_div else ""
        prop["precio_usd"] = limpiar_precio(prop["precio_texto"])

        # Título / descripción corta
        titulo = div.find(class_=re.compile(r"title|titulo|description", re.I))
        prop["titulo"] = titulo.get_text(strip=True) if titulo else ""

        # Dirección
        dir_div = div.find(class_=re.compile(r"address|direccion|location|ubicacion", re.I))
        prop["direccion"] = dir_div.get_text(strip=True) if dir_div else ""

        # Barrio
        barrio_div = div.find(class_=re.compile(r"barrio|neighborhood|zone", re.I))
        if barrio_div:
            prop["barrio"] = barrio_div.get_text(strip=True)
        else:
            prop["barrio"] = extraer_barrio(prop["direccion"])

        # Superficie
        sup_span = div.find(string=re.compile(r"m²|m2", re.I))
        prop["superficie_m2"] = limpiar_superficie(str(sup_span)) if sup_span else None

        # Link al aviso
        link = div.find("a", href=True)
        prop["url"] = BASE_URL + link["href"] if link and link["href"].startswith("/") else (link["href"] if link else "")

        # Descripción larga (si está en el card)
        desc_div = div.find(class_=re.compile(r"description|descripcion|body", re.I))
        prop["descripcion"] = desc_div.get_text(strip=True) if desc_div else prop["titulo"]

        # Detectar urgencia
        texto_completo = f"{prop['titulo']} {prop['descripcion']}".lower()
        prop["urgencia_detectada"], prop["palabras_urgencia"] = detectar_urgencia(texto_completo)

        # Meses publicado (ZonaProp a veces lo muestra)
        tiempo_div = div.find(string=re.compile(r"hace \d+|publicado", re.I))
        prop["meses_publicado"] = extraer_meses(str(tiempo_div)) if tiempo_div else 0

        # Calcular score preliminar
        prop = calcular_score_preliminar(prop)

        return prop if prop.get("precio_usd") or prop.get("direccion") else None

    except Exception as e:
        print(f"    ⚠ Error parseando listing: {e}")
        return None


def parsear_json_property(data, tipo):
    """Extrae datos de un objeto JSON de ZonaProp (formato Next.js)"""
    try:
        prop = {
            "fuente": "zonaprop",
            "tipo": tipo,
            "duenio_directo": True,
            "fecha_scraping": datetime.now().isoformat(),
        }

        prop["id_externo"] = str(data.get("id", ""))
        prop["titulo"] = data.get("title", "") or data.get("description", "")
        prop["descripcion"] = data.get("description", "")

        # Precio
        prices = data.get("prices", [{}])
        if prices:
            p = prices[0]
            prop["precio_usd"] = p.get("amount")
            prop["precio_texto"] = f"{p.get('currency', 'USD')} {p.get('amount', '')}"
        else:
            prop["precio_usd"] = None
            prop["precio_texto"] = ""

        # Ubicación
        loc = data.get("postingLocation", {}) or {}
        address = loc.get("address", {}) or {}
        prop["direccion"] = address.get("name", "") or address.get("streetName", "")
        prop["barrio"] = (
            loc.get("subdivision", {}) or {}
        ).get("name", "") or "CABA"
        prop["lat"] = loc.get("lat")
        prop["lng"] = loc.get("lon")

        # Superficie
        features = data.get("mainFeatures", []) or []
        for feat in features:
            if "m²" in str(feat.get("label", "")):
                prop["superficie_m2"] = limpiar_superficie(feat.get("label", ""))

        # URL
        prop["url"] = BASE_URL + data.get("url", "")

        # Urgencia
        prop["urgencia_detectada"], prop["palabras_urgencia"] = detectar_urgencia(prop["descripcion"])
        prop["meses_publicado"] = 0  # Se puede calcular con createdAt si está disponible

        # Score
        prop = calcular_score_preliminar(prop)

        return prop

    except Exception as e:
        print(f"    ⚠ Error parseando JSON property: {e}")
        return None


def extraer_meses(texto):
    """Convierte 'hace 3 meses' o 'hace 1 año' a número de meses"""
    if not texto:
        return 0
    texto = texto.lower()
    match_meses = re.search(r'hace (\d+) mes', texto)
    match_anios = re.search(r'hace (\d+) año', texto)
    if match_anios:
        return int(match_anios.group(1)) * 12
    if match_meses:
        return int(match_meses.group(1))
    return 0


# ── RUNNER PRINCIPAL ──────────────────────────────────────────────────────────

def correr_scraper(max_paginas=3):
    """
    Corre el scraper sobre todas las URLs configuradas.
    max_paginas: cuántas páginas por URL (cada página ~20 propiedades)
    """
    todas = []
    ids_vistos = set()

    for tipo, url_path in URLS.items():
        print(f"\n📋 Scrapeando: {tipo}")

        for pagina in range(1, max_paginas + 1):
            props, hay_siguiente = scrapear_pagina(url_path, tipo, pagina)

            for p in props:
                id_key = p.get("id_externo") or p.get("url") or p.get("direccion")
                if id_key and id_key not in ids_vistos:
                    ids_vistos.add(id_key)
                    todas.append(p)

            # Respetar el servidor — esperar entre requests
            time.sleep(2)

            if not hay_siguiente:
                break

    # Ordenar por score descendente
    todas.sort(key=lambda x: x.get("score", 0), reverse=True)

    return todas


def guardar_resultados(propiedades, archivo="properties.json"):
    """Guarda los resultados en JSON"""
    output = {
        "fecha": datetime.now().isoformat(),
        "total": len(propiedades),
        "fuente": "zonaprop",
        "propiedades": propiedades
    }
    with open(archivo, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n✅ {len(propiedades)} propiedades guardadas en {archivo}")


# ── MAIN ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🏙️  LoteFinder — Scraper ZonaProp")
    print("=" * 40)

    propiedades = correr_scraper(max_paginas=3)

    guardar_resultados(propiedades)

    # Preview de las 5 mejores
    print("\n🏆 Top 5 oportunidades detectadas:")
    for i, p in enumerate(propiedades[:5], 1):
        urgencia = "⚡ URGENTE" if p.get("urgencia_detectada") else ""
        print(f"\n  {i}. {p.get('direccion') or p.get('titulo', 'Sin dirección')}")
        print(f"     Barrio: {p.get('barrio')} | Precio: {p.get('precio_texto')} | Score: {p.get('score')} {urgencia}")
        if p.get("palabras_urgencia"):
            print(f"     Palabras clave: {', '.join(p['palabras_urgencia'])}")
