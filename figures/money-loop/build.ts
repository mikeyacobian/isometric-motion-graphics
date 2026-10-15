import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";

// One bench. Treasury and employee gifts are separate inputs.
// Wide pipe: vault → super PAC tank → broadcast. No path to the podium.
// Thin pipe: employee slot → $5,000 stop → podium.
// The vault port aimed at the podium is a blind flange.

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 700;
const HEIGHT = 460;
const AZ = 50;
const EL = 30;

const BASE = { x: -128, y: -74, w: 310, d: 156, r: 8 };
const BASE_Z = -12;

const WIDE_Y = -30;
const WIDE_Z = 15.7;
const WIDE_R = 2.55;
const THIN_Y = 39;
const THIN_Z = 7.2;
const THIN_R = 1.05;

const VAULT = { x: -114, y: -48, w: 40, d: 36, r: 1.15 };
const PLINTH_H = 1.7;
const VAULT_H = 28;

const TANK = { x: -20, y: -54, w: 58, d: 48, r: 0.6 };
const WALL = 2.6;
const FLOOR_H = 4;
const WALL_H = 24;
const LIP_D = 2.5;
const LIP_H = 6.4;
const INSET = 1.35;

const CAST = { x: 52, y: -46, w: 36, d: 24, r: 1.05 };
const CAST_H = 6.4;
const CAB = { x: 56, y: -42, w: 26, d: 16, r: 0.75 };
const CAB_H = 15;

const SLOT = { x: -114, y: 28, w: 32, d: 22, r: 1 };
const POD = { x: 136, y: 28, w: 30, d: 22, r: 1 };
const POD_H = 15;

const DIAL: [number, number] = [16, THIN_Y];
const DIAL_R = 11;
const DIAL_Z = 16.6;
const DIAL_H = 5.5;
const DIAL_TOP = DIAL_Z + DIAL_H;
const REST = -0.35;
const CAP = 2.45;

const FIRE = { x: 112, y: -62, w: 3.8, d: 92, r: 0.25 };
const FIRE_Z = 1.8;
const FIRE_H = 48;

const fitPts: number[][] = [
  ...k.boxCorners(BASE, BASE_Z - 2.8, 0),
  [VAULT.x, VAULT.y, PLINTH_H + VAULT_H + 4],
  [VAULT.x + VAULT.w, VAULT.y + VAULT.d + 6, 8],
  [TANK.x + TANK.w, TANK.y, FLOOR_H + WALL_H + 3],
  [CAST.x + CAST.w, CAST.y, PLINTH_H + CAST_H + CAB_H + 14],
  [FIRE.x, FIRE.y, FIRE_Z + FIRE_H + 3],
  [FIRE.x + FIRE.w + 2, FIRE.y + FIRE.d, FIRE_Z + FIRE_H],
  [POD.x + POD.w + 4, POD.y + POD.d, POD_H + 22],
  [SLOT.x, THIN_Y, 16],
  [DIAL[0], DIAL[1], DIAL_TOP + 4],
  [DIAL[0] - DIAL_R, DIAL[1] + DIAL_R, DIAL_TOP],
];

function cardFill(pad: number) {
  const proj = k.fitProjection(fitPts, WIDTH, HEIGHT, { pad, azimuth: AZ, elevation: EL });
  const flat = fitPts.map((point) => k.iso(point as [number, number, number], proj));
  const xs = flat.map((point) => point[0]);
  const ys = flat.map((point) => point[1]);
  const fw = (Math.max(...xs) - Math.min(...xs)) / WIDTH;
  const fh = (Math.max(...ys) - Math.min(...ys)) / HEIGHT;
  const contentW = 732;
  const svgH = contentW * (HEIGHT / WIDTH);
  return { fw, fh, cw: (fw * contentW) / (contentW + 48), ch: (fh * svgH) / (svgH + 104), proj };
}

let pad = 70;
let framed = cardFill(pad);
for (let trial = 36; trial <= 110; trial += 2) {
  const next = cardFill(trial);
  const span = Math.max(next.cw, next.ch);
  const best = Math.max(framed.cw, framed.ch);
  if (Math.abs(span - 0.6) < Math.abs(best - 0.6)) {
    pad = trial;
    framed = next;
  }
}
const P = framed.proj;
console.log(
  "frame",
  "pad",
  pad,
  "svg",
  framed.fw.toFixed(3),
  framed.fh.toFixed(3),
  "card",
  framed.cw.toFixed(3),
  framed.ch.toFixed(3),
);

const at = (point: number[]) => k.iso(point as [number, number, number], P);
const S = (paths: unknown, style?: object) => k.solidSvg(paths, style);
const L = (d: string, style?: object) => k.lineSvg(d, style);
const loop = (points: number[][], tone = "lo") => L(k.pathOf(points.map((point) => at(point)), true), { tone });

const R = A.recorder(P);
const record = R.solid;

function put(name: string, ref: number[], svg: string, shapes: unknown[] = [], extra: { part?: string } = {}) {
  return R.put({ name, at: ref, svg, shapes, piece: "bench", ...extra });
}

function box(
  name: string,
  plan: { x: number; y: number; w: number; d: number; r: number },
  z: number,
  h: number,
  style: object = {},
  extra = "",
  opts: { owner?: string; part?: string; inner?: string; bevel?: number } = {},
) {
  const bevel = opts.bevel ?? (Math.min(plan.w, plan.d, h) < 2.2 ? 0 : 0.32);
  const shape = record(A.slab(plan, z, h, { name, owner: opts.owner }, 4));
  put(
    name,
    [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2],
    S(k.slabOf(plan, z, h, P, 4, bevel), { ...style, inner: opts.inner || "" }) + extra,
    [shape],
    { part: opts.part },
  );
}

