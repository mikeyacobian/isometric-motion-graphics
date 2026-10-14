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

const PIPE_Y = -27;
const PIPE_Z = 10;
const WIDE_R = 4.6;

const VAULT = { x: -110, y: -45, w: 48, d: 36, r: 2 };
const VAULT_H = 18;
const SHAFT = { x: -102, y: -41, w: 28, d: 20, r: 1.3 };
const SHAFT_H = 36;
const ROOF = { x: -106, y: -45, w: 38, d: 30, r: 1.2 };
const ROOF_H = 2.4;
const KNOB = [-87, -30];
const KNOB_R = 4.4;
const KNOB_H = 3.6;

const DOOR = { x: -96, y: VAULT.y + VAULT.d, w: 18, d: 1.6, r: 0.7 };
const DOOR_Z = 1.6;
const DOOR_H = 14.5;

const CHASSIS = { x: -6, y: -46, w: 76, d: 34, r: 1.5 };
const CHASSIS_H = 4;
const BODY = { x: -2, y: -42, w: 44, d: 30, r: 1.6 };
const BODY_H = 15;
const CAB = { x: 42, y: -38, w: 22, d: 22, r: 1.4 };
const CAB_H = 12;
const WHEEL_R = 6.4;
const WHEEL_T = 3.2;
const WHEEL_Y = CHASSIS.y + CHASSIS.d;
const WHEELS = [8, 52];
const SCREEN = { x: CAB.x + CAB.w, y: -35, w: 1.7, d: 14, r: 0.45 };
const SCREEN_Z = 6.4;
const SCREEN_H = 7.6;

const DISH_AT: [number, number, number] = [16, PIPE_Y, CHASSIS_H + BODY_H];
const DISH_MAST_H = 5.6;
const DISH_MAST_R = 1.7;
const DISH_AXIS = [0.08, 0.58, 0.81];
const DISH_S = 5.2;
const DISH_R0 = 1.55;
const DISH_R1 = 11.6;
const DISH_WALL = 0.85;

const PAD = { x: 70, y: -40, w: 56, d: 24, r: 1.6 };
const VOTERS = [
  { x: 80, body: 20 },
  { x: 96, body: 23 },
  { x: 112, body: 18.5 },
];

const FENCE_Y = 28.7;
const FENCE_POSTS = [34, 58];
const POST_R = 1.9;
const POST_H = 11;
const FOOT_R = 3.4;
const BASE_H = 1.8;

const BOOTH = { x: -108, y: 14, w: 40, d: 20, r: 1.6 };
const BOOTH_H = 14;
const BOOTH_ROOF = { x: -112, y: 14, w: 48, d: 20, r: 1.2 };
const BOOTH_ROOF_H = 2;
const SSF_Y = 24;
const SSF_Z = 7;
const NARROW_R = 1.55;
const DONORS = [-102, -84];
const DONOR_BW = 7.4;
const DONOR_BD = 4.2;

const PODIUM = { x: 70, y: SSF_Y - 9, w: 22, d: 18, r: 1.5 };
const PODIUM_H = 13;
const CAND_BW = 9.4;
const CAND = [PODIUM.x + PODIUM.w + CAND_BW / 2, SSF_Y];
const POLE = [CAND[0] + CAND_BW / 2 + 5.5, SSF_Y];
const POLE_R = 1.6;
const POLE_H = 34;
const FLAG = { x: POLE[0] + POLE_R, y: SSF_Y - 1.4, w: 15, d: 1.6, r: 0.3 };
const FLAG_Z = 18;
const FLAG_H = 13;

const METER_R = 11;
const DIAL_H = 6.2;
const DIAL_TOP = 28;
const VALVE_R = 3.5;
const VALVE_HALF = 5.4;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [KNOB[0], KNOB[1], VAULT_H + SHAFT_H + ROOF_H + KNOB_H + 2],
    [DISH_AT[0] + 6, DISH_AT[1] + 14, DISH_AT[2] + DISH_MAST_H + DISH_S + 6],
    [POLE[0], POLE[1], POLE_H + 2],
    [VOTERS[1].x, PIPE_Y, 2 + VOTERS[1].body + 5],
    [0, SSF_Y, DIAL_TOP + 2],
    [FLAG.x + FLAG.w, FLAG.y, FLAG_Z + FLAG_H],
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
const loop = (points: number[][], style?: object) => L(k.pathOf(points.map((point) => at(point)), true), style);

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

