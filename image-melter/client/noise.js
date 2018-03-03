// basically https://thebookofshaders.com/11/

const fract = x => x % 1;

const mix = (x, y, a) => x * (1 - a) + y * a;
const dot = (x1, y1, x2, y2) => x1*x2 + y1*y2;
const drand = (x) => fract(Math.sin(dot(x, x, 12.9898, 78.233))*43758.5453123);

const noise = (x) => {
  const i = Math.floor(x);
  const f = fract(i);
  const u = f * f * (3.0 - 2.0 * f ); // custom cubic curve
  const y = mix(drand(i), drand(i + 1.0), u);
  return y;
}

export noise;