function puck(
  name: string,
  x: number,
  y: number,
  z: number,
  h: number,
  r: number,
  style: object = {},
  steps = 16,
  opts: { owner?: string; part?: string; bevel?: number; extra?: string } = {},
) {
  const bevel = opts.bevel ?? (r < 1.5 ? 0 : 0.1);
  const shape = record(A.cylinder(x, y, r, z, h, { name, owner: opts.owner }));
  put(name, [x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, steps, bevel), style) + (opts.extra || ""), [shape], { part: opts.part });
}

function boss(name: string, origin: number[], axis: number[], r: number, h: number, owner: string) {
  const F = G.frameAlong(origin, axis);
  const shape = record(A.disc(F, 0, h, r, { name, owner }));
  put(name, G.add3(origin, G.mul3(axis, h / 2)), S(G.disc(0, h, r, F, P), { tone: "mid", crease: "lo" }), [shape]);
  return G.add3(origin, G.mul3(axis, h));
}

function capDisc(name: string, origin: number[], axis: number[], r: number, thick: number, owner: string, style: object = { tone: "mid", crease: "lo" }) {
  const F = G.frameAlong(origin, axis);
  const shape = record(A.disc(F, 0, thick, r, { name, owner }));
  put(name, G.add3(origin, G.mul3(axis, thick / 2)), S(G.disc(0, thick, r, F, P), style), [shape]);
}

function pipe(name: string, control: number[][], r: number, tone: string, extraGaps: number[][] = []) {
  const line = G.fillet(control, Math.max(r * 2.6, 4), 12, { P, tube: r }) as number[][];
  const total = G.pathLength(line);
  const thick = Math.max(0.9, r * 0.55);
  const gaps = [
    [0, thick],
    [total - thick, total],
    ...extraGaps,
  ];
  for (const gap of extraGaps) {
    if (gap[0] < thick + 0.6 || gap[1] > total - thick - 0.6) throw new Error(`${name} valve gap hits a flange`);
  }
  R.route(name, line, r, { owner: name, gaps, rims: [r * 1.34, r * 1.34], piece: "bench" });
  tubePieces(line, r, P, { maxLength: 34, spacing: Math.max(0.8, r * 0.2), gaps }).forEach(
    (piece: { mid: number[]; points: number[][]; radii: number[] }, index: number) => {
      put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)]);
    },
  );
  (
    [
      [0, -1],
      [total, 1],
    ] as [number, number][]
  ).forEach(([along, sign], index) => {
    const tangent = G.tangentAlong(line, along);
    const centre = G.add3(G.pointAlong(line, along), G.mul3(tangent, (-sign * thick) / 2));
    const F = G.frameAlong(centre, tangent);
    const fr = r * 1.34;
    const shape = record(A.disc(F, -thick / 2, thick / 2, fr, { name: `${name}.flange${index}`, owner: name }));
    put(`${name}.flange${index}`, centre, S(G.disc(-thick / 2, thick / 2, fr, F, P), { tone, crease: "lo" }), [shape]);
  });
  return line;
}

function person(name: string, x: number, y: number, z: number) {
  const legH = 3.3;
  const torsoH = 5.4;
  const bw = 4.6;
  const bd = 2.8;
  const owner = `${name}.body`;
  puck(`${name}.lega`, x - 0.95, y, z, legH, 0.55, { tone: "hi", crease: "lo" }, 12, { owner });
  puck(`${name}.legb`, x + 0.95, y, z, legH, 0.55, { tone: "hi", crease: "lo" }, 12, { owner });
  box(`${name}.body`, { x: x - bw / 2, y: y - bd / 2, w: bw, d: bd, r: 0.45 }, z + legH, torsoH, { tone: "hi", crease: "lo" });
  puck(`${name}.head`, x, y + 0.1, z + legH + torsoH, 2.15, 1.32, { tone: "hi", crease: "lo" }, 16, { owner });
}

const halo = `<path class="iso-halo" d="${k.haloOf(BASE, BASE_Z, -BASE_Z, P)}"/>`;
const groove = L(k.planOutline(k.insetPlan(BASE, 7), 0.05, P, 8), { tone: "lo" });
box("stand.base", BASE, BASE_Z, -BASE_Z, { tone: "lo", crease: "faint" }, groove);

(
  [
    [BASE.x + 26, BASE.y + 22],
    [BASE.x + BASE.w - 26, BASE.y + 22],
    [BASE.x + 26, BASE.y + BASE.d - 22],
    [BASE.x + BASE.w - 26, BASE.y + BASE.d - 22],
  ] as [number, number][]
).forEach(([x, y], index) => puck(`stand.foot.${"abcd"[index]}`, x, y, BASE_Z - 2.6, 2.6, 5.6, { tone: "lo", crease: "faint" }, 20, { bevel: 0.08 }));

(
  [
    [BASE.x + 16, BASE.y + 14],
    [BASE.x + BASE.w - 16, BASE.y + 14],
    [BASE.x + 16, BASE.y + BASE.d - 14],
    [BASE.x + BASE.w - 14, BASE.y + BASE.d - 14],
  ] as [number, number][]
).forEach(([x, y], index) => {
  const top = 0.7;
  puck(`plate.screw.${"abcd"[index]}`, x, y, 0, top, 1.12, { tone: "mid", crease: "lo" }, 16, {
    bevel: 0,
    extra: L(k.ring(x, y, 0.7, top, P, 16), { tone: "lo" }) + k.dotsSvg([at([x, y, top])], { size: 0.42, tone: "hi" }),
  });
});

