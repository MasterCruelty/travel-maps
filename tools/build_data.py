#!/usr/bin/env python3
"""Genera i dati delle mappe (data/<mappa>.json) dai confini ufficiali.

Uso:
    pip install shapely
    python3 tools/build_data.py            # tutte le mappe
    python3 tools/build_data.py milano     # solo alcune

Per ogni mappa:
  1. scarica i confini da fonti pubblicate su GitHub, fissate a un commit;
  2. calcola il grafo dei confini (aree che si toccano);
  3. aggiunge i collegamenti fissi (ponti, tunnel) e, dove previsto, collega
     le parti staccate (isole, exclavi) all'area più vicina;
  4. semplifica le geometrie come "copertura" (i confini condivisi restano
     identici tra aree vicine) e le proietta in coordinate SVG;
  5. ricava per ogni area il punto per l'etichetta e il riquadro (zoom),
     e per ogni gruppo (regione, provincia, continente) il contorno.
"""
import json
import math
import re
import os
import struct
import sys
import urllib.request

import shapely
import shapely.affinity
from shapely.geometry import MultiPolygon, Point, Polygon, shape
from shapely.ops import polylabel, unary_union

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.cache')

# Province e comuni (ISTAT, versione generalizzata) con nomi e codici.
OPENPOLIS = ('https://raw.githubusercontent.com/openpolis/geojson-italy/'
             'ba3347df3a53352891109f8198c597a0273684c0/geojson/')
# Confini comunali ISTAT non generalizzati al 1° gennaio 2026, un file per comune.
# openpolis pubblica solo la versione generalizzata (circa 40 punti per comune):
# per le mappe comunali si prendono da qui le geometrie, da openpolis nomi e codici.
DETAILED_MUNICIPALITIES = ('https://raw.githubusercontent.com/l1n00/confini-comuni-istat/'
                           'bdbd0301e9f8441aa7e762941e7377179c8ce657/dist/2026/comuni/')
# Gli 88 NIL (Nuclei d'Identità Locale), i quartieri del Comune di Milano.
MILANO_NIL = ('https://raw.githubusercontent.com/abahgat/opendata-milano/'
              '1f8d2a7a3cd34b32373568ef055c186fbcdd341f/geojson/quartieri.geojson')
# Distretti tedeschi (Kreise): BKG VG250 al 31.12.2018, Datenlizenz Deutschland
# Namensnennung 2.0, convertiti in GeoJSON da opendatalab-de.
GERMAN_DISTRICTS = ('https://raw.githubusercontent.com/opendatalab-de/simple-geodata-selector/'
                    '309fa25bc9d26d8e560b1ee81de0084a52f7a9e0/src/data/landkreise_sim20.geojson')
# Natural Earth (pubblico dominio): nazioni a 1:50 milioni, Länder a 1:10 milioni.
NATURAL_EARTH = ('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/'
                 'ca96624a56bd078437bca8184e78163e5039ad19/geojson/')

MIN_PART = 0.02      # scarta isolette sotto il 2% dell'area della parte principale
MAX_PARTS = 6


