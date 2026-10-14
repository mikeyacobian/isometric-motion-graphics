import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";

// Miniature town. One loop: donors → wide super-PAC pipe and narrow $5,000 PAC
// pipe → ads (billboard only; the super PAC never reaches the candidate) and a
// direct PAC gift to campaign HQ → ballot, flag, candidate walks to the capitol
// → the lit vote sends a coin back to the donors.

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 700;
const HEIGHT = 480;

const BASE = { x: -114, y: -84, w: 232, d: 180, r: 6 };
const BASE_Z = -6;

const WIDE_Y = -60;
const WIDE_Z = 6.6;
const WIDE_R = 2.3;
const NARROW_Z = 3.2;
const NARROW_R = 0.9;
const LANE_Y = 11;
const GIFT_Z = 5.5;

const TOWER = { x: -50, y: WIDE_Y - 8, w: 20, d: 16, r: 1.05 };
const TOWER_H = 30;
const ROOF = { x: TOWER.x - 2.2, y: TOWER.y - 2.2, w: TOWER.w + 4.4, d: TOWER.d + 4.4, r: 0.7 };
const ROOF_H = 2.2;

const SUPER = { x: 18, y: WIDE_Y - 11, w: 38, d: 22, r: 1.15 };
const SUPER_H = 14;

const HA = { x: -106, y: -46, w: 16, d: 12, r: 0.6 };
const HA_H = 8;
const HB = { x: -86, y: -42, w: 14, d: 11, r: 0.55 };
const HB_H = 6.4;

const PAC = { x: -32, y: LANE_Y - 9, w: 28, d: 18, r: 1.05 };
const PAC_H = 11;
const HQ = { x: 32, y: LANE_Y - 9, w: 26, d: 18, r: 1.05 };
const HQ_H = 13;

const BOARD = { x: 22, y: -36.6, w: 28, d: 1.55, r: 0.25 };
const BOARD_Z = 14.2;
const BOARD_H = 9.5;
const POST_AT: [number, number] = [36, -35.8];
const POST_R = 1.05;
const POST_H = BOARD_Z;

const BALLOT = { x: -66, y: 32, w: 14, d: 12, r: 0.45 };
const BALLOT_H = 7.2;

const CAP = { x: 72, y: 34, w: 30, d: 28, r: 1.1 };
const CAP_H = 7;
const DRUM_R = 7.5;
const DRUM_H = 5;
const DOME_H = 6.4;
const CAP_C: [number, number] = [CAP.x + CAP.w / 2, CAP.y + CAP.d / 2];

const POLE: [number, number] = [46, 0.35];
const POLE_R = 0.78;
const POLE_H = 22;
const FLAG = { x: POLE[0] + POLE_R - 0.06, y: POLE[1] - 0.55, w: 9, d: 1.15, r: 0.18 };
const FLAG_Z = 8;
const FLAG_H = 4.8;
const FLAG_RISE = 7;

const CAND: [number, number] = [66, 12];
const CAND_END: [number, number] = [69.4, 50];
const VOTERS: [number, number][] = [
  [30, -16],
  [48, -10],
];

const TIMING = {
  period: 14,
  wideA: [0.04, 0.38],
  wideB: [0.1, 0.42],
  narrow: [0.06, 0.44],
  ads: [0.4, 0.62],
  gift: [0.42, 0.68],
  dropA: [0.48, 0.6],
  dropB: [0.58, 0.7],
  parkUntil: 0.98,
  ret: [0.76, 0.98],
  walk: [0.48, 0.78],
  flag: [0.52, 0.72],
  vote: [0.74, 0.97],
  glow: [0.4, 0.7],
};

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, BASE_Z, 0),
    [TOWER.x, TOWER.y, TOWER_H + ROOF_H + 1],
    [CAP.x + CAP.w, CAP.y + CAP.d, CAP_H + DRUM_H + DOME_H + 1],
    [POLE[0], POLE[1], POLE_H],
    [BOARD.x, BOARD.y, BOARD_Z + BOARD_H],
    [BASE.x + BASE.w, BASE.y + BASE.d, 0],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 46, elevation: 30 },
);

