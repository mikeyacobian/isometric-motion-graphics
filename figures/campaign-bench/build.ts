import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import {
  ADS_RATE,
  SSF_LIMIT,
  SSF_RATE,
  adsRateOf,
  createCycle,
  describeOf,
  dollars,
  readoutOf,
  resetCycle,
  ssfRateOf,
  step,
} from "./model.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 380;
const PLATE = { x: -128, y: -64, w: 262, d: 128, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const VAT = [-96, 16];
const VAT_R = 14;
const VAT_H = 26;
const HOPPER = [-96, -30];
const HOPPER_R = 7.5;
const HOPPER_H = 14;
const SPAC = { x: 28, y: 4, w: 26, d: 24, r: 2.2 };
const SPAC_H = 16;
const HORN_AT: [number, number, number] = [54, 16, 16];
const HORN_LEN = 19;
const HORN_NECK = 5.4;
const HORN_R0 = 4;
const HORN_R1 = 10;
const WALL = { x: 100, y: -22, w: 4, d: 26, r: 1.2 };
const WALL_H = 32;
const CUP = [118, -30];
const CUP_R = 8.2;
const CUP_H = 13;
const METER = [8, -30];
const METER_R = 11;
const DIAL_H = 6;
const DIAL_TOP = 23;
const KNOB_Z = VAT_H + 4;
const FLOW_Z = 16;
const SSF_Z = 8;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [VAT[0], VAT[1], VAT_H + 12],
    [HORN_AT[0] + HORN_LEN + 4, HORN_AT[1], HORN_AT[2] + 12],
    [CUP[0] + CUP_R, CUP[1], CUP_H + 4],
    [WALL.x + WALL.w, WALL.y + WALL.d, WALL_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 48 },
);

const at = (point: number[]) => k.iso(point as [number, number, number], P);
const S = (paths: unknown, style?: object) => k.solidSvg(paths, style);
const L = (d: string, style?: object) => k.lineSvg(d, style);
const D = (points: number[][], style?: object) => k.dotsSvg(points, style);
const byDepth = (points: number[][]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const R = A.recorder(P);
const record = R.solid;
function put(name: string, ref: number[], svg: string, shapes: unknown[] = [], extra: Record<string, unknown> = {}) {
  return R.put({ name, at: ref, svg, shapes, piece: "bench", ...extra });
}

function box(name: string, plan: { x: number; y: number; w: number; d: number; r: number }, z: number, h: number, style: object = {}, extra = "", owner?: string) {
  const shape = record(A.slab(plan, z, h, { name, owner }, 4));
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, 4, 0.5), { tone: "mid", ...style }) + extra, [shape]);
}

function post(name: string, x: number, y: number, z: number, h: number, r: number, style: object = {}) {
  const shape = record(A.cylinder(x, y, r, z, h, { name }));
  put(name, [x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, 24), { tone: "mid", crease: "none", ...style }), [shape]);
}

function puck(name: string, x: number, y: number, z: number, h: number, r: number, style: object = {}, steps = 32, bevel = 0.4, extra = "", owner?: string) {
  const shape = record(A.cylinder(x, y, r, z, h, { name, owner }));
  put(name, [x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape]);
}

function boss(name: string, origin: number[], axis: number[], r: number, h: number, owner: string) {
  const F = G.frameAlong(origin, axis);
  const shape = record(A.disc(F, 0, h, r, { name, owner }));
  put(name, G.add3(origin, G.mul3(axis, h / 2)), S(G.disc(0, h, r, F, P), { tone: "mid" }), [shape]);
  return G.add3(origin, G.mul3(axis, h));
}

function flange(name: string, centre: number[], axis: number[], r: number, thick: number, owner: string, tone = "hi") {
  const F = G.frameAlong(centre, axis);
  const shape = record(A.disc(F, -thick / 2, thick / 2, r, { name, owner }));
  put(name, centre, S(G.disc(-thick / 2, thick / 2, r, F, P), { tone }), [shape]);
}

