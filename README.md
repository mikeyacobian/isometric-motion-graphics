# Money loop

An isometric miniature town, built with the [Anatomy](https://skills.wheresryan.sh/anatomy) kit. Little buildings sit on one terrain slab. Coins travel between them in a loop.

Open `index.html`, or:

```sh
npm run dev
```

Then open http://127.0.0.1:4173

Dark theme, same drawing: `figures/money-loop/money-loop.html`.

The loop plays on its own. Scroll over the figure to scrub. Hover a building to pause and name it. Arrow keys step the beats. Space returns to the start. A frame can be frozen with `?t=0.5&still=1` (t is 0–1 around the loop).

## The loop

No words are drawn. The corner readout names the beat.

1. Houses (people) and an office tower (companies) send coins out.
2. A wide pipe carries unlimited money to the super PAC. A narrow pipe carries money to the PAC, the stand-in for a $5,000-per-candidate-per-election cap.
3. The super PAC only lights a billboard toward two voters. It has no pipe to the candidate. The PAC also sends a coin along a second narrow pipe into campaign headquarters.
4. Coins land on the ballot box, the headquarters flag rises, and the candidate walks to the capitol.
5. A slab on the capitol is the one lit accent: the vote. A coin travels back to the houses, and the loop repeats.

| Rule | What the town does | Source |
|---|---|---|
| Corporation or person to a super PAC | Wide pipe, no cap drawn | [Contributions to super PACs](https://www.fec.gov/help-candidates-and-committees/taking-receipts-pac/contributions-to-super-pacs-and-hybrid-pacs/) |
| Super PAC to a candidate | No pipe. Billboard only | [Who can and can't contribute](https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/who-can-and-cant-contribute/) |
| Multicandidate PAC to a candidate | Narrow pipe into headquarters, $5,000 per election | [SSF contribution limits](https://www.fec.gov/help-candidates-and-committees/making-disbursements-ssf-or-connected-organization/limits-contributions-made-candidates-by-ssf/) |

The drawing is 40 named parts (49 drawn items) plus 6 coins that only exist while the loop runs.