const at = (point: number[]) => k.iso(point as [number, number, number], P);
const S = (paths: unknown, style?: object) => k.solidSvg(paths, style);
const L = (d: string, style?: object) => k.lineSvg(d, style);
const loop = (points: number[][], style?: object) => L(k.pathOf(points.map((point) => at(point)), true), style);

const R = A.recorder(P);
const record = R.solid;

function put(name: string, ref: number[], svg: string, shapes: unknown[] = [], extra: { moveTag?: string; part?: string; bias?: number } = {}) {
  return R.put({ name, at: ref, svg, shapes, piece: "town", ...extra });
}

function box(name: string, plan: { x: number; y: number; w: number; d: number; r: number }, z: number, h: number, style: object = {}, extraSvg = "", opts: { owner?: string; moveTag?: string; part?: string } = {}) {
  const shape = record(A.slab(plan, z, h, { name, owner: opts.owner }, 4));
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, 4, 0.4), style) + extraSvg, [shape], opts);
}

function puck(name: string, x: number, y: number, z: number, h: number, r: number, style: object = {}, steps = 20, opts: { owner?: string; moveTag?: string } = {}) {
  const shape = record(A.cylinder(x, y, r, z, h, { name, owner: opts.owner }));
  put(name, [x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, steps, 0.15), style), [shape], opts);
}

function boss(name: string, origin: number[], axis: number[], r: number, h: number, owner: string) {
  const F = G.frameAlong(origin, axis);
  const shape = record(A.disc(F, 0, h, r, { name, owner }));
  put(name, G.add3(origin, G.mul3(axis, h / 2)), S(G.disc(0, h, r, F, P), { tone: "mid", crease: "lo" }), [shape]);
  return G.add3(origin, G.mul3(axis, h));
}

function flange(name: string, centre: number[], axis: number[], r: number, thick: number, owner: string, tone: string) {
  const F = G.frameAlong(centre, axis);
  const shape = record(A.disc(F, -thick / 2, thick / 2, r, { name, owner }));
  put(name, centre, S(G.disc(-thick / 2, thick / 2, r, F, P), { tone, crease: "lo" }), [shape]);
}

function pipe(name: string, control: number[][], r: number, tone: string) {
  const line = G.fillet(control, Math.max(r * 2.6, 4), 10, { P, tube: r });
  const total = G.pathLength(line);
  const thick = Math.max(0.9, r * 0.55);
  const gaps = [
    [0, thick],
    [total - thick, total],
  ];
  R.route(name, line, r, { owner: name, gaps, rims: [r * 1.34, r * 1.34], piece: "town" });
  tubePieces(line, r, P, { maxLength: 34, spacing: Math.max(0.8, r * 0.2), gaps }).forEach((piece: { mid: number[]; points: number[][]; radii: number[] }, index: number) => {
    put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)]);
  });
  [[0, -1], [total, 1]].forEach(([along, sign], index) => {
    const tangent = G.tangentAlong(line, along as number);
    const centre = G.add3(G.pointAlong(line, along as number), G.mul3(tangent, (-(sign as number) * thick) / 2));
    flange(`${name}.flange${index}`, centre, tangent, r * 1.34, thick, name, tone);
  });
  return line as number[][];
}

function faceLoop(pts: number[][], tone = "lo") {
  return loop(pts, { tone });
}

function door(plan: { x: number; y: number; w: number; d: number }, h: number) {
  const y = plan.y + plan.d + 0.12;
  const x = plan.x + plan.w * 0.36;
  const w = Math.min(3.4, plan.w * 0.28);
  return faceLoop(
    [
      [x, y, 0.2],
      [x + w, y, 0.2],
      [x + w, y, h * 0.62],
      [x, y, h * 0.62],
    ],
    "mid",
  );
}