function pipe(name: string, control: number[][], r: number, { tone = "hi", bands = [] as number[], extra = [] as number[][], flangeR = 1.45, touch } = {}) {
  const line = G.fillet(control, Math.max(r * 2.6, 4), 12, { P, tube: r });
  const total = G.pathLength(line);
  const thick = Math.max(0.9, r * 0.55);
  const gaps: number[][] = [
    [0, thick],
    [total - thick, total],
    ...bands.map((share) => {
      const along = total * share;
      const t = Math.max(0.8, r * 0.7);
      return [along - t / 2, along + t / 2];
    }),
    ...extra,
  ];
  R.route(name, line, r, { owner: name, gaps, rims: [r * flangeR, r * flangeR], piece: "bench", touch });
  tubePieces(line, r, P, { maxLength: 28, spacing: Math.max(0.8, r * 0.2), gaps }).forEach((piece: { mid: number[]; points: number[][]; radii: number[] }, index: number) => {
    put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { bias: 0, route: name, chunk: index });
  });
  [[0, -1], [total, 1]].forEach(([along, sign], index) => {
    const tangent = G.tangentAlong(line, along);
    const centre = G.add3(G.pointAlong(line, along), G.mul3(tangent, (-sign * thick) / 2));
    flange(`${name}.flange${index}`, centre, tangent, r * flangeR, thick, name, tone);
  });
  for (const share of bands) {
    const along = total * share;
    const tangent = G.tangentAlong(line, along);
    flange(`${name}.band`, G.pointAlong(line, along), tangent, r * 1.16, Math.max(0.8, r * 0.7), name, "mid");
  }
  return line;
}

function hornRadius(s: number) {
  if (s <= HORN_NECK) return HORN_R0;
  const t = (s - HORN_NECK) / (HORN_LEN - HORN_NECK);
  return HORN_R0 + (HORN_R1 - HORN_R0) * t * t * (3 - 2 * t);
}

function hornSlope(s: number) {
  if (s <= HORN_NECK) return 0;
  const span = HORN_LEN - HORN_NECK;
  const t = (s - HORN_NECK) / span;
  return ((HORN_R1 - HORN_R0) * 6 * t * (1 - t)) / span;
}

const back: string[] = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
  back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
back.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
const screws = k.corners(PLATE, 10);
back.push(L(screws.map(([x, y]: number[]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(D(screws.map(([x, y]: number[]) => at([x, y, 0])), { size: 0.5 }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));

const strip = { x: -110, y: PLATE.y + PLATE.d - 15, w: 230, d: 7, r: 1 };
back.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
back.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
back.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));

const label = { x: -118, y: -56, w: 32, d: 12, r: 1.2 };
back.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
back.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }));
back.push(L([20, 14, 11].map((w, i) => k.lineOnTop([label.x + 4, label.y + 3.2 + i * 2.8], [label.x + 4 + w, label.y + 3.2 + i * 2.8], 0.8, P)).join(""), { tone: "lo", free: true }));
back.push(D([at([label.x + label.w - 2.4, label.y + 2.2, 0.8]), at([label.x + label.w - 2.4, label.y + label.d - 2.2, 0.8])], { size: 0.45 }));

box("rail.rear", { x: -103, y: 36, w: 210, d: 5, r: 1 }, 0, 3, { tone: "mid" });
box("rail.front", { x: -65, y: -52, w: 172, d: 5, r: 1 }, 0, 3, { tone: "mid" });
for (const x of [-108, 107]) {
  box(`rail.stop-rear-${x}`, { x, y: 34, w: 5, d: 9, r: 1 }, 0, 6, { tone: "mid" }, D([at([x + 2.5, 36, 6]), at([x + 2.5, 41, 6])], { size: 0.4 }));
}
for (const x of [-70, 107]) {
  box(`rail.stop-front-${x}`, { x, y: -54, w: 5, d: 9, r: 1 }, 0, 6, { tone: "mid" }, D([at([x + 2.5, -52, 6]), at([x + 2.5, -47, 6])], { size: 0.4 }));
}

