# Campaign finance bench

A small Anatomy figure: an isometric flow bench that explains how corporate money can and cannot reach a US federal candidate.

This is a **Figure** (42 named parts, SVG only). Light theme, framework-free TypeScript compiled to a standalone HTML page. The drawing uses Anatomy’s shipping tokens: `--anatomy-weight: .6px`, four-tone isometric shading, one lit accent.

## View it

```sh
npm run dev
```

Then open http://127.0.0.1:4173

Or open `index.html` / `docs/index.html` in a browser (same light page). Dark theme: `figures/campaign-bench/campaign-bench.html`.

GitHub Pages: this repo deploys `docs/` from `main` via `.github/workflows/pages.yml`. Until that is enabled in the repo settings, use `npm run dev`.

## What it is

The object is a two-lane laboratory bench.

- A **treasury vat** (corporation) can dump unlimited fluid through a **wide unmetered duct** into a Super PAC box. The Super PAC cannot pipe anything to the candidate. Its only outlet is a **lit lamp** aimed at a row of standing voter plates (independent ads). A **glass partition** stands between that broadcast and the candidate cup.
- A **blanked port** on the vat shows that treasury money cannot go to a candidate.
- A **separate hopper** (connected PAC / SSF) takes voluntary drops, not treasury fluid. A **narrow metered line** runs through a valve and dial into the candidate cup and stops at **$5,000 per election**.

Drag up to raise treasury pressure (or use the arrow keys). Space resets the election. The readout is the same model that moves the needle, the cup fill, the knob, and the flow dashes.

## FEC sources

Verified 2025–2026:

| Rule | Number | Source |
|---|---|---|
| Multicandidate PAC / SSF to a candidate | **$5,000 per election** | [Limits on contributions made to candidates by the SSF](https://www.fec.gov/help-candidates-and-committees/making-disbursements-ssf-or-connected-organization/limits-contributions-made-candidates-by-ssf/) |
| Corporations may not give treasury money to candidates | prohibited | [Who can and can't contribute](https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/who-can-and-cant-contribute/) |
| Corporation may sponsor an SSF funded by voluntary donations; treasury may only pay admin costs | — | [Who can and can't contribute to the SSF](https://www.fec.gov/help-candidates-and-committees/taking-receipts-ssf/who-can-and-cant-contribute-to-ssf/) |
| Super PACs may accept unlimited contributions, including from corporations | unlimited | [Contributions to Super PACs and Hybrid PACs](https://www.fec.gov/help-candidates-and-committees/taking-receipts-pac/contributions-to-super-pacs-and-hybrid-pacs/) |
| Super PACs do not make contributions to candidates; they make independent expenditures | $0 to candidate | [Who can and can't contribute](https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/who-can-and-cant-contribute/) · [Making independent expenditures](https://www.fec.gov/help-candidates-and-committees/making-independent-expenditures/) |
| Independent expenditure: not made in cooperation, consultation, or concert with, or at the request or suggestion of, a candidate | coordination wall | [Making independent expenditures](https://www.fec.gov/help-candidates-and-committees/making-independent-expenditures/) |

A non-multicandidate SSF is limited to $3,500 per election (2025–2026, indexed). This figure models a **multicandidate** SSF at the $5,000 cap.

## Anatomy skill

The figure is built with a vendored copy of the Anatomy kit (`kit/`, MIT, from [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy)). Closest shipped example: `examples/dial-indicator/` (small SVG, live readout from a model). Visual reference: light figures on [skills.wheresryan.sh](https://skills.wheresryan.sh/anatomy).

```sh
npm run build    # light + dark HTML
npm run audit    # geometry audit
npm run lines    # line-end check
```

## Parts (Figure)

Base plate on feet, groove, screws, ruler, label plate, two rails with end stops; treasury vat with lid, collar, knurled knob, blanked boss and cap, Super PAC outlet boss; SSF hopper with rim; wide ads duct with flanges and a band; Super PAC box and smoothly shaded lit lamp; three voter blocks on a plinth; glass partition on two posts; narrow SSF line with flanges; metering valve, neck and dial; candidate cup. **42** named parts, **57** depth-sorted items.