function windows(plan: { x: number; y: number; w: number; d: number }, z: number, h: number, face: "south" | "east", cols: number, rows: number) {
  let out = "";
  const margin = 2.1;
  const gap = 1.15;
  const spanA = face === "south" ? plan.w : plan.d;
  const availA = spanA - margin * 2;
  const availH = h - margin * 2;
  const cw = (availA - gap * (cols - 1)) / cols;
  const ch = (availH - gap * (rows - 1)) / rows;
  if (cw < 1.2 || ch < 1.2) return "";
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a0 = margin + col * (cw + gap);
      const z0 = z + margin + row * (ch + gap);
      const pts =
        face === "south"
          ? [
              [plan.x + a0, plan.y + plan.d + 0.12, z0],
              [plan.x + a0 + cw, plan.y + plan.d + 0.12, z0],
              [plan.x + a0 + cw, plan.y + plan.d + 0.12, z0 + ch],
              [plan.x + a0, plan.y + plan.d + 0.12, z0 + ch],
            ]
          : [
              [plan.x + plan.w + 0.12, plan.y + a0, z0],
              [plan.x + plan.w + 0.12, plan.y + a0 + cw, z0],
              [plan.x + plan.w + 0.12, plan.y + a0 + cw, z0 + ch],
              [plan.x + plan.w + 0.12, plan.y + a0, z0 + ch],
            ];
      out += faceLoop(pts, "mid");
    }
  }
  return out;
}

function bars(plan: { x: number; y: number; w: number; d: number }, z: number, h: number) {
  let out = "";
  const y = plan.y + plan.d + 0.12;
  for (let i = 0; i < 3; i++) {
    const z0 = z + 1.2 + i * ((h - 2) / 3);
    const zh = (h - 2.6) / 3 - 0.35;
    const x0 = plan.x + 1.6;
    const x1 = plan.x + plan.w - 1.6;
    out += faceLoop(
      [
        [x0, y, z0],
        [x1, y, z0],
        [x1, y, z0 + zh],
        [x0, y, z0 + zh],
      ],
      "hi",
    );
  }
  return `<g data-part="glow" opacity="0.22">${out}</g>`;
}

function person(name: string, x: number, y: number, moveTag?: string) {
  const legH = 3.1;
  const torsoH = 5.2;
  const bw = 4.4;
  const bd = 2.7;
  const opts = moveTag ? { moveTag } : {};
  for (const side of [-1, 1]) {
    puck(`${name}.leg${side < 0 ? "a" : "b"}`, x + side * 0.9, y, 0, legH, 0.52, { tone: "hi", crease: "lo" }, 12, opts);
  }
  box(`${name}.body`, { x: x - bw / 2, y: y - bd / 2, w: bw, d: bd, r: 0.55 }, legH, torsoH, { tone: "hi", crease: "lo" }, "", opts);
  puck(`${name}.head`, x, y + 0.15, legH + torsoH, 2.05, 1.28, { tone: "hi", crease: "lo" }, 16, opts);
}

function domeRadius(s: number) {
  const u = Math.min(1, Math.max(0, s / DOME_H));
  return DRUM_R * Math.sqrt(Math.max(0.08, 1 - u * u));
}
function domeSlope(s: number) {
  const u = Math.min(1, Math.max(0, s / DOME_H));
  return (-DRUM_R * u) / (DOME_H * Math.sqrt(Math.max(0.08, 1 - u * u)));
}

const back = [`<path class="iso-halo" d="${k.haloOf(BASE, BASE_Z, -BASE_Z, P)}"/>`];

box("stand.base", BASE, BASE_Z, -BASE_Z, { tone: "lo", crease: "faint" });

box("house.a", HA, 0, HA_H, { tone: "hi", crease: "lo" }, door(HA, HA_H));
box("house.a.roof", { x: HA.x - 1.1, y: HA.y - 1.1, w: HA.w + 2.2, d: HA.d + 1.3, r: 0.4 }, HA_H, 1.7, { tone: "mid", crease: "lo" });
box("house.b", HB, 0, HB_H, { tone: "hi", crease: "lo" }, door(HB, HB_H));
box("house.b.roof", { x: HB.x - 1, y: HB.y - 1, w: HB.w + 2, d: HB.d + 1.2, r: 0.35 }, HB_H, 1.5, { tone: "mid", crease: "lo" });

box("tower.body", TOWER, 0, TOWER_H, { tone: "hi", crease: "lo" }, windows(TOWER, 0, TOWER_H, "south", 2, 5) + windows(TOWER, 0, TOWER_H, "east", 2, 5));
box("tower.roof", ROOF, TOWER_H, ROOF_H, { tone: "mid", crease: "lo" });
box("super.body", SUPER, 0, SUPER_H, { tone: "hi", crease: "lo" }, windows(SUPER, 0, SUPER_H, "south", 4, 2) + windows(SUPER, 0, SUPER_H, "east", 2, 2));

