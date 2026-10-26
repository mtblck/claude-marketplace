/**
 * linewash kit: builds SVG illustrations in the linewash style.
 *
 *   import { scene, rr, circ, poly, path } from './kit.mjs'
 *   const s = scene({ w: 800, h: 600 })
 *   s.backdrop(560, 160, 90)
 *   s.shape(rr(300, 200, 200, 140, 18), { fill: 'mist', shade: { angle: 0 }, glint: { at: 0.3 } })
 *   s.accents([['hex', 470, 210, 12], ['plus', 520, 180, 8], ['ring', 560, 250, 10]])
 *   s.waterline(180, 620, 420)
 *   process.stdout.write(s.svg('A short sentence saying what the picture shows'))
 *
 * Every shape is: a flat fill, a soft two-tone wash clipped inside it, optional
 * paper-coloured glints, then one ink outline on top. Painter's order is call order.
 */

export const DEFAULT_PALETTE = {
  ink: '#4a82b0', // the one line colour
  wash: '#d3e4f0', // shade side of a fill
  mist: '#e5eff6', // main fill
  haze: '#eff5f9', // backdrop circle, faint accents
  paper: '#ffffff', // ground and glints
}

const hex2 = n => Math.round(n).toString(16).padStart(2, '0')
function mix(hex, t) {
  // t = share of the ink colour, rest white
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return '#' + c.map(v => hex2(v * t + 255 * (1 - t))).join('')
}

/** A palette from any ink colour: the tints are the ink mixed into white. */
export function palette(ink) {
  if (!ink) return { ...DEFAULT_PALETTE }
  return { ink, wash: mix(ink, 0.24), mist: mix(ink, 0.13), haze: mix(ink, 0.08), paper: '#ffffff' }
}

const f = n => +n.toFixed(2)

// Geometry helpers return { d, box } so glints know where the shape is.
export function rr(x, y, w, h, r = 0) {
  r = Math.min(r, w / 2, h / 2)
  const d = r
    ? `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${r} ${r} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${r} ${r} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${r} ${r} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)}Z`
    : `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`
  return { d, box: [x, y, w, h] }
}

export function circ(cx, cy, r) {
  return { d: `M${f(cx - r)} ${f(cy)}A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)}A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)}Z`, box: [cx - r, cy - r, 2 * r, 2 * r] }
}