const RULER = { x: -48, y: -70.2, w: 62, d: 3.3, r: 0.25 };
const rulerTop = 0.6;
const rulerTicks = k.topTicks(RULER.x + 3, RULER.x + RULER.w - 3, 4, 4, RULER.y + RULER.d, rulerTop, [-1.25, -2.15], P);
box(
  "plate.ruler",
  RULER,
  0,
  rulerTop,
  { tone: "lo", crease: "faint" },
  L(rulerTicks.minor, { tone: "lo" }) + L(rulerTicks.major, { tone: "mid" }),
);

const LABEL = { x: -120, y: -70, w: 26, d: 8.5, r: 0.3 };
const labelTop = 0.72;
let rules = "";
for (let row = 0; row < 3; row++) {
  const y = LABEL.y + 2.1 + row * 2.05;
  rules += L(k.lineOnTop([LABEL.x + 1.8, y], [LABEL.x + LABEL.w - 1.8, y], labelTop, P), { tone: "lo", free: true });
}
box("plate.label", LABEL, 0, labelTop, { tone: "lo", crease: "faint" }, rules);

box("vault.plinth", { x: VAULT.x - 1.4, y: VAULT.y - 1.4, w: VAULT.w + 2.8, d: VAULT.d + 2.8, r: 1.2 }, 0, PLINTH_H, { tone: "mid", crease: "lo" });
box("vault.body", VAULT, PLINTH_H, VAULT_H, { tone: "hi", crease: "lo" }, "", {
  inner: L(k.sideSeam(VAULT, PLINTH_H + 12, P, 6), { tone: "lo" }),
});
box(
  "vault.cornice",
  { x: VAULT.x - 1.5, y: VAULT.y - 1.5, w: VAULT.w + 3, d: VAULT.d + 3, r: 0.8 },
  PLINTH_H + VAULT_H,
  1.55,
  { tone: "mid", crease: "lo" },
  "",
  { owner: "vault.body" },
);

const door = { x: VAULT.x + 3.2, y: VAULT.y + VAULT.d, w: 12, d: 0.85, r: 0.2 };
box("vault.door", door, PLINTH_H + 4.2, 16.5, { tone: "hi", crease: "lo" }, "", { owner: "vault.body" });
capDisc("vault.handle", [door.x + 9.2, door.y + door.d, PLINTH_H + 12.4], [0, 1, 0], 0.85, 1.15, "vault.door", { tone: "hi", crease: "lo" });
puck("vault.hinge.a", door.x + 0.15, door.y + 0.35, PLINTH_H + 6.2, 2.1, 0.62, { tone: "mid", crease: "lo" }, 12, { owner: "vault.door", bevel: 0 });
puck("vault.hinge.b", door.x + 0.15, door.y + 0.35, PLINTH_H + 16.4, 2.1, 0.62, { tone: "mid", crease: "lo" }, 12, { owner: "vault.door", bevel: 0 });

const vaultEast = VAULT.x + VAULT.w;
const wideOut = boss("vault.port", [vaultEast, WIDE_Y, WIDE_Z], [1, 0, 0], WIDE_R * 1.52, 2.5, "vault.body");
const blindAt: [number, number, number] = [VAULT.x + 28, VAULT.y + VAULT.d, 6.4];
const blindEnd = boss("vault.blind", blindAt, [0, 1, 0], 2.55, 2.15, "vault.body");
capDisc("vault.cap", blindEnd, [0, 1, 0], 3.7, 1.15, "vault.body");

box("tank.floor", TANK, 0, FLOOR_H, { tone: "mid", crease: "lo" });
const wallTop = FLOOR_H + WALL_H;
const rightFace = TANK.x + TANK.w + 0.04;
const pane = loop(
  [
    [rightFace, TANK.y + 4, FLOOR_H + 3.2],
    [rightFace, TANK.y + TANK.d - 4, FLOOR_H + 3.2],
    [rightFace, TANK.y + TANK.d - 4, wallTop - 3],
    [rightFace, TANK.y + 4, wallTop - 3],
  ],
  "lo",
);
box("tank.wall.back", { x: TANK.x, y: TANK.y, w: TANK.w, d: WALL, r: 0.2 }, FLOOR_H, WALL_H, { tone: "mid", crease: "lo" }, "", { owner: "tank.floor" });
box("tank.wall.left", { x: TANK.x, y: TANK.y + WALL, w: WALL, d: TANK.d - WALL, r: 0.2 }, FLOOR_H, WALL_H, { tone: "mid", crease: "lo" }, "", { owner: "tank.floor" });
box("tank.wall.right", { x: TANK.x + TANK.w - WALL, y: TANK.y + WALL, w: WALL, d: TANK.d - WALL, r: 0.2 }, FLOOR_H, WALL_H, { tone: "mid", crease: "lo" }, pane, { owner: "tank.floor" });
box(
  "tank.lip",
  { x: TANK.x + WALL, y: TANK.y + TANK.d - LIP_D, w: TANK.w - WALL * 2, d: LIP_D, r: 0.15 },
  FLOOR_H,
  LIP_H,
  { tone: "mid", crease: "lo" },
  "",
  { owner: "tank.floor" },
);
box("tank.rail.back", { x: TANK.x, y: TANK.y, w: TANK.w, d: WALL, r: 0.15 }, wallTop, 1.45, { tone: "mid", crease: "lo" }, "", { owner: "tank.floor" });
box("tank.rail.left", { x: TANK.x, y: TANK.y + WALL, w: WALL, d: TANK.d - WALL, r: 0.15 }, wallTop, 1.45, { tone: "mid", crease: "lo" }, "", { owner: "tank.floor" });
box("tank.rail.right", { x: TANK.x + TANK.w - WALL, y: TANK.y + WALL, w: WALL, d: TANK.d - WALL, r: 0.15 }, wallTop, 1.45, { tone: "mid", crease: "lo" }, "", { owner: "tank.floor" });
box(
  "tank.stile.a",
  { x: TANK.x + WALL, y: TANK.y + TANK.d - LIP_D, w: 1.45, d: LIP_D, r: 0.1 },
  FLOOR_H + LIP_H,
  WALL_H - LIP_H,
  { tone: "mid", crease: "lo" },
  "",
  { owner: "tank.floor" },
);
box(
  "tank.stile.b",
  { x: TANK.x + TANK.w - WALL - 1.45, y: TANK.y + TANK.d - LIP_D, w: 1.45, d: LIP_D, r: 0.1 },
  FLOOR_H + LIP_H,
  WALL_H - LIP_H,
  { tone: "mid", crease: "lo" },
  "",
  { owner: "tank.floor" },
);

