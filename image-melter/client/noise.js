// basically https://thebookofshaders.com/11/

// basically https://thebookofshaders.com/11/

const fract = x => x % 1;

const mix = (x, y, a) => x * (1 - a) + y * a;
const dot = (x1, y1, x2, y2) => x1*x2 + y1*y2;
const drand = (x, y) => {
  const d = dot(x, y, 12.9898, 78.233)
  const s = Math.sin(d);
  const v = s * 43758.5453123
  const f = fract(v);
  console.log('rand', JSON.stringify({ d, s, v, f }))
  return f;
}

const drand2 = (x, y) => {
  const a = 12.9898;
  const b = 78.233;
  const c = 43758.5453;
  //const dt= dot(co.xy ,vec2(a,b));
  const dt = dot(x, y, a, b);
  //const sn = mod(dt,3.14);
  const sn = dt % 3.14;
  //return fract(sin(sn) * c);
  const v = fract(Math.sin(sn) * c);
  //console.log('rand2', JSON.stringify({ dt, sn, v }))
  return v;
}

const noise = (x) => {
  const i = Math.floor(x);
  const f = fract(i);
  const u = f * f * (3.0 - 2.0 * f ); // custom cubic curve
  const y = mix(drand(i, i), drand(i + 1.0, i + 1.0), u);
  return y;
}

export const noise2 = (x) => {
  const i = Math.floor(x);
  const f = fract(i);
  const u = f * f * (3.0 - 2.0 * f ); // custom cubic curve
  const y = mix(drand2(i, i), drand2(i + 1.0, i + 1.0), u);
  return y;
}