puck("vat.pad", VAT[0], VAT[1], 0, 2.2, VAT_R + 4, { tone: "lo" }, 40, 0.4);
puck("vat.body", VAT[0], VAT[1], 2.2, VAT_H - 2.2, VAT_R, { tone: "hi", crease: "lo" }, 48, 0.8, L(k.sideArc(VAT[0], VAT[1], VAT_R, 14, P, 24), { tone: "faint" }));
puck("vat.lid", VAT[0], VAT[1], VAT_H, 2, VAT_R + 0.8, { tone: "hi" }, 40, 0.4, L(k.ring(VAT[0], VAT[1], VAT_R - 3.4, VAT_H + 2, P, 40), { tone: "faint" }));
puck("vat.collar", VAT[0], VAT[1], VAT_H + 2, 2, 4, { tone: "mid" }, 24);
put(
  "vat.knob",
  [VAT[0], VAT[1], KNOB_Z + 2],
  S(k.cylinder(VAT[0], VAT[1], 5.4, KNOB_Z, 4, P, 28), { tone: "mid" }) + L(k.knurl(VAT[0], VAT[1], 5.4, KNOB_Z, KNOB_Z + 4, 32, P), { tone: "lo" }) + D([at([VAT[0], VAT[1], KNOB_Z + 4])], { size: 0.5, tone: "hi" }),
  [record(A.cylinder(VAT[0], VAT[1], 5.4, KNOB_Z, 4, { name: "vat.knob" }))],
);
const blankAt = [VAT[0], VAT[1] - VAT_R, 12];
const blankPort = boss("vat.blank", blankAt, [0, -1, 0], 3.8, 2.2, "vat.body");
const capF = G.frameAlong(blankPort, [0, -1, 0]);
put("vat.cap", G.add3(blankPort, [0, -0.9, 0]), S(G.disc(0, 1.8, 2.8, capF, P), { tone: "lo" }), [record(A.disc(capF, 0, 1.8, 2.8, { name: "vat.cap", owner: "vat.body" }))]);

puck("hopper.pad", HOPPER[0], HOPPER[1], 0, 1.8, HOPPER_R + 3, { tone: "lo" }, 28);
puck("hopper.body", HOPPER[0], HOPPER[1], 1.8, HOPPER_H, HOPPER_R, { tone: "mid" }, 32, 0.5);
puck("hopper.rim", HOPPER[0], HOPPER[1], 1.8 + HOPPER_H, 1.4, HOPPER_R + 1.3, { tone: "mid" }, 28, 0.4, L(k.ring(HOPPER[0], HOPPER[1], HOPPER_R - 2.2, 1.8 + HOPPER_H, P, 24), { tone: "faint" }));

const wallPosts: [number, number][] = [
  [WALL.x + WALL.w / 2, WALL.y + 3.6],
  [WALL.x + WALL.w / 2, WALL.y + WALL.d - 3.6],
];
for (const [x, y] of byDepth(wallPosts)) {
  puck(`wall.foot-${y}`, x, y, 0, 2, 3.2, { tone: "lo" }, 18);
  post(`wall.post-${y}`, x, y, 2, WALL_H - 2, 2.2);
  puck(`wall.cap-${y}`, x, y, WALL_H, 1.6, 2.8, { tone: "mid" }, 18);
}
const pane = { x: WALL.x, y: WALL.y + 5.8, w: WALL.w, d: WALL.d - 11.6, r: 0.6 };
box("wall.pane", pane, 3, WALL_H - 5, { tone: "hi", crease: "faint" }, L(k.planOutline(k.insetPlan(pane, 0.8), WALL_H - 2, P, 3), { tone: "faint" }));

box("spac.pad", { x: SPAC.x - 3, y: SPAC.y - 3, w: SPAC.w + 6, d: SPAC.d + 6, r: 2.4 }, 0, 1.8, { tone: "lo" });
box(
  "spac.box",
  SPAC,
  1.8,
  SPAC_H,
  { tone: "hi", crease: "lo" },
  L(k.planOutline(k.insetPlan(SPAC, 2.4), 1.8 + SPAC_H, P, 3), { tone: "faint" }) +
    D(
      [at([SPAC.x + 3.4, SPAC.y + 3.4, 1.8 + SPAC_H]), at([SPAC.x + SPAC.w - 3.4, SPAC.y + 3.4, 1.8 + SPAC_H]), at([SPAC.x + 3.4, SPAC.y + SPAC.d - 3.4, 1.8 + SPAC_H])],
      { size: 0.4 },
    ),
);

