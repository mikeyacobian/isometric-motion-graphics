# Campaign finance bench

One isometric bench, built with the [Anatomy](https://skills.wheresryan.sh/anatomy) kit. A corporate vault, a super PAC tank, a broadcast, a firewall, and a podium. Two inputs move on their own, and either one can be set by hand.

Open `index.html`, or:

```sh
npm run dev
```

Then open http://127.0.0.1:4173

Dark theme, same drawing: `figures/money-loop/money-loop.html`.

The tour plays on its own and pauses while the pointer is on a part. Arrow up and down set treasury. Arrow left and right set employee gifts. Space clears both. Hover names the part under the pointer.

## The three beats

No words are drawn. The corner readout names the beat.

1. Treasury opens. Coins run the wide pipe and the tank fills. There is no ceiling on that number.
2. Employee gifts run the thin pipe. The needle meets the stop at $5,000 and stays there.
3. A disc leaves the broadcast and stops at the firewall. The tank does not drain into the podium, and the needle stays on the stop.

| Rule | What the bench does | Source |
|---|---|---|
| Corporation to a super PAC | Wide pipe into the tank, no cap | [Contributions to super PACs](https://www.fec.gov/help-candidates-and-committees/taking-receipts-pac/contributions-to-super-pacs-and-hybrid-pacs/) |
| Super PAC to a candidate | No pipe. The vault port toward the podium is a blind flange. The broadcast faces the voters and stops at the firewall | [Who can and can't contribute](https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/who-can-and-cant-contribute/) |
| Employee / SSF gifts to a candidate | Thin pipe through the $5,000 stop into the podium | [SSF contribution limits](https://www.fec.gov/help-candidates-and-committees/making-disbursements-ssf-or-connected-organization/limits-contributions-made-candidates-by-ssf/) |

The drawing is 86 named parts (97 drawn items). The coins are not parts; they move inside reserved slots in the painter's order.
