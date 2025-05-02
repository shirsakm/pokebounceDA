# plotAdjustedH2H.py
# Generate a red-color heatmap of head-to-head win-rate minus overall win-rate for each Pokémon.

import json
import numpy as np
import matplotlib.pyplot as plt

# Load your data file (ensure it's in the same directory)
with open('fightData.json', 'r') as f:
    data = json.load(f)

# 1) Identify all Pokémon
mons = sorted({fighter.strip("'") for rec in data for fighter in rec['fighters']})
n = len(mons)

# 2) Compute overall win rates
overall_counts = {mon: {'wins': 0, 'apps': 0} for mon in mons}
for rec in data:
    fighters = [f.strip("'") for f in rec['fighters']]
    winner = rec['winner'].strip("'")
    for mon in fighters:
        overall_counts[mon]['apps'] += 1
        if mon == winner:
            overall_counts[mon]['wins'] += 1
overall_rates = np.array([overall_counts[mon]['wins'] / overall_counts[mon]['apps'] * 100 for mon in mons])

# 3) Compute head-to-head rates (only include matchups with >=5 meetings)
h2h_counts = {(mon, opp): {'matches': 0, 'wins': 0} for mon in mons for opp in mons if mon != opp}
for rec in data:
    fighters = [f.strip("'") for f in rec['fighters']]
    winner = rec['winner'].strip("'")
    for mon in fighters:
        for opp in fighters:
            if mon == opp:
                continue
            key = (mon, opp)
            h2h_counts[key]['matches'] += 1
            if mon == winner:
                h2h_counts[key]['wins'] += 1

# 4) Build the difference matrix
diff_matrix = np.full((n, n), np.nan)
for i, mon in enumerate(mons):
    for j, opp in enumerate(mons):
        if mon == opp:
            continue
        counts = h2h_counts[(mon, opp)]
        if counts['matches'] >= 5:
            rate = counts['wins'] / counts['matches'] * 100
            diff_matrix[i, j] = rate - overall_rates[i]

# 5) Plot the heatmap
plt.figure(figsize=(8, 8))
im = plt.imshow(diff_matrix, aspect='equal', cmap='Reds',
                vmin=np.nanmin(diff_matrix), vmax=np.nanmax(diff_matrix))
plt.colorbar(im, label='H2H − Overall Win % (Δ %)')
plt.xticks(range(n), mons, rotation=90)
plt.yticks(range(n), mons)
plt.title('Adjusted Head-to-Head Performance (Red Scale)')
plt.tight_layout()
plt.show()

# To run: python plotAdjustedH2H.py