const FILL = {
  x: TANK.x + WALL + INSET,
  y: TANK.y + WALL + INSET,
  w: TANK.w - WALL * 2 - INSET * 2,
  d: TANK.d - WALL - LIP_D - INSET * 2,
  r: 0.35,
};
const FILL_H = 17.2;
box("tank.fill", FILL, FLOOR_H, FILL_H, { tone: "hi", crease: "lo" }, "", { part: "fill", bevel: 0.15 });

const tankIn = boss("tank.in", [TANK.x, WIDE_Y, WIDE_Z], [-1, 0, 0], WIDE_R * 1.52, 2.5, "tank.wall.left");
pipe("lane.wide", [wideOut, tankIn], WIDE_R, "hi");

const castZ = 1.5;
box("cast.plinth", { x: CAST.x - 1.6, y: CAST.y - 1.6, w: CAST.w + 3.2, d: CAST.d + 3.2, r: 1.1 }, 0, castZ, { tone: "mid", crease: "lo" });
box("cast.body", CAST, castZ, CAST_H, { tone: "mid", crease: "lo" });
const cabZ = castZ + CAST_H;
box("cast.cab", CAB, cabZ, CAB_H, { tone: "hi", crease: "lo" });
const faceY = CAB.y + CAB.d;
const bezel = { x: CAB.x + 3.2, y: faceY, w: 18.2, d: 0.48, r: 0.15 };
box("cast.bezel", bezel, cabZ + 3.2, 10.4, { tone: "mid", crease: "lo" }, "", { owner: "cast.cab" });
const screen = { x: bezel.x + 1.3, y: faceY + bezel.d, w: 15.6, d: 0.55, r: 0.12 };
let bars = "";
for (let row = 0; row < 4; row++) {
  const z0 = cabZ + 4.5 + row * 2.15;
  const y = screen.y + screen.d + 0.04;
  bars += loop(
    [
      [screen.x + 1.1, y, z0],
      [screen.x + screen.w - 1.1, y, z0],
      [screen.x + screen.w - 1.1, y, z0 + 1.15],
      [screen.x + 1.1, y, z0 + 1.15],
    ],
    "hi",
  );
}
box("cast.screen", screen, cabZ + 4.1, 8.6, { tone: "hi", crease: "lo" }, `<g data-part="bars" opacity="0.22">${bars}</g>`, { owner: "cast.cab" });
capDisc("cast.speaker", [CAB.x + CAB.w - 2.3, faceY, cabZ + 7.6], [0, 1, 0], 1.45, 0.7, "cast.cab");
puck("cast.knob.a", CAST.x + 2.4, CAST.y + 2.2, cabZ, 1.5, 1.15, { tone: "mid", crease: "lo" }, 14, { bevel: 0 });
puck("cast.knob.b", CAST.x + CAST.w - 2.4, CAST.y + 2.2, cabZ, 1.5, 1.15, { tone: "mid", crease: "lo" }, 14, { bevel: 0 });
const mastX = CAB.x + CAB.w / 2;
const mastY = CAB.y + CAB.d / 2;
puck("cast.mast", mastX, mastY, cabZ + CAB_H, 11, 1.02, { tone: "mid", crease: "lo" }, 14, { bevel: 0 });
puck("cast.dish", mastX, mastY, cabZ + CAB_H + 11, 0.75, 3.35, { tone: "hi", crease: "lo" }, 28, { bevel: 0 });

const rail = { x: CAST.x + CAST.w, y: WIDE_Y - 1.1, w: 18, d: 2.2, r: 0.15 };
box("cast.rail", rail, 5.2, 1.45, { tone: "mid", crease: "lo" }, "", { owner: "cast.body" });

