import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Load data
with open('fightData.json', 'r') as f:
    data = json.load(f)

# Prepare DataFrame
records = []
for rec in data:
    fighters = [f.strip("'") for f in rec['fighters']]
    winner = rec['winner'].strip("'")
    for mon in fighters:
        records.append({'mon': mon, 'fighters': fighters, 'win': mon == winner})
df = pd.DataFrame(records)

# 1) Overall Win Rates
overall = df.groupby('mon')['win'].mean() * 100
overall = overall.sort_index()
mons = overall.index.tolist()
win_rates = overall.values

plt.figure()
plt.bar(mons, win_rates)
plt.ylabel('Overall Win Percentage')
plt.xticks(rotation=45, ha='right')
plt.title('Overall Win Rates by Pokémon')
plt.tight_layout()
plt.show()

# 2) Head-to-Head Win Rate Matrix
from collections import defaultdict
hh = defaultdict(lambda: {'matches': 0, 'wins': 0})
for rec in data:
    fighters = [f.strip("'") for f in rec['fighters']]
    winner = rec['winner'].strip("'")
    for mon in fighters:
        for opp in fighters:
            if mon == opp:
                continue
            key = (mon, opp)
            hh[key]['matches'] += 1
            if winner == mon:
                hh[key]['wins'] += 1

n = len(mons)
matrix = np.full((n, n), np.nan)
for i, mon in enumerate(mons):
    for j, opp in enumerate(mons):
        if mon == opp:
            continue
        counts = hh[(mon, opp)]
        if counts['matches'] >= 5:
            matrix[i, j] = counts['wins'] / counts['matches'] * 100

plt.figure()
plt.imshow(matrix, aspect='equal')
plt.colorbar(label='Win Rate (%)')
plt.xticks(range(n), mons, rotation=90)
plt.yticks(range(n), mons)
plt.title('Head-to-Head Win Rate Matrix (%)')
plt.tight_layout()
plt.show()

# 3) Win Rate by Match Size
df['match_size'] = df['fighters'].apply(len)
size_df = df.groupby(['mon', 'match_size'])['win'].mean().unstack() * 100
size_df = size_df.reindex(mons)  # align order

plt.figure()
for mon in mons:
    plt.plot(size_df.columns, size_df.loc[mon], marker='o', label=mon)
plt.xlabel('Match Size (Number of Fighters)')
plt.ylabel('Win Percentage')
plt.title('Win Rate vs. Match Size')
plt.xticks(size_df.columns)
plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
plt.tight_layout()
plt.show()