const hornF = G.frameAlong(HORN_AT, [1, 0, 0]);
const hornProfile: number[][] = [
  [0, HORN_R0],
  [HORN_NECK, HORN_R0],
];
for (let i = 1; i <= 18; i++) {
  const s = HORN_NECK + ((HORN_LEN - HORN_NECK) * i) / 18;
  hornProfile.push([s, hornRadius(s), 1]);
}
put(
  "horn.body",
  G.add3(HORN_AT, [HORN_LEN / 2, 0, 0]),
  `<g data-part="lamp">${S(G.solidOf(hornProfile, hornF, P, { smooth: { slope: hornSlope }, bevel: 0.3 }), { tone: "hi", lit: true, crease: "lo" })}${L(G.circleOf(hornF, HORN_LEN, HORN_R1 - 1.5, P, 32), { tone: "mid" })}${L(G.arcOf(hornF, HORN_NECK, HORN_R0, P), { tone: "faint" })}${D(G.dotsOf(hornF, HORN_LEN, HORN_R1 * 0.4, 7, P, { all: true }), { size: 0.45, tone: "hi", pulse: true })}</g>`,
  [record(A.solid(hornF, hornProfile, { name: "horn.body", radius: hornRadius }))],
);

const plinth = { x: 76, y: 6, w: 20, d: 26, r: 2 };
box("voters.pad", plinth, 0, 1.6, { tone: "lo" }, "", "voters");
[14, 18, 22].forEach((height, index) => {
  const card = { x: 79, y: 8 + index * 8, w: 10, d: 6.4, r: 1 };
  box(`voters.card-${index}`, card, 1.6, height, { tone: "hi", crease: "lo" }, L(k.planOutline(k.insetPlan(card, 1.6), 1.6 + height, P, 3), { tone: "faint" }), "voters");
});

puck("cup.pad", CUP[0], CUP[1], 0, 1.6, CUP_R + 3, { tone: "lo" }, 28);
puck("cup.body", CUP[0], CUP[1], 1.6, CUP_H, CUP_R, { tone: "hi", crease: "lo" }, 32, 0.5);
puck("cup.rim", CUP[0], CUP[1], 1.6 + CUP_H, 1.2, CUP_R + 1.1, { tone: "hi" }, 28, 0.4, L(k.ring(CUP[0], CUP[1], CUP_R - 2.4, 1.6 + CUP_H, P, 24), { tone: "faint" }));

const adsSkin = [VAT[0] + VAT_R, VAT[1], FLOW_Z];
const adsPort = boss("vat.outlet", adsSkin, [1, 0, 0], 6, 3, "vat.body");
const adsInSkin: [number, number, number] = [SPAC.x, SPAC.y + SPAC.d / 2, FLOW_Z];
const adsIn = boss("spac.inlet", adsInSkin, [-1, 0, 0], 6.2, 3, "spac.box");
const wideLine = pipe("lane.ads", [adsPort, adsIn], 4.2, { tone: "hi", bands: [0.5], flangeR: 1.2 });