const riser = { x: 60, y: -12, w: 24, d: 16, r: 0.45 };
box("voter.riser", riser, 0, 3.3, { tone: "mid", crease: "lo" });
box("voter.step", { x: 63, y: 4, w: 18, d: 5.2, r: 0.3 }, 0, 1.45, { tone: "lo", crease: "faint" });
box("voter.rail", { x: 61.1, y: -10, w: 1.15, d: 12, r: 0.15 }, 3.3, 3.6, { tone: "mid", crease: "lo" }, "", { owner: "voter.riser" });
person("voter.a", 68, -4, 3.3);
person("voter.b", 77, -2.2, 3.3);

box("wall.shoe", { x: FIRE.x - 1.7, y: FIRE.y - 1.6, w: FIRE.w + 3.4, d: FIRE.d + 3.2, r: 0.4 }, 0, FIRE_Z, { tone: "lo", crease: "faint" });
box("wall.plate", FIRE, FIRE_Z, FIRE_H, { tone: "mid", crease: "lo" }, "", {
  owner: "wall.shoe",
  inner: L(k.sideSeam(FIRE, FIRE_Z + 20, P, 4), { tone: "lo" }),
});
box(
  "wall.cap",
  { x: FIRE.x - 0.8, y: FIRE.y - 0.8, w: FIRE.w + 1.6, d: FIRE.d + 1.6, r: 0.25 },
  FIRE_Z + FIRE_H,
  1.35,
  { tone: "mid", crease: "lo" },
  "",
  { owner: "wall.plate" },
);
box("wall.rib.a", { x: FIRE.x + FIRE.w, y: -36, w: 0.85, d: 16, r: 0.1 }, 14, 20, { tone: "mid", crease: "lo" }, "", { owner: "wall.plate" });
box("wall.rib.b", { x: FIRE.x + FIRE.w, y: -8, w: 0.85, d: 14, r: 0.1 }, 12, 18, { tone: "mid", crease: "lo" }, "", { owner: "wall.plate" });

box("slot.body", SLOT, 0, 12, { tone: "hi", crease: "lo" });
const throatTop = 14.1;
const mouth = loop(
  [
    [SLOT.x + 13.2, THIN_Y - 0.55, throatTop + 0.04],
    [SLOT.x + 18.8, THIN_Y - 0.55, throatTop + 0.04],
    [SLOT.x + 18.8, THIN_Y + 0.55, throatTop + 0.04],
    [SLOT.x + 13.2, THIN_Y + 0.55, throatTop + 0.04],
  ],
  "hi",
);
box("slot.throat", { x: SLOT.x + 11, y: THIN_Y - 4, w: 10, d: 8, r: 0.35 }, 12, 2.1, { tone: "mid", crease: "lo" }, mouth, { owner: "slot.body" });

const slotOut = boss("slot.out", [SLOT.x + SLOT.w, THIN_Y, THIN_Z], [1, 0, 0], THIN_R * 1.52, 2.15, "slot.body");
box("podium.body", POD, 0, POD_H, { tone: "hi", crease: "lo" });
box(
  "podium.top",
  { x: POD.x - 1.5, y: POD.y - 1.5, w: POD.w + 3, d: POD.d + 3, r: 0.7 },
  POD_H,
  1.65,
  { tone: "mid", crease: "lo" },
  "",
  { owner: "podium.body" },
);
const podIn = boss("podium.in", [POD.x, THIN_Y, THIN_Z], [-1, 0, 0], THIN_R * 1.52, 2.15, "podium.body");
const valveHalf = 1.9;
const gap0 = DIAL[0] - valveHalf - slotOut[0];
const gap1 = DIAL[0] + valveHalf - slotOut[0];
pipe("lane.thin", [slotOut, podIn], THIN_R, "mid", [[gap0, gap1]]);

const valveF = G.frameAlong([DIAL[0], THIN_Y, THIN_Z], [1, 0, 0]);
put(
  "meter.valve",
  [DIAL[0], THIN_Y, THIN_Z],
  S(G.disc(-valveHalf, valveHalf, 2.45, valveF, P), { tone: "mid", crease: "lo" }),
  [record(A.disc(valveF, -valveHalf, valveHalf, 2.45, { name: "meter.valve", owner: "lane.thin" }))],
);
puck("meter.neck", DIAL[0], DIAL[1], THIN_Z + 2.2, DIAL_Z - (THIN_Z + 2.2), 1.45, { tone: "mid", crease: "lo" }, 16, { owner: "lane.thin", bevel: 0 });

const dialTicks = k.radialTicks(DIAL[0], DIAL[1], DIAL_R - 2.2, 40, 5, DIAL_TOP, [1.15, 2.35], P);
const dialLines = [
  L(k.knurl(DIAL[0], DIAL[1], DIAL_R, DIAL_TOP - 3.1, DIAL_TOP, 72, P, 0), { tone: "lo" }),
  L(k.sideArc(DIAL[0], DIAL[1], DIAL_R, DIAL_TOP - 3.1, P, 48), { tone: "faint" }),
  L(k.ring(DIAL[0], DIAL[1], DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }),
  L(dialTicks.minor, { tone: "lo" }),
  L(dialTicks.major, { tone: "mid" }),
  L(k.ring(DIAL[0], DIAL[1], 1.65, DIAL_TOP, P, 20), { tone: "mid" }),
].join("");
puck("meter.dial", DIAL[0], DIAL[1], DIAL_Z, DIAL_H, DIAL_R, { tone: "hi", crease: "lo" }, 64, { owner: "lane.thin", bevel: 0.2, extra: dialLines });
puck("meter.hub", DIAL[0], DIAL[1], DIAL_TOP, 0.42, 1.55, { tone: "mid", crease: "lo" }, 16, { owner: "lane.thin", bevel: 0 });
const pinOrbit = DIAL_R - 4.2;
const pinAt: [number, number] = [DIAL[0] + Math.sin(CAP) * pinOrbit, DIAL[1] - Math.cos(CAP) * pinOrbit];
puck("meter.stop", pinAt[0], pinAt[1], DIAL_TOP, 3.4, 1.9, { tone: "hi", lit: true, crease: "lo" }, 18, { owner: "lane.thin", bevel: 0, part: "stop" });