# ---------- Utilità ----------
def fetch(url, name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        print('Scarico', name)
        urllib.request.urlretrieve(url, path)
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    return data['features'] if data.get('type') == 'FeatureCollection' else [data]


def geom(feature):
    return shape(feature['geometry']).buffer(0)


def fmt(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


def polys_of(g):
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [p for p in getattr(g, 'geoms', []) if isinstance(p, Polygon)]


def main_parts(g):
    parts = sorted(polys_of(g), key=lambda p: p.area, reverse=True)
    return [p for p in parts if p.area >= parts[0].area * MIN_PART][:MAX_PARTS]


def components(adj):
    seen, comps = set(), []
    for s in adj:
        if s in seen:
            continue
        stack, comp = [s], set()
        while stack:
            x = stack.pop()
            if x in seen:
                continue
            seen.add(x)
            comp.add(x)
            stack.extend(adj[x] - seen)
        comps.append(comp)
    return sorted(comps, key=len, reverse=True)


def equirectangular(lat0, scale):
    cos = math.cos(math.radians(lat0))
    return lambda lon, lat: (lon * cos * scale, -lat * scale)


def equal_earth(scale):
    a1, a2, a3, a4 = 1.340264, -0.081106, 0.000893, 0.003796
    m = math.sqrt(3) / 2

    def proj(lon, lat):
        t = math.asin(m * math.sin(math.radians(lat)))
        t2, t6 = t * t, t ** 6
        x = math.radians(lon) * math.cos(t) / (m * (a1 + 3 * a2 * t2 + t6 * (7 * a3 + 9 * a4 * t2)))
        y = t * (a1 + a2 * t2 + t6 * (a3 + a4 * t2))
        return x * scale, -y * scale
    return proj


# ---------- Sorgenti per mappa ----------
def load_italia():
    return [{'id': p['prov_acr'], 'name': p['prov_name'], 'group': p['reg_name'], 'geom': geom(f)}
            for f in fetch(OPENPOLIS + 'limits_IT_provinces.geojson', 'limits_IT_provinces.geojson')
            for p in [f['properties']]]


def detailed_municipality(code):
    feature = fetch(f'{DETAILED_MUNICIPALITIES}{code}.geojson', f'comuni/{code}.geojson')[0]
    assert feature['properties']['code'] == code, code
    return geom(feature)


# Nomi dei NIL scritti come li usa il Comune, con le maiuscole corrette.
NIL_NAMES = {
    "CITTA' STUDI": 'Città Studi', "NIGUARDA - CA' GRANDA": "Niguarda - Ca' Granda",
    "PARCO MONLUE' - PONTE LAMBRO": 'Parco Monluè - Ponte Lambro', 'QT 8': 'QT8',
    'XXII MARZO': 'XXII Marzo', 'EX OM - MORIVIONE': 'Ex OM - Morivione',
    'S. CRISTOFORO': 'San Cristoforo', 'S. SIRO': 'San Siro', 'MAGENTA - S. VITTORE': 'Magenta - San Vittore',
}
LOWER_WORDS = {'di', 'del', 'della', 'delle', 'dei', 'in', 'sul', 'e'}


def nil_name(raw):
    if raw in NIL_NAMES:
        return NIL_NAMES[raw]
    words = raw.lower().split(' ')
    return ' '.join(w if (w in LOWER_WORDS and i) else w[:1].upper() + w[1:] for i, w in enumerate(words))


def load_milano():
    items = []
    for name in ('limits_P_15_municipalities.geojson', 'limits_P_108_municipalities.geojson'):
        for f in fetch(OPENPOLIS + name, name):
            p = f['properties']
            items.append({'id': p['com_istat_code'], 'name': p['name'], 'group': p['prov_name'],
                          'geom': detailed_municipality(p['com_istat_code'])})

    # Il comune di Milano è sostituito dai suoi 88 quartieri (NIL). I quartieri
    # vengono ritagliati sul confine ISTAT del comune e le piccole fessure lungo
    # il bordo vanno al quartiere con cui condividono più confine, così i
    # quartieri combaciano esattamente con i comuni vicini.
    city = next(a for a in items if a['id'] == '015146')
    items.remove(city)
    nils = []
    for f in fetch(MILANO_NIL, 'milano_nil.geojson'):
        p = f['properties']
        nils.append({'id': f"MI{p['ID_NIL']:02d}", 'name': nil_name(p['NIL']),
                     'group': 'Comune di Milano', 'geom': geom(f).intersection(city['geom'])})
    gaps = city['geom'].difference(unary_union([n['geom'] for n in nils]))
    for gap in polys_of(gaps):
        best = max(nils, key=lambda n: n['geom'].buffer(1e-6).intersection(gap.boundary).length)
        best['geom'] = unary_union([best['geom'], gap]).buffer(0)
    assert len(nils) == 88, len(nils)
    return items + nils


GERMAN_NAMES = {
    'Baden-Württemberg': 'Baden-Württemberg', 'Bayern': 'Baviera', 'Berlin': 'Berlino',
    'Brandenburg': 'Brandeburgo', 'Bremen': 'Brema', 'Hamburg': 'Amburgo', 'Hessen': 'Assia',
    'Mecklenburg-Vorpommern': 'Meclemburgo-Pomerania Anteriore', 'Niedersachsen': 'Bassa Sassonia',
    'Nordrhein-Westfalen': 'Renania Settentrionale-Vestfalia', 'Rheinland-Pfalz': 'Renania-Palatinato',
    'Saarland': 'Saarland', 'Sachsen': 'Sassonia', 'Sachsen-Anhalt': 'Sassonia-Anhalt',
    'Schleswig-Holstein': 'Schleswig-Holstein', 'Thüringen': 'Turingia',
}


def load_germania():
    name = 'ne_10m_admin_1_states_provinces.geojson'
    return [{'id': p['iso_3166_2'].split('-')[1], 'name': GERMAN_NAMES[p['name']],
             'group': 'Germania', 'geom': geom(f)}
            for f in fetch(NATURAL_EARTH + name, name)
            for p in [f['properties']] if p['adm0_a3'] == 'DEU']


LAND_CODES = {'01': 'Schleswig-Holstein', '02': 'Hamburg', '03': 'Niedersachsen', '04': 'Bremen',
              '05': 'Nordrhein-Westfalen', '06': 'Hessen', '07': 'Rheinland-Pfalz', '08': 'Baden-Württemberg',
              '09': 'Bayern', '10': 'Saarland', '11': 'Berlin', '12': 'Brandenburg',
              '13': 'Mecklenburg-Vorpommern', '14': 'Sachsen', '15': 'Sachsen-Anhalt', '16': 'Thüringen'}
# Fusioni avvenute dopo il 2018: Eisenach è entrata nel Wartburgkreis nel 2021.
DISTRICT_MERGES = {'16056': '16063'}


def load_distretti():
    features = [f for f in fetch(GERMAN_DISTRICTS, 'germania_kreise.geojson') if f['properties']['GF'] == 4]
    items = {}
    for f in features:
        p = f['properties']
        if p['AGS'] in DISTRICT_MERGES:
            continue
        items[p['AGS']] = {'id': p['AGS'], 'name': p['GEN'], 'kind': p['BEZ'],
                           'group': GERMAN_NAMES[LAND_CODES[p['AGS'][:2]]], 'geom': geom(f)}
    for f in features:
        target = DISTRICT_MERGES.get(f['properties']['AGS'])
        if target:
            items[target]['geom'] = unary_union([items[target]['geom'], geom(f)]).buffer(0)
    # Città e circondario con lo stesso nome (München, Leipzig…) vanno distinti.
    counts = {}
    for a in items.values():
        counts[a['name']] = counts.get(a['name'], 0) + 1
    for a in items.values():
        if counts[a['name']] > 1:
            city = a['kind'] in ('Kreisfreie Stadt', 'Stadtkreis')
            a['name'] += ' (città)' if city else ' (circondario)'
    return list(items.values())


CONTINENTS = {'Europe': 'Europa', 'Asia': 'Asia', 'Africa': 'Africa', 'North America': 'Nord America',
              'South America': 'Sud America', 'Oceania': 'Oceania'}
REGION_UN = {'Africa': 'Africa', 'Asia': 'Asia', 'Europe': 'Europa', 'Oceania': 'Oceania', 'Americas': 'Nord America'}
WORLD_TYPES = {'Sovereign country', 'Country', 'Sovereignty'}
WORLD_EXTRA = {'KOS', 'ISR', 'SAH', 'PSX'}                      # contesi ma comunemente considerati
WORLD_SKIP = {'JEY', 'GGY', 'IMN', 'ABW', 'CUW', 'ALD', 'MAC', 'HKG', 'SXM'}
WORLD_MERGE = {'CYN': 'CYP', 'SOL': 'SOM'}                      # Cipro del Nord, Somaliland
WORLD_NAMES = {'USA': 'Stati Uniti', 'SWZ': 'Eswatini'}


def load_mondo():
    name = 'ne_50m_admin_0_countries.geojson'
    features = fetch(NATURAL_EARTH + name, name)
    items = {}
    for f in features:
        p = f['properties']
        code = p['ADM0_A3']
        if code in WORLD_MERGE or code in WORLD_SKIP:
            continue
        if p['TYPE'] in WORLD_TYPES or code in WORLD_EXTRA:
            name = WORLD_NAMES.get(code, p['NAME_IT'])
            group = CONTINENTS.get(p['CONTINENT']) or REGION_UN[p['REGION_UN']]
            items[code] = {'id': code, 'name': name[:1].upper() + name[1:], 'group': group, 'geom': geom(f)}
    for f in features:
        target = WORLD_MERGE.get(f['properties']['ADM0_A3'])
        if target:
            items[target]['geom'] = unary_union([items[target]['geom'], geom(f)]).buffer(0)
    return list(items.values())


# ---------- Regioni del mondo ----------
# Suddivisioni di primo livello di Natural Earth (stessa fonte dei Länder). Dove
# sono troppo minute (comuni, contee, province) si accorpano nelle regioni
# indicate dal campo "region"; il Regno Unito usa le regioni inglesi più
# Scozia, Galles e Irlanda del Nord.
REGION_BY_FIELD = {'ITA', 'FRA', 'ESP', 'GBR', 'SVN', 'LVA', 'PHL', 'UGA', 'MKD', 'AZE', 'KOS'}
REGION_NAMES = {
    'ITA': {'Apulia': 'Puglia', 'Sicily': 'Sicilia', 'Trentino-Alto Adige': 'Trentino-Alto Adige',
            'Friuli-Venezia Giulia': 'Friuli-Venezia Giulia'},
    'FRA': {'Auvergne-Rhône-Alpes': 'Alvernia-Rodano-Alpi', 'Bourgogne-Franche-Comté': 'Borgogna-Franca Contea',
            'Bretagne': 'Bretagna', 'Centre-Val de Loire': 'Centro-Valle della Loira', 'Corse': 'Corsica',
            'Grand Est': 'Grand Est', 'Guadeloupe': 'Guadalupa', 'Guyane française': 'Guyana francese',
            'Hauts-de-France': 'Alta Francia', 'Martinique': 'Martinica', 'Mayotte': 'Mayotte',
            'Normandie': 'Normandia', 'Nouvelle-Aquitaine': 'Nuova Aquitania', 'Occitanie': 'Occitania',
            'Pays de la Loire': 'Paesi della Loira', "Provence-Alpes-Côte-d'Azur": "Provenza-Alpi-Costa Azzurra",
            'Réunion': 'Riunione', 'Île-de-France': 'Île-de-France'},
    'ESP': {'Andalucía': 'Andalusia', 'Aragón': 'Aragona', 'Asturias': 'Asturie', 'Canary Is.': 'Canarie',
            'Cantabria': 'Cantabria', 'Castilla y León': 'Castiglia e León', 'Castilla-La Mancha': 'Castiglia-La Mancia',
            'Cataluña': 'Catalogna', 'Ceuta': 'Ceuta', 'Extremadura': 'Estremadura', 'Foral de Navarra': 'Navarra',
            'Galicia': 'Galizia', 'Islas Baleares': 'Baleari', 'La Rioja': 'La Rioja', 'Madrid': 'Comunità di Madrid',
            'Melilla': 'Melilla', 'Murcia': 'Murcia', 'País Vasco': 'Paesi Baschi', 'Valenciana': 'Comunità Valenciana'},
    'GBR': {'East': 'Inghilterra orientale', 'East Midlands': 'Midlands orientali', 'Greater London': 'Londra',
            'North East': 'Inghilterra nord-orientale', 'North West': 'Inghilterra nord-occidentale',
            'South East': 'Inghilterra sud-orientale', 'South West': 'Inghilterra sud-occidentale',
            'West Midlands': 'Midlands occidentali', 'Yorkshire and the Humber': 'Yorkshire e Humber',
            'Scotland': 'Scozia', 'Wales': 'Galles', 'Northern Ireland': 'Irlanda del Nord'},
    'SVN': {'Gorenjska': 'Alta Carniola', 'Goriška': 'Goriziano', 'Jugovzhodna Slovenija': 'Slovenia sud-orientale',
            'Koroška': 'Carinzia slovena', 'Notranjsko-kraška': 'Carniola Interna-Carso', 'Obalno-kraška': 'Litorale-Carso',
            'Osrednjeslovenska': 'Slovenia centrale', 'Podravska': 'Podravska', 'Pomurska': 'Oltremura',
            'Savinjska': 'Savinjska', 'Spodnjeposavska': 'Bassa Sava', 'Zasavska': 'Zasavska'},
    'LVA': {'Kurzeme': 'Curlandia', 'Latgale': 'Latgalia', 'Riga': 'Riga', 'Vidzeme': 'Vidzeme', 'Zemgale': 'Semigallia'},
    'PHL': {'Autonomous Region in Muslim Mindanao (ARMM)': 'Bangsamoro', 'Bicol (Region V)': 'Bicol',
            'CALABARZON (Region IV-A)': 'Calabarzon', 'Cagayan Valley (Region II)': 'Valle di Cagayan',
            'Central Luzon (Region III)': 'Luzon Centrale', 'Central Visayas (Region VII)': 'Visayas Centrale',
            'Cordillera Administrative Region (CAR)': 'Cordillera', 'Davao (Region XI)': 'Davao',
            'Dinagat Islands (Region XIII)': 'Caraga', 'Eastern Visayas (Region VIII)': 'Visayas Orientale',
            'Ilocos (Region I)': 'Ilocos', 'MIMAROPA (Region IV-B)': 'Mimaropa',
            'National Capital Region': 'Metro Manila', 'Northern Mindanao (Region X)': 'Mindanao Settentrionale',
            'SOCCSKSARGEN (Region XII)': 'Soccsksargen', 'Western Visayas (Region VI)': 'Visayas Occidentale',
            'Zamboanga Peninsula (Region IX)': 'Penisola di Zamboanga'},
    'UGA': {'Central': 'Uganda centrale', 'Eastern': 'Uganda orientale', 'Northern': 'Uganda settentrionale',
            'Western': 'Uganda occidentale'},
    'MKD': {'Eastern': 'Macedonia orientale', 'Greater Skopje': 'Skopje', 'Skopje': 'Skopje',
            'Northeastern': 'Macedonia nord-orientale', 'Pelagonia': 'Pelagonia', 'Polog': 'Polog',
            'Southeastern': 'Macedonia sud-orientale', 'Southwestern': 'Macedonia sud-occidentale', 'Vardar': 'Vardar'},
    'AZE': {'Absheron Economic Region': 'Abşeron', 'Aran Economic Region': 'Aran',
            'Daghlig Shirvan Economic Region': 'Shirvan montano', 'Ganja-Gazakh Economic Region': 'Ganja-Gazakh',
            'Guba-Khachmaz Economic Region': 'Guba-Khachmaz', 'Kalbajar-Lachin Economic Region': 'Kalbajar-Lachin',
            'Lankaran Economic Region': 'Lankaran', 'Naxçıvan Autonomous Republic': 'Naxçıvan',
            'Shaki-Zaqatala Economic Region': 'Shaki-Zaqatala', 'Yukhari Garabakh Economic Region': 'Alto Karabakh'},
    'KOS': {'Gnjilane': 'Gjilan', 'Kosovska Mitrovica': 'Mitrovica', 'Peć': 'Peja', 'Pristina': 'Pristina',
            'Prizren': 'Prizren', 'Uroševac': 'Ferizaj', 'Đakovica': 'Gjakova'},
}
# Territori che Natural Earth tiene a parte ma che la mappa delle nazioni unisce.
REGION_COUNTRY = {'CYN': 'CYP', 'SOL': 'SOM', 'KAB': 'KAZ', 'KAS': 'IND', 'ESB': 'CYP', 'WSB': 'CYP', 'USG': 'CUB'}
SMALL_COUNTRY = 3000      # km²: sotto questa superficie la nazione resta un'unica area
SMALL_REGION = 150        # km²: le aree più piccole si uniscono alla vicina con più confine in comune
NAME_PREFIX = re.compile(r"(?i)^(?:dipartimento|regione autonoma|regione|voivodato|divisione|governatorato|"
                         r"circondario autonomo|distretto|provincia|contea|cantone?|prefettura)?"
                         r"\s*(?:dell'|della |dello |degli |delle |del |dei |di |de )\s*")
ARTICLE = re.compile(r"^(?:La |Le |L'|Il |Lo |Gli )")
# Capitali con lo stesso nome della regione che le circonda e nomi italiani
# sbagliati nella fonte.
NAME_FIX = {
    'RUS-2364': 'Oblast di Mosca', 'RUS-2365': 'Mosca', 'UKR-321': 'Oblast di Kiev', 'UKR-4826': 'Kiev',
    'BLR-2345': 'Regione di Minsk', 'BLR-4825': 'Minsk', 'KAZ-3207': 'Regione di Almaty', 'KAZ-4829': 'Almaty',
    'HRV-1588': 'Regione di Zagabria', 'HRV-1589': 'Zagabria', 'ARG-1295': 'Provincia di Buenos Aires',
    'ARG-5493': 'Buenos Aires', 'PER-591': 'Regione di Lima', 'PER-587': 'Lima', 'TWN-1162': 'Contea di Hsinchu',
    'TWN-1161': 'Hsinchu', 'LAO-3284': 'Provincia di Vientiane', 'LAO-3283': 'Vientiane',
    'YEM-3496': "Governatorato di Sana'a", 'YEM-3498': "Sana'a", 'RUS-2399': "Territorio dell'Altaj",
    'RUS-2400': "Repubblica dell'Altaj", 'RUS-2613': 'Oblast autonoma ebraica', 'RUS-2321': 'Čukotka',
    'RUS-2396': 'Chanty-Mansi',
}


def km2(g):
    c = g.centroid
    return g.area * 111.32 ** 2 * math.cos(math.radians(c.y))


def region_name(p):
    if p['adm1_code'] in NAME_FIX:
        return NAME_FIX[p['adm1_code']]
    for raw in (p.get('name_it'), p.get('name_en'), p.get('name')):
        if raw and raw[0].isalpha():
            name = NAME_PREFIX.sub('', raw.strip())
            # "La Slesia", "L'Atlantico": l'articolo cade se non fa parte del nome.
            if ARTICLE.match(name) and not ARTICLE.match(p.get('name_en') or ''):
                name = ARTICLE.sub('', name)
            return name[:1].upper() + name[1:]
    return None


def merge_into_neighbour(items, small):
    """Unisce ogni area in `small` alla vicina della stessa nazione con più confine in comune."""
    for a in sorted(small, key=lambda a: km2(a['geom'])):
        border = a['geom'].buffer(0.01)
        others = [b for b in items if b is not a and b['country'] == a['country']
                  and b['geom'].distance(a['geom']) < 0.01]
        if not others:
            continue
        best = max(others, key=lambda b: b['geom'].intersection(border).area)
        best['geom'] = unary_union([best['geom'], a['geom']]).buffer(0)
        items.remove(a)


def load_regioni():
    countries = {code: a['name'] for code, a in
                 json.load(open(os.path.join(ROOT, 'data', 'mondo.json'), encoding='utf-8'))['areas'].items()}
    name = 'ne_10m_admin_1_states_provinces.geojson'
    by_country = {}
    for f in fetch(NATURAL_EARTH + name, name):
        p = f['properties']
        code = REGION_COUNTRY.get(p['adm0_a3'], p['adm0_a3'])
        if code in countries:
            by_country.setdefault(code, []).append((p, geom(f)))

    items = []
    for code, feats in sorted(by_country.items()):
        if code in REGION_BY_FIELD:
            parts = {}
            for p, g in feats:
                key = p['region'] if code != 'GBR' or p['geonunit'] == 'England' else p['geonunit']
                parts.setdefault(key, []).append(g)
            names = REGION_NAMES[code]
            merged, loose = {}, parts.pop(None, [])
            for key, gs in parts.items():
                merged.setdefault(names.get(key, key), []).extend(gs)     # Skopje e Greater Skopje
            group = [{'id': f'{code}-R{i + 1:02d}', 'name': rname, 'aliases': [],
                      'country': code, 'geom': unary_union(gs).buffer(0)}
                     for i, (rname, gs) in enumerate(sorted(merged.items()))]
            orphans = [{'country': code, 'geom': g} for g in loose]   # comuni senza regione
            group += orphans
            merge_into_neighbour(group, orphans)
            items.extend(group)
            continue
        whole = unary_union([g for _, g in feats]).buffer(0)
        if km2(whole) < SMALL_COUNTRY or len(feats) == 1:
            items.append({'id': code, 'name': countries[code], 'aliases': [], 'country': code, 'geom': whole})
            continue
        group = []
        for p, g in feats:
            rname = region_name(p)
            aliases = sorted({x for x in (p.get('name'), p.get('name_en'), p.get('name_it'))
                              if x and x != rname and x[0].isalpha()})
            group.append({'id': re.sub(r'[^A-Z0-9-]', '', p['adm1_code'].upper()), 'name': rname,
                          'aliases': aliases, 'country': code, 'geom': g, 'local': p.get('name'),
                          'merge': not rname or p['type_en'] == 'Urban county'})
        # Stesso nome nella stessa nazione: si usa il nome locale se è diverso
        # (le regioni del Madagascar), altrimenti sono pezzi della stessa area.
        same = {}
        for a in group:
            same.setdefault(a['name'], []).append(a)
        for twins in same.values():
            if len(twins) < 2 or not twins[0]['name']:
                continue
            local = [a['local'] for a in twins]
            if len(set(local)) == len(local):
                for a in twins:
                    a['aliases'] = sorted(set(a['aliases'] + [a['name']]) - {a['local']})
                    a['name'] = a['local']
            else:
                twins[0]['geom'] = unary_union([a['geom'] for a in twins]).buffer(0)
                for a in twins[1:]:
                    group.remove(a)
        merge_into_neighbour(group, [a for a in group if a.pop('merge') or km2(a['geom']) < SMALL_REGION])
        items.extend(group)

    # Le isolette senza nome e senza vicini nella stessa nazione si scartano.
    items = [a for a in items if a.get('name')]
    # Nomi uguali in nazioni diverse (Limburgo, Punjab…): si aggiunge la nazione.
    counts = {}
    for a in items:
        counts[a['name']] = counts.get(a['name'], 0) + 1
    for a in items:
        a['group'] = countries[a['country']]
        if counts[a['name']] > 1:
            a['name'] += f" ({a['group']})"
    return items


# ---------- Arco alpino ----------
# Distretti austriaci (Bezirke) al 2021: Statistik Austria, CC BY 4.0, nella
# conversione GeoJSON di ginseng666 (Flooh Perlot, CC BY 4.0).
AUSTRIAN_DISTRICTS = ('https://raw.githubusercontent.com/ginseng666/GeoJSON-TopoJSON-Austria/'
                      '81df08cced08b02a873f6375e17424e053a99ac0/2021/simplified-95/bezirke_95_geo.json')
# Comuni svizzeri 2014 (swisstopo VEC200, coordinate svizzere LV03 in metri) con
# il numero del distretto, e la tabella dei nomi dei distretti. Sono dati anteriori
# alle riforme successive, come la sostituzione dei distretti dei Grigioni con le
# regioni nel 2016.
SWISS_2014 = ('https://raw.githubusercontent.com/greenore/swiss-maps/'
              'ad2c881327fab2fcaffd0d39571a71a9047ab722/src/V200/2014/')
SWISS_CANTONS = {1: 'ZH', 2: 'BE', 3: 'LU', 4: 'UR', 5: 'SZ', 6: 'OW', 7: 'NW', 8: 'GL', 9: 'ZG', 10: 'FR',
                 11: 'SO', 12: 'BS', 13: 'BL', 14: 'SH', 15: 'AR', 16: 'AI', 17: 'SG', 18: 'GR', 19: 'AG',
                 20: 'TG', 21: 'TI', 22: 'VD', 23: 'VS', 24: 'NE', 25: 'GE', 26: 'JU'}
# Contorno approssimato delle Alpi (lon, lat), da Nizza in senso orario lungo il
# piede dei rilievi: serve solo a scegliere le aree vicine alle montagne.
ALPS = Polygon([
    (7.25, 43.70), (7.55, 43.78), (8.00, 43.90), (8.45, 44.30), (7.90, 44.40), (7.55, 44.45),
    (7.35, 44.75), (7.45, 45.05), (7.65, 45.35), (7.85, 45.50), (8.05, 45.60), (8.45, 45.80),
    (8.85, 45.85), (9.10, 45.82), (9.45, 45.80), (9.75, 45.72), (10.15, 45.62), (10.55, 45.55),
    (10.85, 45.60), (11.20, 45.65), (11.55, 45.75), (11.80, 45.80), (12.20, 45.90), (12.65, 46.05),
    (13.10, 46.20), (13.60, 46.10), (14.00, 45.95), (14.50, 45.95), (15.00, 46.00), (15.50, 46.30),
    (15.75, 46.55), (15.60, 46.85), (15.45, 47.05), (15.95, 47.35), (16.20, 47.75), (16.25, 48.15),
    (15.60, 48.15), (15.00, 48.05), (14.40, 47.95), (13.90, 47.90), (13.00, 47.85), (12.60, 47.85),
    (12.10, 47.80), (11.60, 47.75), (11.10, 47.75), (10.60, 47.70), (10.20, 47.65), (9.75, 47.55),
    (9.40, 47.40), (8.90, 47.25), (8.55, 47.15), (8.20, 47.00), (7.80, 46.85), (7.45, 46.75),
    (7.10, 46.60), (6.85, 46.45), (6.55, 46.35), (6.15, 46.15), (5.95, 45.95), (5.85, 45.65),
    (5.60, 45.30), (5.40, 45.00), (5.15, 44.70), (5.10, 44.30), (5.60, 44.05), (5.85, 43.85),
    (6.40, 43.70), (6.90, 43.60), (7.25, 43.70),
])
# Distanza massima (km) del centro di un'area dalle Alpi, per nazione. Austria,
# Svizzera, Slovenia, Liechtenstein e Monaco sono incluse per intero; Croazia e
# Ungheria seguono le regole più sotto. In Italia
# ci si ferma alla latitudine di Milano, salvo le province che toccano le Alpi.
ALPS_REACH = {'ITA': 130, 'DEU': 150, 'FRA': 70}   # 150 km: fino a Stoccarda
ALPS_SOUTH = 45.1
# A nord-ovest della Svizzera la Francia arriva più lontano, come la Germania sull'altra
# sponda del Reno: Giura, Doubs, Territorio di Belfort e Alto Reno.
FRANCE_NORTH = (46.3, 120)
# La Croazia non ha Alpi, ma le contee del nord sono vicine quanto il Giura francese.
# Dell'Ungheria si prendono solo le due contee con le ultime propaggini alpine (monti di
# Kőszeg e colline di Sopron), con dentro le loro città di rango comitale.
CROATIA_REACH = 90
HUNGARY_COUNTIES = {'Vas': ['Szombathely'], 'Győr-Moson-Sopron': ['Győr', 'Sopron']}
SLOVENIA_WEST = {'Gorenjska', 'Goriška', 'Obalno-kraška', 'Osrednjeslovenska', 'Notranjsko-kraška'}
AUSTRIAN_STATES = {'1': 'Burgenland', '2': 'Carinzia', '3': 'Bassa Austria', '4': 'Alta Austria',
                   '5': 'Salisburghese', '6': 'Stiria', '7': 'Tirolo', '8': 'Vorarlberg', '9': 'Vienna'}
ISO2 = {'ITA': 'IT', 'FRA': 'FR', 'CHE': 'CH', 'LIE': 'LI', 'AUT': 'AT', 'DEU': 'DE', 'SVN': 'SI', 'MCO': 'MC',
        'HRV': 'HR', 'HUN': 'HU'}
ITALIAN_REGIONS = {"Valle d'Aosta/Vallée d'Aoste": "Valle d'Aosta", 'Trentino-Alto Adige/Südtirol': 'Trentino-Alto Adige'}


def fetch_binary(url, name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        print('Scarico', name)
        urllib.request.urlretrieve(url, path)
    with open(path, 'rb') as f:
        return f.read()


def read_dbf(data):
    count = struct.unpack('<I', data[4:8])[0]
    header, size = struct.unpack('<HH', data[8:12])
    fields, pos = [], 32
    while data[pos] != 0x0D:
        fields.append((data[pos:pos + 11].split(b'\0')[0].decode(), data[pos + 16]))
        pos += 32
    rows = []
    for i in range(count):
        rec, row, at = data[header + i * size:header + (i + 1) * size], {}, 1
        for name, length in fields:
            row[name] = rec[at:at + length].decode('latin-1').strip()
            at += length
        rows.append(row)
    return rows


def lv03_to_wgs84(e, n):
    """Formule approssimate di swisstopo (precisione di circa un metro)."""
    y, x = (e - 600000) / 1e6, (n - 200000) / 1e6
    lon = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y ** 3
    lat = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.0140 * x ** 3
    return lon * 100 / 36, lat * 100 / 36


def read_shp_polygons(data):
    """Poligoni di uno shapefile (tipo 5), già convertiti in longitudine e latitudine."""
    shapes, pos = [], 100
    while pos < len(data):
        length = struct.unpack('>i', data[pos + 4:pos + 8])[0] * 2
        rec = data[pos + 8:pos + 8 + length]
        pos += 8 + length
        if struct.unpack('<i', rec[:4])[0] != 5:
            shapes.append(None)
            continue
        nparts, npoints = struct.unpack('<2i', rec[36:44])
        parts = list(struct.unpack(f'<{nparts}i', rec[44:44 + 4 * nparts])) + [npoints]
        pts = struct.unpack(f'<{2 * npoints}d', rec[44 + 4 * nparts:44 + 4 * nparts + 16 * npoints])
        shells, holes = [], []
        for a, b in zip(parts, parts[1:]):
            ring = Polygon([lv03_to_wgs84(pts[2 * i], pts[2 * i + 1]) for i in range(a, b)])
            # negli shapefile gli anelli esterni girano in senso orario
            (holes if ring.exterior.is_ccw else shells).append(ring.buffer(0))
        shapes.append(unary_union(shells).difference(unary_union(holes)) if holes else unary_union(shells))
    return shapes


def swiss_districts():
    """Distretti svizzeri 2014; i cantoni senza distretti valgono come un distretto solo."""
    names = {r['BEZIRKSNR']: r['BEZIRKSNAM'] for r in
             read_dbf(fetch_binary(SWISS_2014 + 'VEC200_ADMLVL2.dbf', 'swiss2014/VEC200_ADMLVL2.dbf'))}
    rows = read_dbf(fetch_binary(SWISS_2014 + 'VEC200_Commune.dbf', 'swiss2014/VEC200_Commune.dbf'))
    shapes = read_shp_polygons(fetch_binary(SWISS_2014 + 'VEC200_Commune.shp', 'swiss2014/VEC200_Commune.shp'))
    parts = {}
    for row, g in zip(rows, shapes):
        if row['COUNTRY'] != 'CH' or g is None:
            continue
        canton = SWISS_CANTONS[int(row['KANTONSNR'])]
        key = row['BEZIRKSNR'] if row['BEZIRKSNR'] != '0' else canton
        parts.setdefault((canton, key), []).append(g)
    out = {k: unary_union(gs).buffer(0) for k, gs in parts.items()}
    # Nei cantoni con distretti alcune parti senza distretto (zone sui laghi e simili)
    # vanno al distretto vicino con più confine in comune.
    with_districts = {c for c, k in out if k != c}
    for (canton, key) in [k for k in out if k[0] == k[1] and k[0] in with_districts]:
        piece = out.pop((canton, key))
        best = max((k for k in out if k[0] == canton),
                   key=lambda k: out[k].buffer(0.002).intersection(piece).area)
        out[best] = unary_union([out[best], piece]).buffer(0)
    return [(canton, key, names.get(key), g) for (canton, key), g in sorted(out.items())]


def austrian_name(raw):
    """'Eisenstadt(Stadt)' -> 'Eisenstadt (città)', 'Krems(Land)' -> 'Krems (circondario)'."""
    name = raw.replace('Stadt Linz', 'Linz(Stadt)').replace('Stadt Steyr', 'Steyr(Stadt)').replace('Stadt Wels', 'Wels(Stadt)')
    name = re.sub(r'\s*\(Stadt\)$| Stadt$|-Stadt$', ' (città)', name)
    name = re.sub(r'\s*\(Land\)$| Land$|-Land$', ' (circondario)', name)
    return name.replace('Wien (città)', 'Vienna')


def alpine_units():
    """Province e distretti dell'arco alpino, con la regione di appartenenza."""
    ne = 'ne_10m_admin_1_states_provinces.geojson'
    ne_features = fetch(NATURAL_EARTH + ne, ne)
    codes = set(ISO2)
    # Le fonti nazionali non combaciano lungo le frontiere: ogni area viene
    # ritagliata sul contorno della propria nazione in Natural Earth.
    nations = {c: unary_union([geom(f) for f in ne_features if f['properties']['adm0_a3'] == c]).buffer(0)
               for c in codes}
    units = []   # (country, id, name, region, aliases, geom)
    for a in load_italia():
        units.append(('ITA', 'IT-' + a['id'], a['name'], ITALIAN_REGIONS.get(a['group'], a['group']), [], a['geom']))
    for a in load_distretti():
        units.append(('DEU', 'DE-' + a['id'], a['name'], a['group'], [], a['geom']))
    for f in fetch(AUSTRIAN_DISTRICTS, 'austria_bezirke.geojson'):
        p = f['properties']
        if len(p['iso']) == 3 and not ('901' <= p['iso'] <= '923'):   # Vienna intera, non i suoi distretti
            units.append(('AUT', 'AT-' + p['iso'], austrian_name(p['name']), AUSTRIAN_STATES[p['iso'][0]], [], geom(f)))
    slovenia, hungary = {}, {}
    for f in ne_features:
        p = f['properties']
        code = p['adm0_a3']
        if code == 'FRA' and p['iso_3166_2'][3:].isdigit():
            units.append(('FRA', p['iso_3166_2'], region_name(p), REGION_NAMES['FRA'][p['region']],
                          [p['name']], geom(f)))
        elif code == 'SVN':
            slovenia.setdefault(p['region'], []).append(geom(f))
        elif code == 'HRV':
            name = region_name(p)
            units.append(('HRV', 'HR-' + p['iso_3166_2'][3:], name, name, [p['name']], geom(f)))
        elif code == 'HUN':
            hungary[region_name(p)] = (p, geom(f))
    for region, gs in sorted(slovenia.items()):
        units.append(('SVN', 'SI-' + re.sub(r'[^A-Z]', '', region.upper())[:6], REGION_NAMES['SVN'][region],
                      'Slovenia occidentale' if region in SLOVENIA_WEST else 'Slovenia orientale',
                      [region], unary_union(gs).buffer(0)))
    for county, cities in HUNGARY_COUNTIES.items():
        p, g = hungary[county]
        g = unary_union([g] + [hungary[c][1] for c in cities]).buffer(0)
        units.append(('HUN', 'HU-' + p['iso_3166_2'][3:], county, county, [p['name']], g))
    cantons = {f['properties']['iso_3166_2'][3:]: f['properties'] for f in ne_features
               if f['properties']['adm0_a3'] == 'CHE'}
    for canton, key, name, g in swiss_districts():
        p = cantons[canton]
        if key == canton:   # cantone senza distretti
            units.append(('CHE', 'CH-' + canton, region_name(p), region_name(p), [p['name']], g))
        else:
            units.append(('CHE', 'CH-' + key, name, region_name(p), [], g))
    units.append(('LIE', 'LI', 'Liechtenstein', 'Liechtenstein', [], nations['LIE']))
    units.append(('MCO', 'MC', 'Monaco', 'Monaco', ['Principato di Monaco'], nations['MCO']))
    units = [(c, i, n, r, al, g.intersection(nations[c]).buffer(0)) for c, i, n, r, al, g in units]
    return [u for u in units if not u[5].is_empty]


def alps_km(g):
    """Distanza in km del centro dell'area dal contorno delle Alpi (0 se dentro)."""
    k = math.cos(math.radians(46.5))
    c = g.centroid
    scaled = shapely.affinity.scale(ALPS, xfact=k, yfact=1, origin=(0, 0))
    return scaled.distance(Point(c.x * k, c.y)) * 111.32


def in_alpine_area(country, g):
    if country == 'HRV':
        return alps_km(g) <= CROATIA_REACH
    if country not in ALPS_REACH:
        return True
    reach = ALPS_REACH[country]
    if country == 'FRA' and g.centroid.y >= FRANCE_NORTH[0]:
        reach = FRANCE_NORTH[1]
    if alps_km(g) > reach:
        return False
    return country != 'ITA' or g.centroid.y >= ALPS_SOUTH or g.intersects(ALPS)


ALPINE_COUNTRIES = {'ITA': 'Italia', 'FRA': 'Francia', 'CHE': 'Svizzera', 'LIE': 'Liechtenstein', 'AUT': 'Austria',
                    'DEU': 'Germania', 'SVN': 'Slovenia', 'MCO': 'Monaco', 'HRV': 'Croazia', 'HUN': 'Ungheria'}


def load_alpiprovince():
    units = [u for u in alpine_units() if in_alpine_area(u[0], u[5])]
    counts = {}
    for u in units:
        counts[u[2]] = counts.get(u[2], 0) + 1
    # Nomi uguali in nazioni diverse (Baden in Svizzera e in Austria): si aggiunge la nazione.
    return [{'id': i, 'name': n if counts[n] == 1 else f'{n} ({ALPINE_COUNTRIES[c]})',
             'group': r, 'aliases': al, 'geom': g} for c, i, n, r, al, g in units]


def load_alpi():
    # Le regioni intere che contengono almeno una provincia o un distretto della mappa.
    units = alpine_units()
    kept = {(c, r) for c, i, n, r, al, g in units if in_alpine_area(c, g)}
    regions = {}
    for c, i, n, r, al, g in units:
        if (c, r) in kept:
            regions.setdefault((c, r), []).append(g)
    countries = ALPINE_COUNTRIES
    cantons = {region_name(f['properties']): f['properties'] for f in fetch(NATURAL_EARTH + 'ne_10m_admin_1_states_provinces.geojson', 'ne_10m_admin_1_states_provinces.geojson')
               if f['properties']['adm0_a3'] == 'CHE'}
    items, counter = [], {}
    for (c, r), gs in sorted(regions.items()):
        counter[c] = counter.get(c, 0) + 1
        iso2 = ISO2[c]
        item = {'id': f'{iso2}-{counter[c]}' if c not in ('LIE', 'MCO') else iso2, 'name': r,
                'group': countries[c], 'geom': unary_union(gs).buffer(0)}
        if c == 'CHE':
            item['id'] = cantons[r]['iso_3166_2']
            item['aliases'] = [cantons[r]['name']]
        items.append(item)
    return items


MAPS = {
    'italia': {
        'load': load_italia,
        'touch': 0.004,       # gradi: tolleranza per considerare due aree confinanti
        'simplify': 0.012,    # gradi: tolleranza di semplificazione della copertura
        'label_tol': 0.005,
        'projection': equirectangular(42.0, 100.0),
        'link_islands': '⛴️',  # collega le parti staccate con questa icona
    },
    'milano': {
        'load': load_milano,
        'touch': 0.0002,
        'simplify': 0.0004,
        'label_tol': 0.0005,
        'projection': equirectangular(45.5, 1000.0),
        'link_islands': '🛣️',
    },
    'germania': {
        'load': load_germania,
        'touch': 0.002,
        'simplify': 0.005,
        'label_tol': 0.005,
        'projection': equirectangular(51.0, 100.0),
    },
    'distretti': {
        'load': load_distretti,
        'touch': 0.0005,
        'simplify': 0.01,
        'label_tol': 0.002,
        'projection': equirectangular(51.0, 250.0),
        'link_islands': '⛴️',
    },
    'mondo': {
        'load': load_mondo,
        'touch': 0.03,        # include Malaysia-Singapore (ponte-diga di Johor)
        'simplify': 0.1,
        'label_tol': 0.05,
        'projection': equal_earth(400.0),
        # Lo zoom segue solo la parte principale: la Francia non trascina la
        # vista fino alla Guyana, né gli Stati Uniti fino all'Alaska.
        'zoom_main_part': True,
        # Le isole senza confini terrestri restano staccate, come in travle;
        # contano solo i collegamenti fissi più noti.
        'links': [('GBR', 'FRA', '🚆'), ('DNK', 'SWE', '🌉'), ('BHR', 'SAU', '🌉')],
    },
    'alpi': {
        'load': load_alpi,
        'touch': 0.01,        # fonti diverse per nazione: piccole fessure lungo le frontiere
        'simplify': 0.01,
        'label_tol': 0.005,
        'projection': equirectangular(46.5, 100.0),
    },
    'alpiprovince': {
        'load': load_alpiprovince,
        'touch': 0.01,
        'simplify': 0.004,
        'label_tol': 0.003,
        'projection': equirectangular(46.5, 100.0),
    },
    'regioni': {
        'load': load_regioni,
        'touch': 0.01,
        'simplify': 0.08,
        'label_tol': 0.02,
        'projection': equal_earth(400.0),
        'zoom_main_part': True,
        # Gli stessi collegamenti fissi delle nazioni, più il ponte dello Storebælt
        # tra Selandia e Fionia. Le aree si indicano per nome.
        'links': [('Inghilterra sud-orientale', 'Alta Francia', '🚆'), ('Hovedstaden', 'Scania', '🌉'),
                  ('Bahrein', 'Al-Sharqiyya', '🌉'), ('Selandia', 'Danimarca meridionale', '🌉'),
                  ('Singapore', 'Johor', '🌉')],
    },
}


# ---------- Terra fuori dal gioco ----------
# Le terre emerse attorno alle aree di gioco (paesi vicini, territori esclusi) si
# disegnano in grigio, così il bordo della mappa non sembra mare.
LAND = None


def context_land(simplified, cfg):
    global LAND
    if LAND is None:
        name = 'ne_10m_land.geojson'
        LAND = unary_union([geom(f) for f in fetch(NATURAL_EARTH + name, name)]).buffer(0)
    x0, y0, x1, y1 = unary_union(simplified).bounds
    # anche oltre i bordi, perché la mappa si può spostare e rimpicciolire
    dx, dy = (x1 - x0) * 0.75, (y1 - y0) * 0.75
    frame = shapely.box(max(x0 - dx, -180), max(y0 - dy, -90), min(x1 + dx, 180), min(y1 + dy, 90))
    played = unary_union(simplified).buffer(cfg['touch'] * 2)
    land = LAND.intersection(frame).difference(played).simplify(cfg['simplify'] * 1.5)
    tiny = (frame.area / 2e5)          # isolette invisibili alla scala della mappa
    return [p for p in polys_of(land) if p.area > tiny]


# ---------- Costruzione ----------
def build(key, cfg):
    proj = cfg['projection']

    def to_path(polys):
        out = []
        for poly in polys:
            for ring in [poly.exterior, *poly.interiors]:
                pts = [proj(x, y) for x, y in ring.coords[:-1]]
                out.append('M' + 'L'.join(f'{fmt(x)},{fmt(y)}' for x, y in pts) + 'Z')
        return ''.join(out)

    items = cfg['load']()
    id2geom = {a['id']: a['geom'] for a in items}
    names = {a['id']: a['name'] for a in items}
    assert len(id2geom) == len(items), 'identificativi duplicati'
    print(f'[{key}] aree:', len(items))

    # 1. adiacenze
    adj = {a['id']: set() for a in items}
    pad = cfg['touch']
    for i, a in enumerate(items):
        ba = a['geom'].bounds
        for b in items[i + 1:]:
            bb = b['geom'].bounds
            if ba[0] > bb[2] + pad or bb[0] > ba[2] + pad or ba[1] > bb[3] + pad or bb[1] > ba[3] + pad:
                continue
            if a['geom'].distance(b['geom']) <= pad:
                adj[a['id']].add(b['id'])
                adj[b['id']].add(a['id'])

    # 2. collegamenti fissi e parti staccate
    links = []
    by_name = {a['name']: a['id'] for a in items}
    for a, b, icon in cfg.get('links', []):
        a, b = by_name.get(a, a), by_name.get(b, b)
        adj[a].add(b)
        adj[b].add(a)
        links.append([a, b, icon])
        print(f'[{key}] collegamento: {names[a]} <-> {names[b]}')
    if cfg.get('link_islands'):
        comps = components(adj)
        mainland = comps[0]
        for comp in comps[1:]:
            _, a, b = min(((id2geom[a].distance(id2geom[b]), a, b)
                           for a in comp for b in mainland), key=lambda t: t[0])
            adj[a].add(b)
            adj[b].add(a)
            links.append([a, b, cfg['link_islands']])
            mainland |= comp
            print(f'[{key}] collegamento: {names[a]} <-> {names[b]}')
        assert len(components(adj)) == 1, 'il grafo deve essere connesso'
    else:
        alone = [names[k] for k, v in adj.items() if not v]
        print(f'[{key}] aree senza confini: {len(alone)}')

    # 3. semplificazione come copertura
    simplified = shapely.coverage_simplify([a['geom'] for a in items], cfg['simplify'])

    areas, group_parts = {}, {}
    minx = miny = math.inf
    maxx = maxy = -math.inf
    for a, g in zip(items, simplified):
        parts = main_parts(g)
        group_parts.setdefault(a['group'], []).extend(parts)
        label = polylabel(max(parts, key=lambda p: p.area), tolerance=cfg['label_tol'])
        lx, ly = proj(label.x, label.y)
        xs, ys = zip(*(proj(x, y) for p in parts for x, y in p.exterior.coords))
        minx, miny, maxx, maxy = min(minx, *xs), min(miny, *ys), max(maxx, *xs), max(maxy, *ys)
        if cfg.get('zoom_main_part'):
            xs, ys = zip(*(proj(x, y) for x, y in parts[0].exterior.coords))
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        areas[a['id']] = {
            'name': a['name'],
            'group': a['group'],
            'neighbors': sorted(adj[a['id']]),
            'lx': round(lx, 1), 'ly': round(ly, 1),
            'bbox': [round(v, 1) for v in (x0, y0, x1, y1)],
            'path': to_path(parts),
        }
        if a.get('aliases'):
            areas[a['id']]['aliases'] = a['aliases']

    groups = {name: to_path(polys_of(unary_union(parts).buffer(0)))
              for name, parts in sorted(group_parts.items())}

    margin = 4
    data = {
        'viewBox': [round(minx - margin, 1), round(miny - margin, 1),
                    round(maxx - minx + 2 * margin, 1), round(maxy - miny + 2 * margin, 1)],
        'links': links,
        'groups': groups,
        'context': to_path(context_land(simplified, cfg)),
        'areas': areas,
    }
    out = os.path.join(ROOT, 'data', f'{key}.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f'[{key}] scritto {os.path.relpath(out, ROOT)} ({os.path.getsize(out) / 1024:.0f} KB)')


def main(argv):
    keys = argv or list(MAPS)
    unknown = [k for k in keys if k not in MAPS]
    if unknown:
        print('Mappe sconosciute:', ', '.join(unknown), '- disponibili:', ', '.join(MAPS))
        return 1
    for key in keys:
        build(key, MAPS[key])
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
