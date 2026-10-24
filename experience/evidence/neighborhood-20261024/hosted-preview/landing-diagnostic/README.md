# Initial landing visibility diagnostic

The immutable attempt recorded **1 pass and 2 failures** before app entry.
Both English/Chinese deep links existed with the intended URLs. The added
driver check expected both localized entry links to be visible simultaneously;
the authored landing displays its active language section. The subsequent
hidden-link scroll timed out after the original 120-second bound.

The complete report, executing driver and stdout are retained unchanged with
encoded/decoded hashes in [binding.json](binding.json). No neighborhood
interaction was executed in this attempt. The later flow uses the actual
English/中文 navigation links and checks the active/inactive sections separately.