puck("board.post", POST_AT[0], POST_AT[1], 0, POST_H, POST_R, { tone: "mid", crease: "lo" }, 16);
box("board.face", BOARD, BOARD_Z, BOARD_H, { tone: "mid", crease: "lo" }, bars(BOARD, BOARD_Z, BOARD_H));

for (const [index, voter] of VOTERS.entries()) person(`voter.${index === 0 ? "a" : "b"}`, voter[0], voter[1]);

box("pac.body", PAC, 0, PAC_H, { tone: "hi", crease: "lo" }, windows(PAC, 0, PAC_H, "south", 3, 2) + windows(PAC, 0, PAC_H, "east", 2, 2));
box("hq.body", HQ, 0, HQ_H, { tone: "hi", crease: "lo" }, windows(HQ, 0, HQ_H, "south", 3, 2) + windows(HQ, 0, HQ_H, "east", 2, 2));
puck("hq.pole", POLE[0], POLE[1], 0, POLE_H, POLE_R, { tone: "mid", crease: "lo" }, 12);
box("hq.flag", FLAG, FLAG_Z, FLAG_H, { tone: "hi", crease: "lo" }, "", { owner: "hq.pole", moveTag: "flag", part: "flag" });

const slotY = BALLOT.y + BALLOT.d * 0.55;
const slot = faceLoop(
  [
    [BALLOT.x + 2.2, slotY - 0.28, BALLOT_H + 0.12],
    [BALLOT.x + BALLOT.w - 2.2, slotY - 0.28, BALLOT_H + 0.12],
    [BALLOT.x + BALLOT.w - 2.2, slotY + 0.28, BALLOT_H + 0.12],
    [BALLOT.x + 2.2, slotY + 0.28, BALLOT_H + 0.12],
  ],
  "hi",
);
box("ballot.body", BALLOT, 0, BALLOT_H, { tone: "hi", crease: "lo" }, slot);

box("capitol.base", CAP, 0, CAP_H, { tone: "hi", crease: "lo" });
puck("capitol.drum", CAP_C[0], CAP_C[1], CAP_H, DRUM_H, DRUM_R, { tone: "mid", crease: "lo" }, 36);
const domeZ = CAP_H + DRUM_H;
const domeF = G.frameAlong([CAP_C[0], CAP_C[1], domeZ], [0, 0, 1]);
const domeProfile = Array.from({ length: 8 }, (_, i) => {
  const s = (i / 7) * DOME_H;
  return [s, domeRadius(s)];
});
put(
  "capitol.dome",
  [CAP_C[0], CAP_C[1], domeZ + DOME_H / 2],
  S(G.solidOf(domeProfile, domeF, P, { bevel: 0, smooth: { slope: domeSlope, radius: domeRadius, rows: 4 } }), { tone: "mid", crease: "lo" }),
  [record(A.solid(domeF, domeProfile, { name: "capitol.dome", radius: domeRadius }))],
);

const voteY = CAP.y + CAP.d;
box("capitol.vote", { x: CAP.x + 5, y: voteY, w: 20, d: 2.8, r: 0.32 }, 1.3, 4.8, { tone: "hi", crease: "lo" }, "", { part: "vote" });

person("cand", CAND[0], CAND[1], "cand");

const towerEnd = boss("tower.out", [TOWER.x + TOWER.w, WIDE_Y, WIDE_Z], [1, 0, 0], WIDE_R * 1.46, 2.3, "tower.body");
const superEnd = boss("super.in", [SUPER.x, WIDE_Y, WIDE_Z], [-1, 0, 0], WIDE_R * 1.46, 2.3, "super.body");
const wideLine = pipe("lane.wide", [towerEnd, superEnd], WIDE_R, "hi");

const houseEnd = boss("house.out", [HB.x + HB.w, HB.y + HB.d / 2, NARROW_Z], [1, 0, 0], NARROW_R * 1.5, 1.8, "house.b");
const pacNorth = boss("pac.in", [PAC.x + PAC.w / 2, PAC.y, NARROW_Z], [0, -1, 0], NARROW_R * 1.5, 1.8, "pac.body");
const narrowLine = pipe("lane.narrow", [houseEnd, [pacNorth[0], houseEnd[1], NARROW_Z], pacNorth], NARROW_R, "mid");