[-58, -24, 46, 78, 104].forEach((x, index) => {
  box(
    `clip.${"abcde"[index]}`,
    { x: x - 1.6, y: THIN_Y - 2.3, w: 3.2, d: 4.6, r: 0.25 },
    0,
    THIN_Z - THIN_R + 0.2,
    { tone: "lo", crease: "faint" },
    "",
    { owner: "lane.thin", bevel: 0 },
  );
});

const topZ = POD_H + 1.65;
person("cand", POD.x + 15, THIN_Y, topZ);
puck("podium.mic", POD.x + 7.5, POD.y + POD.d - 3.2, topZ, 6.2, 0.62, { tone: "mid", crease: "lo" }, 12, { bevel: 0 });
const pole: [number, number] = [POD.x + POD.w - 4.2, POD.y + 5.5];
puck("flag.pole", pole[0], pole[1], topZ, 16, 0.62, { tone: "mid", crease: "lo" }, 12, { bevel: 0 });
box(
  "flag.cloth",
  { x: pole[0] + 0.62, y: pole[1] - 0.45, w: 8.4, d: 0.9, r: 0.12 },
  topZ + 8.2,
  4.6,
  { tone: "hi", crease: "lo" },
  "",
  { owner: "flag.pole" },
);
puck("flag.finial", pole[0], pole[1], topZ + 16, 1.35, 0.85, { tone: "hi", crease: "lo" }, 14, { owner: "flag.pole", bevel: 0 });

const COIN_R = 9;
const WIDE_SPAN = { x0: wideOut[0] + COIN_R + 1.2, x1: tankIn[0] - COIN_R - 1.4, y: WIDE_Y, z: WIDE_Z + WIDE_R + 0.12 };
const THIN_SPAN = { x0: slotOut[0] + COIN_R + 1.2, x1: DIAL[0] - DIAL_R - COIN_R - 0.8, y: THIN_Y, z: THIN_Z + THIN_R + 0.12 };
const SIG = { x0: rail.x + 1.4, x1: FIRE.x - COIN_R - 1.5, y: rail.y + rail.d / 2, z: 6.65 };

const spots = [
  { at: [VAULT.x + VAULT.w / 2, WIDE_Y, 16], label: "corporate vault" },
  { at: [TANK.x + TANK.w / 2, WIDE_Y, 12], label: "super PAC tank · no cap" },
  { at: [CAB.x + CAB.w / 2, faceY, cabZ + 8], label: "broadcast · ads only" },
  { at: [68, -4, 8], label: "voters" },
  { at: [FIRE.x + 1, -20, 28], label: "firewall" },
  { at: [SLOT.x + 16, THIN_Y, 8], label: "employee slot" },
  { at: [DIAL[0], DIAL[1], DIAL_TOP], label: "$5,000 stop" },
  { at: [POD.x + 15, THIN_Y, topZ + 4], label: "podium" },
  { at: blindEnd, label: "blind flange · no gift" },
];

A.settle(R, P);
R.items.sort((a: { key: number }, b: { key: number }) => a.key - b.key);
A.auditOrExit(R, P);

const named = new Set(R.items.map((item: { name: string }) => item.name.replace(/:\d+$/, "").replace(/\.flange\d$/, "")));
const partCount = named.size;

const lastWith = (prefix: string) => {
  let found = -1;
  R.items.forEach((item: { name: string }, index: number) => {
    if (item.name === prefix || item.name.startsWith(`${prefix}:`) || item.name.startsWith(`${prefix}.`)) found = index;
  });
  return found;
};
let signalAt = -1;
R.items.forEach((item: { name: string }, index: number) => {
  if (item.name.startsWith("cast.") || item.name.startsWith("wall.")) signalAt = Math.max(signalAt, index);
});
const slots = new Map<number, string>();
const wideAt = lastWith("lane.wide");
const thinAt = lastWith("lane.thin");
if (wideAt < 0 || thinAt < 0 || signalAt < 0) throw new Error("missing coin slot");
slots.set(wideAt, `<g data-part="coins-wide"></g>`);
slots.set(thinAt, `<g data-part="coins-pac"></g>`);
slots.set(signalAt, `<g data-part="coin-signal"></g>`);

const items = R.items
  .map((item: { name: string; key: number; svg: string; part?: string }, index: number) => {
    const attrs = [`class="it"`, `data-name="${item.name}"`, `data-k="${item.key.toFixed(3)}"`];
    if (item.part) attrs.push(`data-part="${item.part}"`);
    return `<g ${attrs.join(" ")}>${item.svg}</g>${slots.get(index) ?? ""}`;
  })
  .join("");