function figure(name: string, x: number, y: number, z: number, bodyH: number, bw: number, bd: number, headR: number, headH: number, tone = "hi") {
  const legH = Math.max(5.6, bodyH * 0.4);
  const torsoH = bodyH - legH;
  const legR = Math.min(1.25, bw * 0.15);
  const spread = bw * 0.22;
  for (const side of [-1, 1]) puck(`${name}.leg${side < 0 ? "a" : "b"}`, x + side * spread, y, z, legH, legR, { tone, crease: "lo" }, 16, 0.15);
  const plan = { x: x - bw / 2, y: y - bd / 2, w: bw, d: bd, r: Math.min(1.05, bd / 3.4) };
  box(`${name}.body`, plan, z + legH, torsoH, { tone, crease: "lo" });
  puck(`${name}.head`, x, y, z + bodyH, headH, headR, { tone, crease: "lo" }, 24, 0.25);
}

function wheel(name: string, x: number) {
  const F = G.frameAlong([x, WHEEL_Y, WHEEL_R], [0, 1, 0]);
  const shape = record(A.disc(F, 0, WHEEL_T, WHEEL_R, { name }));
  put(
    name,
    [x, WHEEL_Y + WHEEL_T / 2, WHEEL_R],
    S(G.disc(0, WHEEL_T, WHEEL_R, F, P), { tone: "mid", crease: "lo" }) + L(G.circleOf(F, WHEEL_T, WHEEL_R * 0.42, P, 24), { tone: "lo" }) + D([at([x, WHEEL_Y + WHEEL_T, WHEEL_R])], { size: 0.45 }),
    [shape],
  );
}

