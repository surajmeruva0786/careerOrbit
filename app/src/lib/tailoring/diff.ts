type Entry = { bullets: string[]; [k: string]: unknown };

export type FieldDiff = {
  key: string;
  before_order: string[];
  after_order: string[];
  bullet_changes: { entry: string; before: string[]; after: string[] }[];
};

function nameOf(entry: Entry): string {
  return (entry as { org?: string; name?: string }).org ?? (entry as { name?: string }).name ?? "unknown";
}

function diffSection(baseList: Entry[], tailoredList: Entry[]): FieldDiff {
  const before_order = baseList.map(nameOf);
  const after_order = tailoredList.map(nameOf);

  const baseByName = new Map(baseList.map((e) => [nameOf(e), e]));
  const bullet_changes = tailoredList
    .map((entry) => {
      const name = nameOf(entry);
      const baseEntry = baseByName.get(name);
      const before = baseEntry?.bullets ?? [];
      const after = entry.bullets;
      return { entry: name, before, after };
    })
    .filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after));

  return { key: "", before_order, after_order, bullet_changes };
}

/**
 * Structural diff between the base resume and a tailored version:
 * ordering changes plus per-entry bullet rewording. Not a text-level
 * diff -- enough for the review dashboard to show what changed and why.
 */
export function diffResume(
  base: { experience: Entry[]; projects: Entry[] },
  tailored: { experience: Entry[]; projects: Entry[] }
) {
  return {
    experience: { ...diffSection(base.experience, tailored.experience), key: "experience" },
    projects: { ...diffSection(base.projects, tailored.projects), key: "projects" },
  };
}
