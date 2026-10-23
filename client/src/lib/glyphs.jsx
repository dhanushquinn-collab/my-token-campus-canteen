/* Line-art glyph per dish. Cheap to render, scales anywhere, and the counter
   can pick one when adding a dish instead of hunting for a photo. */

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

const shapes = {
  dosa: <g {...S}><path d="M6 40c8-16 24-26 40-26 6 0 10 3 10 8 0 14-16 30-34 30-9 0-16-4-16-12z" /><path d="M20 34c6-8 14-13 22-15" /><circle cx="46" cy="46" r="7" /><path d="M14 50h36" /></g>,
  idli: <g {...S}><circle cx="22" cy="24" r="11" /><circle cx="44" cy="24" r="11" /><path d="M8 40h48l-5 13H13z" /><path d="M22 46h20" /></g>,
  poori: <g {...S}><circle cx="24" cy="26" r="14" /><path d="M14 22c6-4 14-4 20 0" /><path d="M36 44h20l-3 12H39z" /><path d="M42 50h8" /></g>,
  rice: <g {...S}><path d="M10 34c0-11 11-18 22-18s22 7 22 18z" /><path d="M10 34h44l-5 20H15z" /><path d="M22 24l3-4M32 21v-5M42 24l-3-4" /></g>,
  thali: <g {...S}><circle cx="32" cy="32" r="24" /><circle cx="24" cy="22" r="7" /><circle cx="42" cy="22" r="7" /><circle cx="32" cy="42" r="9" /></g>,
  biryani: <g {...S}><path d="M12 30h40l-4 24H16z" /><path d="M18 30c2-9 8-14 14-14s12 5 14 14" /><path d="M26 40l4 4 8-9" /><path d="M32 12v-5" /></g>,
  curry: <g {...S}><path d="M12 28h34c0 12-8 20-17 20s-17-8-17-20z" /><path d="M46 32h6a4 4 0 010 8h-6" /><path d="M22 20c0-4 4-4 4-8M32 18c0-4 4-4 4-8" /></g>,
  bowl: <g {...S}><path d="M10 30h44c0 13-10 22-22 22S10 43 10 30z" /><circle cx="24" cy="24" r="4" /><circle cx="38" cy="20" r="4" /><circle cx="32" cy="30" r="4" /></g>,
  puff: <g {...S}><path d="M10 42l14-24h20l10 24z" /><path d="M24 18l6 24M38 18l-4 24" /><path d="M10 42h44" /></g>,
  chaat: <g {...S}><path d="M12 34h40c0 12-9 20-20 20s-20-8-20-20z" /><path d="M20 34l10-18 10 18" /><path d="M24 44h16" /></g>,
  roll: <g {...S}><path d="M20 8l16 4-6 44-16-4z" /><path d="M18 20l14 3M17 32l14 3" /><path d="M36 12l10 6-6 40-10-6" /></g>,
  noodles: <g {...S}><path d="M12 32h40c0 12-9 20-20 20s-20-8-20-20z" /><path d="M20 32c2-10 6-14 6-20M30 32c1-11 5-13 5-20M40 32c2-9 5-12 5-19" /></g>,
  coffee: <g {...S}><path d="M16 24h26v16c0 6-5 11-13 11s-13-5-13-11z" /><path d="M42 28h6a5 5 0 010 10h-6" /><path d="M22 16c0-4 4-4 4-8M32 16c0-4 4-4 4-8" /></g>,
  chai: <g {...S}><path d="M18 26h28l-5 22H23z" /><path d="M14 52h36" /><path d="M26 18c0-4 4-4 4-8M36 18c0-4 4-4 4-8" /></g>,
  shake: <g {...S}><path d="M18 20h28l-4 34H22z" /><path d="M18 30h28" /><path d="M32 20V8" /><circle cx="32" cy="6" r="3" /></g>,
  soda: <g {...S}><path d="M20 18h24l-4 36H24z" /><path d="M26 28h12M26 38h12" /><path d="M38 12l6-6" /></g>,
  sweet: <g {...S}><circle cx="24" cy="34" r="11" /><circle cx="42" cy="30" r="9" /><path d="M12 48h40" /><path d="M24 23v-4M42 21v-4" /></g>,
  plate: <g {...S}><circle cx="32" cy="32" r="22" /><circle cx="32" cy="32" r="13" /></g>
}

export const GLYPH_NAMES = Object.keys(shapes)

export default function Glyph({ name = 'plate', ...rest }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" {...rest}>
      {shapes[name] || shapes.plate}
    </svg>
  )
}
