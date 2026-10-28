"""Genera docs/mer.dot a partir del diagrama Mermaid de data-model.md.

Uso, desde la raíz del repositorio:
    python docs/generar_mer.py
    dot -Tpng -Gdpi=150 docs/mer.dot -o docs/mer.png

Así la imagen del MER siempre coincide con data-model.md (una sola fuente de verdad).
"""
import re, sys, html
src = sys.argv[1] if len(sys.argv) > 1 else "specs/002-modulo-adquisiciones-compras/data-model.md"
out = sys.argv[2] if len(sys.argv) > 2 else "docs/mer.dot"
txt = open(src, encoding='utf-8').read()
m = re.search(r'```mermaid\n(.*?)```', txt, re.S); block = m.group(1)
CARD = {'||':'teetee','|o':'teeodot','o|':'teeodot','}o':'crowodot','o{':'crowodot','}|':'crowtee','|{':'crowtee'}
rels = re.findall(r'^\s*(\w+)\s+(\|\||\|o|\}o|\}\|)--(\|\||o\||o\{|\|\{)\s+(\w+)\s*:\s*"([^"]*)"', block, re.M)
ents = {}
for name, body in re.findall(r'^\s*(\w+)\s*\{\n(.*?)^\s*\}', block, re.M|re.S):
    attrs=[]
    for line in body.strip().splitlines():
        p=line.split()
        if len(p)>=2: attrs.append((p[1], p[2] if len(p)>2 else ''))
    ents[name]=attrs
NOTES = {('ORDEN_COMPRA','id_cotizacion'):' (opc., único)', ('EVALUACION_PROVEEDOR','id_orden'):' (único)',
         ('SOLICITUD_COMPRA','id_aprobador'):' (opc.)'}
SHARED = {'PRODUCTO':'compartida: Inventario','FACTURA_PROVEEDOR':'interfaz: Contabilidad',
          'USUARIO':'maestro: RR.HH.','CENTRO_COSTO':'maestro: Contabilidad'}
L=[]
L.append('// MER - Módulo Adquisiciones y Compras (notación pata de gallo)')
L.append('// Generado automáticamente desde el bloque Mermaid de specs/002-modulo-adquisiciones-compras/data-model.md')
L.append('// Generar imagen: dot -Tpng -Gdpi=150 docs/mer.dot -o docs/mer.png')
L.append('digraph MER {')
L.append('  graph [rankdir=LR, splines=polyline, nodesep=0.5, ranksep=1.3, bgcolor="white", fontname="Helvetica", label="MER — Módulo Adquisiciones y Compras  (v1.0, 27-10-2026)", labelloc=t, fontsize=20];')
L.append('  node  [shape=plain, fontname="Helvetica", fontsize=10];')
L.append('  edge  [dir=both, color="#475569", fontname="Helvetica", fontsize=9, fontcolor="#334155"];')
for name, attrs in ents.items():
    color = '#0f766e' if name in SHARED else '#1e3a8a'
    title = f'<b>{name}</b>' + (f'  ({SHARED[name]})' if name in SHARED else '')
    pk = [a for a,k in attrs if k=='PK']
    rest = []
    for a,k in attrs:
        if k=='PK': continue
        pre = (k+' ') if k in ('FK','UK') else ''
        rest.append(html.escape(pre + a + NOTES.get((name,a),'')) + '<br align="left"/>')
    L.append(f'  {name} [label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="4">'
             f'<tr><td bgcolor="{color}"><font color="white">{title}</font></td></tr>'
             f'<tr><td align="left">PK {pk[0]}</td></tr>'
             f'<tr><td align="left">{"".join(rest)}</td></tr></table>>];')
for a, lc, rc, b, lab in rels:
    L.append(f'  {a} -> {b} [arrowtail={CARD[lc]}, arrowhead={CARD[rc]}, xlabel="{lab}"];')
L.append('  LEYENDA [label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="4" bgcolor="#f8fafc">'
         '<tr><td colspan="2"><b>Leyenda (pata de gallo)</b></td></tr>'
         '<tr><td>││</td><td align="left">exactamente uno</td></tr>'
         '<tr><td>○│</td><td align="left">cero o uno</td></tr>'
         '<tr><td>○&lt;</td><td align="left">cero o muchos</td></tr>'
         '<tr><td>│&lt;</td><td align="left">uno o muchos</td></tr>'
         '<tr><td bgcolor="#1e3a8a"> </td><td align="left">entidad propia del módulo</td></tr>'
         '<tr><td bgcolor="#0f766e"> </td><td align="left">entidad compartida / interfaz con otro módulo</td></tr></table>>];')
L.append('}')
open(out,'w',encoding='utf-8').write('\n'.join(L)+'\n')
print(f'entidades: {len(ents)} | relaciones: {len(rels)}')