const pacEast = boss("pac.out", [PAC.x + PAC.w, LANE_Y, GIFT_Z], [1, 0, 0], NARROW_R * 1.5, 1.8, "pac.body");
const hqWest = boss("hq.in", [HQ.x, LANE_Y, GIFT_Z], [-1, 0, 0], NARROW_R * 1.5, 1.8, "hq.body");
const giftLine = pipe("lane.gift", [pacEast, hqWest], NARROW_R, "mid");

const bx = BALLOT.x + BALLOT.w / 2;
const by = BALLOT.y + BALLOT.d * 0.62;
const PATHS = {
  wide: wideLine.map((p) => [p[0], p[1], p[2] + WIDE_R + 0.55]),
  narrow: narrowLine.map((p) => [p[0], p[1], p[2] + NARROW_R + 0.45]),
  gift: giftLine.map((p) => [p[0], p[1], p[2] + NARROW_R + 0.45]),
  ads: [
    [POST_AT[0], BOARD.y + BOARD.d + 1, BOARD_Z + BOARD_H * 0.55],
    [(VOTERS[0][0] + VOTERS[1][0]) / 2, (VOTERS[0][1] + VOTERS[1][1]) / 2, 8],
  ],
  intoA: [
    [bx, by, BALLOT_H + 8],
    [bx, by, BALLOT_H],
  ],
  intoB: [
    [bx - 0.2, by - 0.8, BALLOT_H + 9],
    [bx - 0.2, by - 0.8, BALLOT_H + 1.45],
  ],
  ret: [
    [CAP_C[0], CAP.y + CAP.d + 8, 4.2],
    [-108, CAP.y + CAP.d + 8, 4.2],
    [-108, HB.y + HB.d / 2, 4.2],
    [HB.x + HB.w / 2, HB.y + HB.d / 2, 5.5],
  ],
};

const SPOTS = [
  { at: [HA.x + HA.w / 2, HA.y + HA.d / 2, HA_H], label: "donors · people" },
  { at: [HB.x + HB.w / 2, HB.y + HB.d / 2, HB_H], label: "donors · people" },
  { at: [TOWER.x + TOWER.w / 2, WIDE_Y, 16], label: "donors · companies" },
  { at: [SUPER.x + SUPER.w / 2, WIDE_Y, 7], label: "super PAC · ads only" },
  { at: [BOARD.x + BOARD.w / 2, BOARD.y + BOARD.d, BOARD_Z + 4], label: "ads · no gift to the candidate" },
  { at: [PAC.x + PAC.w / 2, LANE_Y, 6], label: "PAC · $5,000 per election" },
  { at: [HQ.x + HQ.w / 2, LANE_Y, 7], label: "campaign HQ" },
  { at: [bx, by, BALLOT_H], label: "ballot" },
  { at: [CAP_C[0], CAP_C[1], domeZ], label: "vote returns to donors" },
  { at: [VOTERS[0][0], VOTERS[0][1], 6], label: "voters" },
  { at: [VOTERS[1][0], VOTERS[1][1], 6], label: "voters" },
];

A.settle(R, P);
R.items.sort((a: { key: number }, b: { key: number }) => a.key - b.key);
A.auditOrExit(R, P);

const named = new Set(R.items.map((item: { name: string }) => item.name.replace(/:\d+$/, "").replace(/\.flange\d$/, "")));
const partCount = named.size;

const items = R.items
  .map((item: { name: string; key: number; svg: string; moveTag?: string; part?: string }) => {
    const attrs = [`class="it"`, `data-name="${item.name}"`, `data-k="${item.key.toFixed(3)}"`];
    if (item.moveTag) attrs.push(`data-move="${item.moveTag}"`);
    if (item.part) attrs.push(`data-part="${item.part}"`);
    return `<g ${attrs.join(" ")}>${item.svg}</g>`;
  })
  .join("");

const coin = S(k.cylinder(0, 0, 3.6, 0, 1.7, P, 18, 0.2), { tone: "hi", crease: "hi" });
const chunks = Array.from({ length: 6 }, (_, index) => `<g class="it" data-live="chunk" data-name="chunk-${index}" data-k="0" opacity="0">${coin}</g>`).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A small town. Houses and an office tower send money along a wide pipe to a super PAC, which only lights a billboard toward voters, and along a narrow pipe to a PAC. The PAC also gives directly to campaign headquarters. A ballot fills, the candidate walks to a capitol, and the lit vote sends a coin back to the donors.",
  body: [back.join(""), items, chunks],
});

