export const SSF_LIMIT = 5000;
export const TREASURY_TO_CANDIDATE = 0;
export const SUPER_PAC_TO_CANDIDATE = 0;
export const ADS_RATE = 72000;
export const SSF_RATE = 1250;

export type Cycle = {
  pressure: number;
  ssfToCandidate: number;
  adsSpent: number;
  treasuryToSuperPac: number;
  valve: number;
};

export type Input = {
  pressure: number;
};

export function createCycle(): Cycle {
  return { pressure: 0, ssfToCandidate: 0, adsSpent: 0, treasuryToSuperPac: 0, valve: 0 };
}

export function resetCycle(cycle: Cycle) {
  cycle.ssfToCandidate = 0;
  cycle.adsSpent = 0;
  cycle.treasuryToSuperPac = 0;
  cycle.valve = 0;
}

export function step(cycle: Cycle, dt: number, input: Input) {
  cycle.pressure = input.pressure;
  const on = cycle.pressure > 0.04;
  const ads = on ? ADS_RATE * cycle.pressure * dt : 0;
  cycle.adsSpent += ads;
  cycle.treasuryToSuperPac += ads;
  const room = SSF_LIMIT - cycle.ssfToCandidate;
  const ssf = on ? Math.min(SSF_RATE * dt, room) : 0;
  cycle.ssfToCandidate += ssf;
  const want = cycle.ssfToCandidate / SSF_LIMIT;
  cycle.valve += (want - cycle.valve) * Math.min(1, dt / 0.18);
  if (Math.abs(want - cycle.valve) < 0.002) cycle.valve = want;
}

export function adsRateOf(cycle: Cycle) {
  return cycle.pressure > 0.04 ? ADS_RATE * cycle.pressure : 0;
}

export function ssfRateOf(cycle: Cycle) {
  if (cycle.pressure <= 0.04) return 0;
  if (cycle.ssfToCandidate >= SSF_LIMIT - 0.5) return 0;
  return SSF_RATE;
}

export function dollars(value: number) {
  const n = Math.round(value);
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(2).replace(/\.?0+$/, "") + "M";
  return "$" + n.toLocaleString("en-US");
}

export function readoutOf(cycle: Cycle) {
  const cap = cycle.ssfToCandidate >= SSF_LIMIT - 0.5;
  const ssf = cap ? "ssf " + dollars(SSF_LIMIT) + " cap" : "ssf " + dollars(cycle.ssfToCandidate) + " / " + dollars(SSF_LIMIT);
  return ssf + " · ads " + dollars(cycle.adsSpent);
}

export function describeOf(cycle: Cycle) {
  const cap = cycle.ssfToCandidate >= SSF_LIMIT - 0.5;
  return (
    "Treasury pressure " +
    Math.round(cycle.pressure * 100) +
    " percent. Connected PAC " +
    dollars(cycle.ssfToCandidate) +
    (cap ? ", at the $5,000 limit. " : " of $5,000. ") +
    "Super PAC independent ads " +
    dollars(cycle.adsSpent) +
    ". Candidate receives " +
    dollars(cycle.ssfToCandidate) +
    " from the PAC, $0 from treasury, $0 from the Super PAC."
  );
}