/** Polygon from points; `r` rounds every corner with that radius. */
export function poly(pts, { r = 0, open = false } = {}) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
  if (!r || pts.length < 3) return { d: 'M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L') + (open ? '' : 'Z'), box }
  const n = pts.length
  let d = ''
  for (let i = 0; i < n; i++) {
    if (open && (i === 0 || i === n - 1)) {
      d += (i === 0 ? 'M' : 'L') + `${f(pts[i][0])} ${f(pts[i][1])}`
      continue
    }
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1])
    const k = Math.min(r, la / 2, lb / 2)
    const p1 = [p[0] + ((a[0] - p[0]) / la) * k, p[1] + ((a[1] - p[1]) / la) * k]
    const p2 = [p[0] + ((b[0] - p[0]) / lb) * k, p[1] + ((b[1] - p[1]) / lb) * k]
    d += (i === 0 ? 'M' : 'L') + `${f(p1[0])} ${f(p1[1])}Q${f(p[0])} ${f(p[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return { d: d + (open ? '' : 'Z'), box }
}

/** Any path string, with the box you know it occupies (needed only for glints). */
export const path = (d, box = [0, 0, 0, 0]) => ({ d, box })

export function scene({ w = 800, h = 600, ink, colors, weight } = {}) {
  const pal = { ...palette(ink), ...(colors || {}) }
  const sw = weight ?? w / 230 // ~3.5 at 800 wide: the one structural weight
  const defs = []
  const body = []
  let uid = 0
  let target = body
  const tone = t => pal[t] ?? t

  const api = {
    palette: pal,
    weight: sw,

    /** The pale circle (or any shape) behind the subject. No outline. */
    backdrop(cx, cy, r, { fill = 'haze' } = {}) {
      target.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${tone(fill)}"/>`)
      return api
    },

    /**
     * A filled, outlined shape.
     *   fill   tone for the flat fill (mist | wash | haze | paper | hex)
     *   shade  { angle, to, at, soft }: two-tone wash from the fill to `to` (default wash)
     *          across the shape; angle 0 = shade on the right, 90 = bottom; `at` is where
     *          the change sits (0..1), `soft` how wide the blend is (0 = hard split).
     *   glint  { angle, at, width, count, gap }: paper-coloured diagonal bands across the box.
     *   line   false for no outline; weight multiplies the stroke.
     */
    shape(geom, { fill = 'mist', shade, glint, line = true, weight = 1, stroke = 'ink' } = {}) {
      const { d, box } = typeof geom === 'string' ? { d: geom, box: [0, 0, 0, 0] } : geom
      target.push(`<path d="${d}" fill="${tone(fill)}"/>`)
      if (shade || glint) {
        const id = `lw${++uid}`
        defs.push(`<clipPath id="${id}c"><path d="${d}"/></clipPath>`)
        const inner = []
        if (shade) {
          const { angle = 0, to = 'wash', at = 0.55, soft = 0.3 } = shade === true ? {} : shade
          const a = (angle * Math.PI) / 180
          const x1 = 0.5 - Math.cos(a) / 2, y1 = 0.5 - Math.sin(a) / 2, x2 = 0.5 + Math.cos(a) / 2, y2 = 0.5 + Math.sin(a) / 2
          const s0 = Math.max(0, at - soft / 2), s1 = Math.min(1, at + soft / 2)
          defs.push(`<linearGradient id="${id}g" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"><stop offset="${f(s0)}" stop-color="${tone(fill)}"/><stop offset="${f(s1)}" stop-color="${tone(to)}"/></linearGradient>`)
          inner.push(`<path d="${d}" fill="url(#${id}g)"/>`)
        }
        if (glint) {
          const { angle = -55, at = 0.3, width = 0.1, count = 2, gap = 0.08, fill: gf = 'paper' } = glint === true ? {} : glint
          const [bx, by, bw, bh] = box
          const cx = bx + bw / 2, cy = by + bh / 2, L = Math.hypot(bw, bh)
          for (let i = 0; i < count; i++) {
            const wi = L * width * (i ? 0.5 : 1)
            const off = (at - 0.5) * L + i * (L * width + L * gap)
            inner.push(`<rect x="${f(cx + off - wi / 2)}" y="${f(cy - L)}" width="${f(wi)}" height="${f(2 * L)}" fill="${tone(gf)}" transform="rotate(${angle + 90} ${f(cx)} ${f(cy)})"/>`)
          }
        }
        target.push(`<g clip-path="url(#${id}c)">${inner.join('')}</g>`)
      }
      if (line) target.push(`<path d="${d}" stroke="${tone(stroke)}" stroke-width="${f(sw * weight)}"/>`)
      return api
    },

    /** Outline only: details, handles, seams. weight 0.75 is the detail weight. */
    line(geom, { weight = 1, stroke = 'ink', dash } = {}) {
      const d = typeof geom === 'string' ? geom : geom.d
      const da = dash ? ` stroke-dasharray="${dash.map(v => f(v * sw)).join(' ')}"` : ''
      target.push(`<path d="${d}" stroke="${tone(stroke)}" stroke-width="${f(sw * weight)}"${da}/>`)
      return api
    },

    /** Solid ink dot (portholes' rivets, terminal dots, ground specks). */
    dot(cx, cy, r = sw * 0.9, fill = 'ink') {
      target.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${tone(fill)}"/>`)
      return api
    },

    /**
     * Small floating accents. Each item: [kind, x, y, size, tone?]
     * kinds: hex (filled), hexo (outlined), plus, ring, dot, tri (play triangle), spark (4-point star)
     * Default tone is wash (pale); use 'ink' for one or two near the ground.
     */
    accents(items) {
      for (const [kind, x, y, s, t = 'wash'] of items) {
        const c = tone(t), lw = f(sw * 0.8)
        if (kind === 'hex' || kind === 'hexo') {
          const pts = [...Array(6)].map((_, i) => [x + s * Math.cos((Math.PI / 3) * i + Math.PI / 6), y + s * Math.sin((Math.PI / 3) * i + Math.PI / 6)])
          const d = poly(pts, { r: s * 0.18 }).d
          target.push(kind === 'hex' ? `<path d="${d}" fill="${c}"/>` : `<path d="${d}" stroke="${c}" stroke-width="${lw}"/>`)
        } else if (kind === 'plus') {
          target.push(`<path d="M${f(x - s)} ${f(y)}H${f(x + s)}M${f(x)} ${f(y - s)}V${f(y + s)}" stroke="${c}" stroke-width="${f(sw * 0.9)}"/>`)
        } else if (kind === 'ring') {
          target.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" stroke="${c}" stroke-width="${f(sw * 1.1)}"/>`)
        } else if (kind === 'dot') {
          target.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="${c}"/>`)
        } else if (kind === 'tri') {
          target.push(`<path d="${poly([[x - s * 0.6, y - s], [x + s, y], [x - s * 0.6, y + s]], { r: s * 0.2 }).d}" fill="${c}"/>`)
        } else if (kind === 'spark') {
          const k = s * 0.22
          target.push(`<path d="M${f(x)} ${f(y - s)}Q${f(x + k)} ${f(y - k)} ${f(x + s)} ${f(y)}Q${f(x + k)} ${f(y + k)} ${f(x)} ${f(y + s)}Q${f(x - k)} ${f(y + k)} ${f(x - s)} ${f(y)}Q${f(x - k)} ${f(y - k)} ${f(x)} ${f(y - s)}Z" fill="${c}"/>`)
        }
      }
      return api
    },

    /** Horizontal dashed fragments: rows of [x0, x1] segments at y, round caps. */
    dashes(rows, { weight = 1, stroke = 'ink' } = {}) {
      for (const [y, segs] of rows) {
        target.push(`<path d="${segs.map(([a, b]) => `M${f(a)} ${f(y)}H${f(b)}`).join('')}" stroke="${tone(stroke)}" stroke-width="${f(sw * weight)}"/>`)
      }
      return api
    },

    /** A ground line: dot, short lead, gentle waves (or flat), short lead, dot. */
    waterline(x0, x1, y, { amp = sw * 1.4, len = sw * 7, flat = false, lead = sw * 6, weight = 1 } = {}) {
      const a = x0 + lead * 1.8, b = x1 - lead * 1.8
      let d = `M${f(x0 + lead * 0.6)} ${f(y)}H${f(a)}`
      if (flat) d += `H${f(b)}`
      else {
        const n = Math.max(2, Math.round((b - a) / len))
        const step = (b - a) / n
        for (let i = 0; i < n; i++) d += `Q${f(a + step * (i + 0.5))} ${f(y + (i % 2 ? amp : -amp) * 2)} ${f(a + step * (i + 1))} ${f(y)}`
      }
      d += `H${f(x1 - lead * 0.6)}`
      target.push(`<path d="${d}" stroke="${tone('ink')}" stroke-width="${f(sw * weight)}"/>`)
      api.dot(x0, y, sw * 0.6).dot(x1, y, sw * 0.6)
      return api
    },

    /** Draw into a transformed group: s.group('rotate(-20 400 300)', () => { … }) */
    group(transform, fn) {
      const outer = target
      target = []
      fn(api)
      outer.push(`<g transform="${transform}">${target.join('')}</g>`)
      target = outer
      return api
    },

    /** Raw SVG, for anything the helpers don't cover. Keep it to the palette. */
    raw(markup) {
      target.push(markup)
      return api
    },

    svg(title, { background = 'paper' } = {}) {
      const esc = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      const bg = background ? `<rect width="${w}" height="${h}" fill="${tone(background)}"/>` : ''
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>${esc}</title><defs>${defs.join('')}</defs>${bg}<g fill="none" stroke-linecap="round" stroke-linejoin="round">${body.join('')}</g></svg>\n`
    },
  }
  return api
}