const ssfFromSkin: [number, number, number] = [HOPPER[0] + HOPPER_R, HOPPER[1], SSF_Z];
const ssfFrom = boss("hopper.outlet", ssfFromSkin, [1, 0, 0], 2.4, 2.2, "hopper.body");
const ssfToSkin: [number, number, number] = [CUP[0] - CUP_R, CUP[1], SSF_Z];
const ssfTo = boss("cup.inlet", ssfToSkin, [-1, 0, 0], 2.4, 2.2, "cup.body");
const meterAlong = METER[0] - ssfFrom[0];
const valveHalf = 6.2;
const gapHalf = 6.8;
const narrowLine = pipe("lane.ssf", [ssfFrom, ssfTo], 1.45, {
  tone: "mid",
  extra: [[meterAlong - gapHalf, meterAlong + gapHalf]],
  flangeR: 1.38,
  touch: ["meter.valve", "meter.neck"],
});
const valveF = G.frameAlong([METER[0], METER[1], SSF_Z], [1, 0, 0]);
put(
  "meter.valve",
  [METER[0], METER[1], SSF_Z],
  S(G.disc(-valveHalf, valveHalf, 3, valveF, P), { tone: "mid" }),
  [record(A.disc(valveF, -valveHalf, valveHalf, 3, { name: "meter.valve", owner: "lane.ssf" }))],
);
puck("meter.neck", METER[0], METER[1], 11, DIAL_TOP - DIAL_H - 11, 2, { tone: "mid", crease: "none" }, 20, 0, "", "lane.ssf");
puck("meter.dial", METER[0], METER[1], DIAL_TOP - DIAL_H, DIAL_H, METER_R, { tone: "hi", crease: "lo" }, 56, 0.7, "", "lane.ssf");
const dialTicks = k.radialTicks(METER[0], METER[1], METER_R - 2.6, 40, 5, DIAL_TOP, [1.2, 2.6], P, -0.75 * Math.PI, 1.5 * Math.PI);
const dialFace =
  L(k.knurl(METER[0], METER[1], METER_R, DIAL_TOP - 2.8, DIAL_TOP, 64, P, 0.3), { tone: "lo" }) +
  L(k.sideArc(METER[0], METER[1], METER_R, DIAL_TOP - 2.8, P, 36), { tone: "faint" }) +
  L(k.ring(METER[0], METER[1], METER_R - 2, DIAL_TOP, P, 48), { tone: "lo" }) +
  L(dialTicks.minor, { tone: "lo" }) +
  L(dialTicks.major, { tone: "mid" }) +
  L(k.ring(METER[0], METER[1], 1.6, DIAL_TOP, P, 16), { tone: "mid" });

const flowWide = L(k.pathOf(wideLine.map((p: number[]) => at(p))), { tone: "mid", flow: true, className: "lane-ads" });
const flowNarrow = L(k.pathOf(narrowLine.map((p: number[]) => at(p))), { tone: "mid", flow: true, className: "lane-ssf" });

const needleAt = (share: number) => {
  const angle = -0.75 * Math.PI + share * 1.5 * Math.PI;
  const x = METER[0];
  const y = METER[1];
  return k.lineOnTop([x - Math.sin(angle) * 2.4, y + Math.cos(angle) * 2.4], [x + Math.sin(angle) * (METER_R - 3.4), y - Math.cos(angle) * (METER_R - 3.4)], DIAL_TOP + 0.2, P);
};

const dialItem = R.items.find((item: { name: string }) => item.name === "meter.dial");
if (dialItem) dialItem.svg += dialFace;
const knobItem = R.items.find((item: { name: string }) => item.name === "vat.knob");
if (knobItem) knobItem.svg = `<g data-part="knob">${knobItem.svg}</g>`;

A.settle(R, P);
R.items.sort((a: { key: number }, b: { key: number }) => a.key - b.key);
A.auditOrExit(R, P);