const live = `
const P = ${JSON.stringify(P)};
const PATHS = ${JSON.stringify(PATHS)};
const SPOTS = ${JSON.stringify(SPOTS)};
const TIMING = ${JSON.stringify(TIMING)};
const CAND = ${JSON.stringify(CAND)};
const CAND_END = ${JSON.stringify(CAND_END)};
const RISE = ${FLAG_RISE};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const live = document.querySelector("[data-live]");
const glow = svg.querySelector("[data-part=glow]");
const vote = svg.querySelector('[data-part="vote"] .iso-solid');
const nodes = [...svg.querySelectorAll(".it")];
const chunks = [...svg.querySelectorAll("[data-live=chunk]")];
const candNodes = [...svg.querySelectorAll('[data-move="cand"]')];
const flagNodes = [...svg.querySelectorAll('[data-move="flag"]')];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
const frozen = params.has("still") || reduced;
const beats = [0, 0.16, 0.34, 0.5, 0.88];
let u = params.has("t") ? Math.min(0.999, Math.max(0, Number(params.get("t")) || 0)) : 0;
let touring = !frozen;
let hovering = false;
let clock = u * TIMING.period;
let last = 0;
let frame = 0;
let visible = true;
let idleTimer = 0;
let signature = "";
let said = "";
const span = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a || 1)));
const ease = (t) => t * t * (3 - 2 * t);
const pointAt = (path, t) => {
  const n = path.length - 1;
  const x = Math.min(1, Math.max(0, t)) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const a = path[i];
  const b = path[i + 1] || a;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};
const slot = (t, range, path) => (t < range[0] || t > range[1] ? null : pointAt(path, span(t, range[0], range[1])));
const park = (t, from, until, path) => (t < from || t > until ? null : path[path.length - 1]);
function stepOf(t) {
  if (t < 0.2) return "donors send";
  if (t < 0.4) return "super PAC · PAC $5,000";
  if (t < 0.56) return "ads · direct gift";
  if (t < 0.76) return "ballot · candidate";
  return "vote returns";
}
function say(text) {
  if (text === said) return;
  said = text;
  if (readout) readout.textContent = text;
  if (live) live.textContent = text;
}
function shift(list, delta) {
  const transform = delta[0] || delta[1] || delta[2] ? translateAlong(P, delta) : "";
  const lift = depthOf(delta, P) - depthOf([0, 0, 0], P);
  for (const node of list) {
    if (transform) node.setAttribute("transform", transform);
    else node.removeAttribute("transform");
    node.dataset.lift = lift.toFixed(4);
  }
}
function placeChunk(node, pos) {
  if (!pos) {
    node.setAttribute("opacity", "0");
    return;
  }
  node.setAttribute("transform", translateAlong(P, pos));
  node.dataset.k = (500 + depthOf([pos[0], pos[1], pos[2] + 0.8], P)).toFixed(3);
  node.dataset.lift = "0";
  node.setAttribute("opacity", "1");
}
function reorder() {
  const ranked = nodes.map((node) => ({ node, key: Number(node.dataset.k) + Number(node.dataset.lift || 0) }));
  ranked.sort((a, b) => a.key - b.key);
  let next = "";
  for (const row of ranked) next += row.node.dataset.name + " ";
  if (next === signature) return;
  signature = next;
  const frag = document.createDocumentFragment();
  for (const row of ranked) frag.appendChild(row.node);
  svg.appendChild(frag);
}
function draw() {
  const T = TIMING;
  const positions = [
    slot(u, T.wideA, PATHS.wide) || slot(u, T.dropA, PATHS.intoA) || park(u, T.dropA[1], T.parkUntil, PATHS.intoA),
    slot(u, T.wideB, PATHS.wide) || slot(u, T.dropB, PATHS.intoB) || park(u, T.dropB[1], T.parkUntil, PATHS.intoB),
    slot(u, T.narrow, PATHS.narrow),
    slot(u, T.ads, PATHS.ads),
    slot(u, T.gift, PATHS.gift),
    slot(u, T.ret, PATHS.ret),
  ];
  chunks.forEach((node, index) => placeChunk(node, positions[index]));
  const walk = ease(span(u, T.walk[0], T.walk[1]));
  shift(candNodes, [(CAND_END[0] - CAND[0]) * walk, (CAND_END[1] - CAND[1]) * walk, 0]);
  shift(flagNodes, [0, 0, ease(span(u, T.flag[0], T.flag[1])) * RISE]);
  if (glow) glow.setAttribute("opacity", String(0.18 + 0.82 * Math.sin(Math.PI * span(u, T.glow[0], T.glow[1]))));
  if (vote) vote.toggleAttribute("data-lit", u >= T.vote[0] && u < T.vote[1]);
  reorder();
  if (!hovering) say(stepOf(u));
}
function nearest(event) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  let best = null;
  let bestD = 58;
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
  if (!frame && visible && touring && !frozen) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}
function resume() {
  if (frozen || hovering) return;
  touring = true;
  clock = u * TIMING.period;
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
    u = (clock % TIMING.period) / TIMING.period;
  }
  draw();
  frame = visible && touring && !frozen ? requestAnimationFrame(tick) : 0;
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "80px" }).observe(stage);
const onPoint = (event) => {
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
  say(stepOf(u));
  if (!frozen) takeOver();
};
stage.addEventListener("pointermove", onPoint);
stage.addEventListener("mousemove", onPoint);
stage.addEventListener("pointerleave", () => {
  if (!hovering) return;
  hovering = false;
  say(stepOf(u));
  if (!frozen) takeOver();
});
stage.addEventListener("wheel", (event) => {
  event.preventDefault();
  if (!frozen) takeOver();
  else touring = false;
  u = Math.min(0.999, Math.max(0, u + event.deltaY * 0.0011));
  draw();
}, { passive: false });
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = beats.find((beat) => beat > u + 0.02);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = [...beats].reverse().find((beat) => beat < u - 0.02);
  if (next === undefined) next = event.key === "ArrowLeft" || event.key === "ArrowDown" ? beats[beats.length - 1] : beats[0];
  if (event.key === "Home" || event.key === " " || event.key === "Enter") next = 0;
  if (next === null) return;
  event.preventDefault();
  if (!frozen) takeOver();
  else touring = false;
  u = next;
  clock = u * TIMING.period;
  hovering = false;
  draw();
});
stage.addEventListener("focus", () => {
  touring = false;
  clearTimeout(idleTimer);
  say(stepOf(u));
});
stage.addEventListener("blur", () => {
  if (!frozen && !hovering) takeOver();
});
draw();
run();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Money loop",
  hint: "Scroll scrubs · hover a building",
  readout: "donors send",
  keys: [
    { mark: "lit", label: "The vote, lighting only as it returns to the donors" },
    { mark: "raised", label: "Wide pipe: unlimited money, super PAC, ads only" },
    { mark: "dim", label: "Narrow pipe: PAC, $5,000 per candidate per election" },
  ],
  caption:
    "Houses stand for people and the tower for companies. Both can fund a super PAC without limit; that building only buys ads and never gives to the candidate. A multicandidate PAC, funded here by the houses, may give $5,000 per candidate per election and may also advertise. The lit slab is the vote sending a benefit back. Scroll over the figure scrubs the loop. Hover a building to pause and name it.",
  body: `<style>.iso-stage{touch-action:pan-y;outline:none}</style><div class="iso-stage" tabindex="0" role="group" aria-roledescription="animated figure" aria-label="Money loop through a town. Scroll to scrub. Hover a building to name it. Arrow keys step the beats. Space returns to the start."><span data-live style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);border:0">donors send</span>${svg}</div>`,
});

const page = k.pageHtml({ title: "Money loop", theme, body, script: kitScript() + live, width: 780 });
const file = theme === "light" ? "money-loop-light.html" : "money-loop.html";
writeFileSync(join(HERE, file), page);
if (theme === "light") {
  mkdirSync(join(ROOT, "docs"), { recursive: true });
  writeFileSync(join(ROOT, "docs/index.html"), page);
  writeFileSync(join(ROOT, "index.html"), page);
}
console.log("wrote", file, "parts", partCount, "items", R.items.length);