const coinSvg = S(k.cylinder(0, 0, COIN_R, 0, 1.8, P, 28, 0.08), { tone: "hi", crease: "lo" });
const needleD = k.lineOnTop(
  [DIAL[0] + Math.sin(REST) * 2.05, DIAL[1] - Math.cos(REST) * 2.05],
  [DIAL[0] + Math.sin(REST) * (DIAL_R - 2.2), DIAL[1] - Math.cos(REST) * (DIAL_R - 2.2)],
  DIAL_TOP + 0.35,
  P,
);
const needle = `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleD}" style="stroke-width:1.1"/>`;

for (const spot of spots) {
  const [x, y] = at(spot.at);
  console.log("hover", spot.label, (x / WIDTH).toFixed(3), (y / HEIGHT).toFixed(3));
}
console.log("spans", JSON.stringify({ wide: WIDE_SPAN, thin: THIN_SPAN, sig: SIG }));

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A campaign-finance bench. A corporate vault feeds a wide pipe into a super PAC tank with no ceiling, then a broadcast facing two voters. A firewall stands between that and a podium. The vault port toward the podium is capped. Employee gifts take a thin pipe through a dial that stops at 5,000 dollars and only then reach the podium.",
  body: [halo, items, needle],
});

const live = `
const P = ${JSON.stringify(P)};
const DIAL = ${JSON.stringify(DIAL)};
const DIAL_R = ${DIAL_R};
const DIAL_TOP = ${DIAL_TOP};
const FILL = ${JSON.stringify(FILL)};
const FILL_H = ${FILL_H};
const FLOOR_H = ${FLOOR_H};
const WIDE = ${JSON.stringify(WIDE_SPAN)};
const THIN = ${JSON.stringify(THIN_SPAN)};
const SIG = ${JSON.stringify(SIG)};
const COIN = ${JSON.stringify(coinSvg)};
const SPOTS = ${JSON.stringify(spots.map((spot) => ({ at: spot.at, label: spot.label })))};
const REST = ${REST};
const CAP = ${CAP};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const live = document.querySelector("[data-live]");
const fill = svg.querySelector('[data-part="fill"]');
const bars = svg.querySelector("[data-part=bars]");
const needle = svg.querySelector('[data-part="needle"]');
const wideSlot = svg.querySelector('[data-part="coins-wide"]');
const pacSlot = svg.querySelector('[data-part="coins-pac"]');
const signalSlot = svg.querySelector('[data-part="coin-signal"]');
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const frozen = reduced;
const SVGNS = "http://www.w3.org/2000/svg";
let treasury = 0, employees = 0, signal = 0;
let tTarget = 0, eTarget = 0, sTarget = 0;
let tankDollars = 0, ssf = 0;
let beatName = "tank";
let frame = 0, last = 0, clock = 0, touring = !frozen, hovering = false, idleTimer = 0, said = "";
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const needleAt = (turn) => {
  const angle = REST + (CAP - REST) * turn;
  const inner = 2.05;
  const outer = DIAL_R - 2.2;
  return lineOnTop(
    [DIAL[0] + Math.sin(angle) * inner, DIAL[1] - Math.cos(angle) * inner],
    [DIAL[0] + Math.sin(angle) * outer, DIAL[1] - Math.cos(angle) * outer],
    DIAL_TOP + 0.35,
    P,
  );
};
const fillSvg = (h) => solidSvg(slabOf({ x: FILL.x, y: FILL.y, w: FILL.w, d: FILL.d, r: FILL.r }, FLOOR_H, Math.max(0.45, h), P, 4, 0.15), { tone: "hi", crease: "lo" });
function say(text) {
  if (text === said) return;
  said = text;
  if (readout) readout.textContent = text;
  if (live) live.textContent = text;
}
function beatLine() {
  if (beatName === "cap") return ssf >= 5000 ? "PAC $5,000 cap" : "PAC " + money(ssf) + " / $5,000";
  if (beatName === "firewall") return "signal stops at the firewall";
  return "treasury flooding · tank " + money(tankDollars);
}
function ensure(slot, count) {
  while (slot.children.length < count) {
    const node = document.createElementNS(SVGNS, "g");
    node.innerHTML = COIN;
    slot.appendChild(node);
  }
}
function syncCoins(slot, poses) {
  if (!slot) return;
  ensure(slot, poses.length);
  poses.forEach((pose, index) => {
    const node = slot.children[index];
    if (!pose) {
      node.setAttribute("opacity", "0");
      return;
    }
    node.setAttribute("opacity", String(pose.fade));
    node.setAttribute("transform", translateAlong(P, [pose.x, pose.y, pose.z]));
  });
}
function ride(span, phase, speed, gate) {
  if (gate < 0.22) return null;
  let u = (phase + clock * speed) % 1;
  if (u < 0) u += 1;
  const fade = u < 0.1 ? u / 0.1 : u > 0.9 ? (1 - u) / 0.1 : 1;
  return { x: span.x0 + (span.x1 - span.x0) * u, y: span.y, z: span.z, fade: fade };
}
function draw() {
  const shown = FILL_H * (1 - Math.exp(-tankDollars / 14000));
  if (fill) fill.innerHTML = fillSvg(shown);
  if (bars) bars.setAttribute("opacity", String(0.2 + 0.8 * signal));
  if (needle) needle.setAttribute("d", needleAt(Math.min(1, ssf / 5000)));
  syncCoins(wideSlot, [ride(WIDE, 0, 0.36, treasury), ride(WIDE, 0.48, 0.36, treasury)]);
  syncCoins(pacSlot, [ride(THIN, 0.12, 0.4, employees), ride(THIN, 0.58, 0.4, employees)]);
  const sig = signal < 0.04 ? null : { x: SIG.x0 + (SIG.x1 - SIG.x0) * signal, y: SIG.y, z: SIG.z, fade: Math.min(1, signal * 4) };
  syncCoins(signalSlot, [sig]);
  stage.dataset.beat = beatName;
  stage.dataset.tank = String(Math.round(tankDollars));
  stage.dataset.ssf = String(Math.round(ssf));
  stage.dataset.signal = signal.toFixed(3);
  if (!hovering) say(beatLine());
}
function nearest(event) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  let best = null;
  let bestD = 72;
  for (const spot of SPOTS) {
    const p = iso(spot.at, P);
    const pt = svg.createSVGPoint();
    pt.x = p[0];
    pt.y = p[1];
    const sp = pt.matrixTransform(ctm);
    const d = Math.hypot(event.clientX - sp.x, event.clientY - sp.y);
    if (d < bestD) {
      bestD = d;
      best = spot;
    }
  }
  return best;
}
function run() {
  if (!frame && touring && !frozen) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}
function resume() {
  if (frozen || hovering) return;
  touring = true;
  run();
}
function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(resume, 3600);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring && !frozen) {
    clock += dt;
    const beat = clock % 12;
    if (beat < 4) {
      beatName = "tank";
      tTarget = 1;
      eTarget = 0;
      sTarget = 0;
    } else if (beat < 8) {
      beatName = "cap";
      tTarget = 0;
      eTarget = 1;
      sTarget = 0;
    } else {
      beatName = "firewall";
      tTarget = 0;
      eTarget = 0;
      sTarget = 1;
    }
  }
  const follow = 1 - Math.exp(-dt / 0.28);
  treasury += (tTarget - treasury) * follow;
  employees += (eTarget - employees) * follow;
  signal += (sTarget - signal) * follow;
  tankDollars += treasury * 36000 * dt;
  ssf += employees * 2400 * dt;
  if (ssf > 5000) ssf = 5000;
  draw();
  frame = touring && !frozen ? requestAnimationFrame(tick) : 0;
}
function onPoint(event) {
  const hit = nearest(event);
  if (hit) {
    hovering = true;
    touring = false;
    clearTimeout(idleTimer);
    say(hit.label);
    return;
  }
  if (!hovering) return;
  hovering = false;
  say(beatLine());
  if (!frozen) takeOver();
}
stage.addEventListener("pointermove", onPoint);
stage.addEventListener("mousemove", onPoint);
window.addEventListener("pointermove", onPoint, true);
window.addEventListener("mousemove", onPoint, true);
stage.addEventListener("pointerleave", () => {
  if (!hovering) return;
  hovering = false;
  say(beatLine());
  if (!frozen) takeOver();
});
stage.addEventListener("keydown", (event) => {
  let used = true;
  if (event.key === "ArrowUp") tTarget = Math.min(1, tTarget + 0.1);
  else if (event.key === "ArrowDown") tTarget = Math.max(0, tTarget - 0.1);
  else if (event.key === "ArrowRight") eTarget = Math.min(1, eTarget + 0.1);
  else if (event.key === "ArrowLeft") eTarget = Math.max(0, eTarget - 0.1);
  else if (event.key === " " || event.key === "Spacebar") {
    tTarget = 0;
    eTarget = 0;
    sTarget = 0;
    treasury = 0;
    employees = 0;
    signal = 0;
    tankDollars = 0;
    ssf = 0;
  } else used = false;
  if (!used) return;
  event.preventDefault();
  if (frozen) {
    treasury = tTarget;
    employees = eTarget;
    signal = sTarget;
    draw();
    return;
  }
  takeOver();
});
draw();
run();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Campaign finance bench",
  hint: "Arrows · hover",
  readout: "treasury flooding · tank $0",
  keys: [
    { mark: "lit", label: "The $5,000 needle and its stop" },
    { mark: "raised", label: "Wide pipe: treasury into the super PAC, no ceiling" },
    { mark: "dim", label: "Thin pipe: employee gifts, capped at $5,000" },
  ],
  caption:
    "The vault is corporate treasury. It fills the super PAC tank through the wide pipe with no ceiling, and that tank only feeds the broadcast aimed at the voters. The capped port on the vault faces the podium and does not connect. A full-height plate is the firewall. Employee gifts take the thin pipe; the needle stops at $5,000 per candidate per election, and only that pipe reaches the podium. A super PAC does not give to the candidate. Arrow keys set the two inputs. Space clears both. Hover names a part and pauses the tour.",
  body: `<style>.iso-stage{touch-action:pan-y;outline:none}</style><div class="iso-stage" tabindex="0" data-beat="tank" data-tank="0" data-ssf="0" data-signal="0" role="group" aria-roledescription="animated figure" aria-label="Campaign finance bench. Arrow up and down set treasury. Arrow left and right set employee gifts. Space clears both. Hover a part to name it."><span data-live style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);border:0">treasury flooding · tank $0</span>${svg}</div>`,
});

const page = k.pageHtml({ title: "Campaign finance bench", theme, body, script: kitScript() + live, width: 780 });
const file = theme === "light" ? "money-loop-light.html" : "money-loop.html";
writeFileSync(join(HERE, file), page);
if (theme === "light") {
  mkdirSync(join(ROOT, "docs"), { recursive: true });
  writeFileSync(join(ROOT, "docs/index.html"), page);
  writeFileSync(join(ROOT, "index.html"), page);
}
console.log("wrote", file, "parts", partCount, "items", R.items.length);