const named = new Set(R.items.map((item: { name: string }) => item.name.replace(/:\d+$/, "").replace(/\.flange\d$/, "").replace(/\.band$/, "")));
const partCount = named.size;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A two-lane campaign-finance flow bench on a surface plate. A treasury vat feeds a wide unmetered duct into a Super PAC box whose flared lamp aims at three standing voter blocks, stopped by a glass partition from a candidate cup. A separate hopper of voluntary drops feeds a narrow metered line, capped at five thousand dollars per election, into the cup. A blanked flange on the vat shows that treasury money cannot go to the candidate.",
  body: [
    back.join(""),
    R.items.map((item: { svg: string }) => item.svg).join(""),
    `<g data-flow-layer>${flowWide}${flowNarrow}</g>`,
    `<g data-part="fill">${S(k.cylinder(CUP[0], CUP[1], CUP_R - 2.6, 2.2, 1, P, 20), { tone: "hi" })}</g>`,
    `<path data-part="needle" class="iso-line" data-tone="hi" data-free="start" d="${needleAt(0)}" style="stroke-width:1.1"/>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const METER = ${JSON.stringify(METER)};
const METER_R = ${METER_R};
const DIAL_TOP = ${DIAL_TOP};
const CUP = ${JSON.stringify(CUP)};
const CUP_R = ${CUP_R};
const CUP_H = ${CUP_H};
const SSF_LIMIT = ${SSF_LIMIT};
const ADS_RATE = ${ADS_RATE};
const SSF_RATE = ${SSF_RATE};
${createCycle.toString()}
${resetCycle.toString()}
${step.toString()}
${adsRateOf.toString()}
${ssfRateOf.toString()}
${dollars.toString()}
${readoutOf.toString()}
${describeOf.toString()}
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const knob = svg.querySelector('[data-part="knob"]');
const fill = svg.querySelector('[data-part="fill"]');
const needle = svg.querySelector('[data-part="needle"]');
const adsFlow = svg.querySelector(".lane-ads");
const ssfFlow = svg.querySelector(".lane-ssf");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const cycle = createCycle();
let pressure = 0, target = 0, frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0, wrapped = 0;
const tourAt = (t) => {
  const u = t % 10;
  if (u < 0.5) return 0;
  if (u < 1.7) return (u - 0.5) / 1.2;
  if (u < 8) return 1;
  if (u < 8.8) return 1 - (u - 8) / 0.8;
  return 0;
};
function say() {
  const text = describeOf(cycle);
  stage.setAttribute("aria-valuenow", String(Math.round(cycle.ssfToCandidate)));
  stage.setAttribute("aria-valuetext", text);
}
function draw() {
  if (knob) knob.setAttribute("transform", translateAlong(P, [0, 0, cycle.pressure * 3.2]));
  if (adsFlow) adsFlow.style.opacity = cycle.pressure > 0.04 ? String(0.28 + 0.6 * cycle.pressure) : "0.08";
  if (ssfFlow) ssfFlow.style.opacity = ssfRateOf(cycle) > 0 ? "0.8" : "0.08";
  needle.setAttribute("d", needleAt(cycle.valve));
  fill.innerHTML = solidSvg(cylinder(CUP[0], CUP[1], CUP_R - 2.6, 2.2, Math.max(0.8, 1 + cycle.valve * (CUP_H - 3)), P, 20), { tone: "hi" });
  const text = readoutOf(cycle);
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const lap = Math.floor(clock / 10);
    if (lap !== wrapped) { resetCycle(cycle); wrapped = lap; }
    target = tourAt(clock);
  }
  pressure = calm ? target : pressure + (target - pressure) * (1 - Math.exp(-dt / 0.28));
  if (Math.abs(target - pressure) < 0.002) pressure = target;
  step(cycle, dt, { pressure });
  draw();
  const settled = !touring && pressure === target && Math.abs(cycle.valve - cycle.ssfToCandidate / SSF_LIMIT) < 0.003 && adsRateOf(cycle) === 0 && ssfRateOf(cycle) === 0;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clamp(next, 0, 1);
  say();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = 0; wrapped = 0; resetCycle(cycle); run(); } }, 3600);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("focus", () => { touring = false; clearTimeout(idleTimer); say(); });
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(clamp(1 - (event.clientY - box.top) / box.height, 0, 1));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") to = clamp(target + 0.1, 0, 1);
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") to = clamp(target - 0.1, 0, 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = 1;
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); resetCycle(cycle); to = target; }
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
say();
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Campaign finance bench",
  hint: "Drag ↑ treasury pressure",
  readout: readoutOf(createCycle()),
  keys: [
    { mark: "lit", label: "Independent-expenditure lamp: Super PAC ads aimed at voters, never the candidate" },
    { mark: "raised", label: "Metered SSF line, at most $5,000 per election" },
  ],
  caption:
    "A corporation may send unlimited treasury money to a Super PAC, which cannot give to a candidate and may only spend independently on ads. Treasury money cannot go to a candidate or a traditional PAC. A connected PAC (SSF), funded by voluntary donations, may give a multicandidate $5,000 per election. The candidate cup receives only the metered line.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Campaign finance bench: arrow keys set treasury pressure, space resets the election" aria-valuemin="0" aria-valuemax="5000" aria-valuenow="0">${svg}</div>`,
});

const page = k.pageHtml({ title: "Campaign finance bench", theme, body, script: kitScript() + live, width: 650 });
const file = theme === "light" ? "campaign-bench-light.html" : "campaign-bench.html";
writeFileSync(join(HERE, file), page);
if (theme === "light") {
  mkdirSync(join(ROOT, "docs"), { recursive: true });
  writeFileSync(join(ROOT, "docs/index.html"), page);
  writeFileSync(join(ROOT, "index.html"), page);
}
console.log("wrote", file, "parts", partCount, "items", R.items.length);