function dishOuter(s: number) {
  const t = Math.max(0, Math.min(1, (s - 0.45) / (DISH_S - 0.45)));
  return DISH_R0 + (DISH_R1 - DISH_R0) * t * t;
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

const doorF = G.frameAlong([DOOR.x + DOOR.w / 2, DOOR.y, DOOR_Z + DOOR_H / 2], [0, 1, 0]);
const doorArt =
  L(G.circleOf(doorF, DOOR.d, 5.4, P, 36), { tone: "mid" }) +
  L(G.circleOf(doorF, DOOR.d, 1.5, P, 16), { tone: "lo" }) +
  D([at([DOOR.x + DOOR.w / 2, DOOR.y + DOOR.d, DOOR_Z + DOOR_H / 2])], { size: 0.5, tone: "hi" });

box("vault.body", VAULT, 0, VAULT_H, { tone: "mid", crease: "lo" });
box("vault.door", DOOR, DOOR_Z, DOOR_H, { tone: "hi", crease: "lo" }, doorArt);
const blankPort = boss("vault.blank", [-62, -15, 5.2], [1, 0, 0], 3.1, 2.2, "vault.body");
const capF = G.frameAlong(blankPort, [1, 0, 0]);
put("vault.cap", G.add3(blankPort, [0.8, 0, 0]), S(G.disc(0, 1.6, 2.3, capF, P), { tone: "lo" }), [record(A.disc(capF, 0, 1.6, 2.3, { name: "vault.cap", owner: "vault.body" }))]);

const floors = [8, 16, 24, 32].map((z) => L(k.sideSeam(SHAFT, VAULT_H + z, P, 4), { tone: "faint" })).join("");
box("tower.shaft", SHAFT, VAULT_H, SHAFT_H, { tone: "hi", crease: "lo" }, floors);
box("tower.roof", ROOF, VAULT_H + SHAFT_H, ROOF_H, { tone: "mid" });
const knobZ = VAULT_H + SHAFT_H + ROOF_H;
put(
  "tower.knob",
  [KNOB[0], KNOB[1], knobZ + KNOB_H / 2],
  S(k.cylinder(KNOB[0], KNOB[1], KNOB_R, knobZ, KNOB_H, P, 28), { tone: "mid" }) + L(k.knurl(KNOB[0], KNOB[1], KNOB_R, knobZ, knobZ + KNOB_H, 28, P), { tone: "lo" }) + D([at([KNOB[0], KNOB[1], knobZ + KNOB_H])], { size: 0.5, tone: "hi" }),
  [record(A.cylinder(KNOB[0], KNOB[1], KNOB_R, knobZ, KNOB_H, { name: "tower.knob" }))],
);

box("truck.chassis", CHASSIS, 0, CHASSIS_H, { tone: "mid", crease: "lo" });
box("truck.body", BODY, CHASSIS_H, BODY_H, { tone: "hi", crease: "lo" });
const cabSide = CAB.y + CAB.d;
const cabArt = loop(
  [
    [CAB.x + 3.2, cabSide, CHASSIS_H + 3.2],
    [CAB.x + CAB.w - 2.6, cabSide, CHASSIS_H + 3.2],
    [CAB.x + CAB.w - 2.6, cabSide, CHASSIS_H + CAB_H - 1.8],
    [CAB.x + 3.2, cabSide, CHASSIS_H + CAB_H - 1.8],
  ],
  { tone: "faint" },
);
box("truck.cab", CAB, CHASSIS_H, CAB_H, { tone: "mid", crease: "lo" }, cabArt);
for (const x of WHEELS) wheel(`truck.wheel-${x}`, x);
const screenFace = SCREEN.x + SCREEN.w;
const screenArt = loop(
  [
    [screenFace, SCREEN.y + 1.6, SCREEN_Z + 1.3],
    [screenFace, SCREEN.y + SCREEN.d - 1.6, SCREEN_Z + 1.3],
    [screenFace, SCREEN.y + SCREEN.d - 1.6, SCREEN_Z + SCREEN_H - 1.3],
    [screenFace, SCREEN.y + 1.6, SCREEN_Z + SCREEN_H - 1.3],
  ],
  { tone: "faint" },
);
box("truck.screen", SCREEN, SCREEN_Z, SCREEN_H, { tone: "hi", crease: "lo" }, screenArt);

puck("dish.mast", DISH_AT[0], DISH_AT[1], DISH_AT[2], DISH_MAST_H, DISH_MAST_R, { tone: "mid", crease: "lo" }, 20, 0.2);
const dishOrigin = [DISH_AT[0], DISH_AT[1], DISH_AT[2] + DISH_MAST_H];
const dishF = G.frameAlong(dishOrigin, G.unit3(DISH_AXIS));
const dishShell: number[][] = [
  [0, DISH_R0],
  [0.45, DISH_R0],
];
for (let i = 1; i <= 16; i++) dishShell.push([0.45 + ((DISH_S - 0.45) * i) / 16, dishOuter(0.45 + ((DISH_S - 0.45) * i) / 16), 1]);
dishShell.push([DISH_S, Math.max(DISH_R0, DISH_R1 - DISH_WALL)]);
for (let i = 16; i >= 1; i--) {
  const s = 0.45 + ((DISH_S - 0.45) * i) / 16;
  dishShell.push([s, Math.max(0.7, dishOuter(s) - DISH_WALL), 1]);
}
dishShell.push([0.5, 0.7]);
dishShell.push([0.12, 0.7]);
put(
  "dish.body",
  G.add3(dishOrigin, G.mul3(dishF.a, DISH_S / 2)),
  S(G.lathe(dishShell, dishF, P, { bevel: 0, smooth: false }), { tone: "hi", lit: true, crease: "lo" }),
  [record(A.body(dishF, dishShell, { name: "dish.body", owner: "dish.mast" }))],
);
put(
  "dish.feed",
  G.add3(dishOrigin, G.mul3(dishF.a, 1.5)),
  S(G.disc(0.15, 2.5, 0.62, dishF, P), { tone: "mid" }),
  [record(A.disc(dishF, 0.15, 2.5, 0.62, { name: "dish.feed", owner: "dish.body" }))],
);

box("voters.pad", PAD, 0, 1.8, { tone: "lo" });
for (const voter of VOTERS) figure(`voters-${voter.x}`, voter.x, PIPE_Y, 1.8, voter.body, 8.6, 4.4, 2.7, 5.2);

for (const x of FENCE_POSTS) {
  puck(`wall.foot-${x}`, x, FENCE_Y, 0, BASE_H, FOOT_R, { tone: "lo" }, 20, 0.3);
  post(`wall.post-${x}`, x, FENCE_Y, BASE_H, POST_H, POST_R);
}
const pane = { x: FENCE_POSTS[0] + POST_R, y: FENCE_Y - 0.7, w: FENCE_POSTS[1] - FENCE_POSTS[0] - POST_R * 2, d: 1.4, r: 0.3 };
const paneZ = BASE_H + 0.8;
const paneH = POST_H - 2.4;
const paneArt = loop(
  [
    [pane.x + 1.2, pane.y + pane.d, paneZ + 1.2],
    [pane.x + pane.w - 1.2, pane.y + pane.d, paneZ + 1.2],
    [pane.x + pane.w - 1.2, pane.y + pane.d, paneZ + paneH - 1.2],
    [pane.x + 1.2, pane.y + pane.d, paneZ + paneH - 1.2],
  ],
  { tone: "faint" },
);
box("wall.pane", pane, paneZ, paneH, { tone: "hi", crease: "faint" }, paneArt);

const boothFace = BOOTH.y + BOOTH.d;
const boothArt = loop(
  [
    [BOOTH.x + 5, boothFace, 3.2],
    [BOOTH.x + BOOTH.w - 5, boothFace, 3.2],
    [BOOTH.x + BOOTH.w - 5, boothFace, BOOTH_H - 3.4],
    [BOOTH.x + 5, boothFace, BOOTH_H - 3.4],
  ],
  { tone: "faint" },
);
box("booth.body", BOOTH, 0, BOOTH_H, { tone: "mid", crease: "lo" }, boothArt);
box("booth.roof", BOOTH_ROOF, BOOTH_H, BOOTH_ROOF_H, { tone: "mid" });
puck("booth.jar", -90, SSF_Y, BOOTH_H + BOOTH_ROOF_H, 4.4, 3.2, { tone: "mid", crease: "lo" }, 28, 0.35, L(k.ring(-90, SSF_Y, 2.1, BOOTH_H + BOOTH_ROOF_H + 4.4, P, 24), { tone: "faint" }));
for (const x of DONORS) figure(`donor-${x}`, x, BOOTH.y + BOOTH.d + DONOR_BD / 2, 0, 15, DONOR_BW, DONOR_BD, 2.35, 4.4, "mid");

box("podium.body", PODIUM, 0, PODIUM_H, { tone: "hi", crease: "lo" });
figure("candidate", CAND[0], CAND[1], 0, 22, CAND_BW, 5, 3.1, 5.6);
post("banner.pole", POLE[0], POLE[1], 0, POLE_H, POLE_R, { tone: "mid" });
const flagFace = FLAG.y + FLAG.d;
const flagArt = loop(
  [
    [FLAG.x + 1.4, flagFace, FLAG_Z + 1.3],
    [FLAG.x + FLAG.w - 1.4, flagFace, FLAG_Z + 1.3],
    [FLAG.x + FLAG.w - 1.4, flagFace, FLAG_Z + FLAG_H - 1.3],
    [FLAG.x + 1.4, flagFace, FLAG_Z + FLAG_H - 1.3],
  ],
  { tone: "faint" },
);
box("banner.flag", FLAG, FLAG_Z, FLAG_H, { tone: "hi", crease: "lo" }, flagArt);

const adsPort = boss("vault.outlet", [VAULT.x + VAULT.w, PIPE_Y, PIPE_Z], [1, 0, 0], WIDE_R * 1.22, 2.6, "vault.body");
const adsIn = boss("truck.inlet", [BODY.x, PIPE_Y, PIPE_Z], [-1, 0, 0], WIDE_R * 1.22, 2.6, "truck.body");
const wideLine = pipe("lane.ads", [adsPort, adsIn], WIDE_R, { tone: "hi", bands: [0.5], flangeR: 1.12 });

const ssfFrom = boss("booth.outlet", [BOOTH.x + BOOTH.w, SSF_Y, SSF_Z], [1, 0, 0], NARROW_R * 1.45, 2.2, "booth.body");
const ssfTo = boss("podium.inlet", [PODIUM.x, SSF_Y, SSF_Z], [-1, 0, 0], NARROW_R * 1.45, 2.2, "podium.body");
const meterX = (ssfFrom[0] + ssfTo[0]) / 2;
const METER: [number, number] = [meterX, SSF_Y];
const narrowLine = pipe("lane.ssf", [ssfFrom, ssfTo], NARROW_R, {
  tone: "mid",
  extra: [[meterX - ssfFrom[0] - VALVE_HALF, meterX - ssfFrom[0] + VALVE_HALF]],
  flangeR: 1.32,
  touch: ["meter.valve", "meter.neck"],
});
const valveF = G.frameAlong([METER[0], METER[1], SSF_Z], [1, 0, 0]);
put(
  "meter.valve",
  [METER[0], METER[1], SSF_Z],
  S(G.disc(-VALVE_HALF, VALVE_HALF, VALVE_R, valveF, P), { tone: "mid" }),
  [record(A.disc(valveF, -VALVE_HALF, VALVE_HALF, VALVE_R, { name: "meter.valve", owner: "lane.ssf" }))],
);
const neckZ = SSF_Z + VALVE_R;
puck("meter.neck", METER[0], METER[1], neckZ, DIAL_TOP - DIAL_H - neckZ, 2, { tone: "mid", crease: "none" }, 20, 0, "", "lane.ssf");
puck("meter.dial", METER[0], METER[1], DIAL_TOP - DIAL_H, DIAL_H, METER_R, { tone: "hi", crease: "lo" }, 56, 0.6, "", "lane.ssf");
const dialTicks = k.radialTicks(METER[0], METER[1], METER_R - 2.4, 36, 4, DIAL_TOP, [1.2, 2.5], P, -0.75 * Math.PI, 1.5 * Math.PI);
const dialFace =
  L(k.knurl(METER[0], METER[1], METER_R, DIAL_TOP - 2.6, DIAL_TOP, 56, P, 0.3), { tone: "lo" }) +
  L(k.sideArc(METER[0], METER[1], METER_R, DIAL_TOP - 2.6, P, 36), { tone: "faint" }) +
  L(k.ring(METER[0], METER[1], METER_R - 1.8, DIAL_TOP, P, 48), { tone: "lo" }) +
  L(dialTicks.minor, { tone: "lo" }) +
  L(dialTicks.major, { tone: "mid" }) +
  L(k.ring(METER[0], METER[1], 1.5, DIAL_TOP, P, 16), { tone: "mid" });

const flowWide = L(k.pathOf(wideLine.map((p: number[]) => at(p))), { tone: "mid", flow: true, className: "lane-ads" });
const flowNarrow = L(k.pathOf(narrowLine.map((p: number[]) => at(p))), { tone: "mid", flow: true, className: "lane-ssf" });

const needleAt = (share: number) => {
  const angle = -0.75 * Math.PI + share * 1.5 * Math.PI;
  const x = METER[0];
  const y = METER[1];
  return k.lineOnTop([x - Math.sin(angle) * 2.2, y + Math.cos(angle) * 2.2], [x + Math.sin(angle) * (METER_R - 3.2), y - Math.cos(angle) * (METER_R - 3.2)], DIAL_TOP + 0.2, P);
};

const dialItem = R.items.find((item: { name: string }) => item.name === "meter.dial");
if (dialItem) dialItem.svg += dialFace;
const knobItem = R.items.find((item: { name: string }) => item.name === "tower.knob");
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
    "Corporate treasury in an office tower. A wide pipe feeds a broadcast truck whose satellite dish and screen send ads to a small crowd of voters. A glass fence stands between that broadcast and a candidate at a podium. Beside the tower, two donors drop voluntary gifts into a connected-PAC booth. A narrow metered pipe runs from the booth to the podium and stops at five thousand dollars per election. A capped port on the tower shows treasury money cannot reach the candidate.",
  body: [back.join(""), R.items.map((item: { svg: string }) => item.svg).join(""), `<g data-flow-layer>${flowWide}${flowNarrow}</g>`, `<path data-part="needle" class="iso-line" data-tone="hi" data-free="start" d="${needleAt(0)}" style="stroke-width:1.1"/>`],
});

const live = `
const P = ${JSON.stringify(P)};
const METER = ${JSON.stringify(METER)};
const METER_R = ${METER_R};
const DIAL_TOP = ${DIAL_TOP};
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
    { mark: "lit", label: "Satellite dish: Super PAC ads aimed at voters, never the candidate" },
    { mark: "raised", label: "Metered SSF line, at most $5,000 per election" },
  ],
  caption:
    "A corporation may send unlimited treasury money to a Super PAC. The Super PAC cannot give to a candidate and may only spend independently on ads, without coordination. Treasury money cannot go to a candidate or a traditional PAC. A connected PAC (SSF), funded by voluntary employee and shareholder donations, may give a multicandidate $5,000 per election. The podium receives only that metered line.",
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
