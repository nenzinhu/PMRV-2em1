import shapefile, json, math

SRC = "_shp_src/Rodovias_SC"
OUT = "public/rodovias-sc.geojson"

# ---- Douglas-Peucker simplification (planar, meters) ----
def dp(points, eps):
    if len(points) < 3:
        return points
    # find point with max distance from line start-end
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(points) - 1):
        x0, y0 = points[i]
        d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        left = dp(points[:idx + 1], eps)
        right = dp(points[idx:], eps)
        return left[:-1] + right
    return [points[0], points[-1]]

EPS = 18.0  # ~18 m tolerance
sf = shapefile.Reader(SRC)
feats = []
for i, r in enumerate(sf.records()):
    rod = (r['RODOVIA'] or '').strip()
    ki = float(r['KM INICIAL'] or 0.0)
    kf = float(r['KM FINAL'] or 0.0)
    sit = (r['SITUAÇÃO'] or '').strip()
    ini = (r['INICIO TRE'] or '').strip()
    fin = (r['FINAL TREC'] or '').strip()
    rev = (r['REVESTIMEN'] or '').strip()
    shp = sf.shape(i)
    if shp.shapeType != 23:  # only polylines
        continue
    # shape may have multiple parts
    parts = shp.parts
    pts = shp.points
    segments = []
    if not parts:
        parts = [0]
    for p in range(len(parts)):
        start = parts[p]
        end = parts[p + 1] if p + 1 < len(parts) else len(pts)
        seg = [(round(x, 1), round(y, 1)) for x, y in pts[start:end]]
        if len(seg) >= 2:
            segments.append(dp(seg, EPS))
    nome = f"{ini} → {fin}".strip(' →')
    for seg in segments:
        feats.append({
            "type": "Feature",
            "properties": {
                "rodovia": rod,
                "kmInicial": round(ki, 3),
                "kmFinal": round(kf, 3),
                "situacao": sit,
                "revestimento": rev,
                "nome": nome,
            },
            "geometry": {"type": "LineString", "coordinates": seg},
        })

gj = {"type": "FeatureCollection", "name": "Rodovias_SC_04.24", "features": feats}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(gj, f, ensure_ascii=False, separators=(",", ":"))

# Unique sorted rodovia names for the selectable list
names = sorted({ft["properties"]["rodovia"] for ft in feats if ft["properties"]["rodovia"]})
with open("lib/rodovias-list.js", "w", encoding="utf-8") as f:
    f.write("// Gerado por gen_geojson.py a partir do Shapefile oficial Rodovias_SC\n")
    f.write("export const RODOVIAS = " + json.dumps(names, ensure_ascii=False) + ";\n")
    f.write("export const RODOVIAS_GEOJSON_URL = '/rodovias-sc.geojson';\n")

import os
print("features:", len(feats), "size:", round(os.path.getsize(OUT) / 1024), "KB")
print("rodovias unicas:", len(names))
