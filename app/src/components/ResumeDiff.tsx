"use client";

import { useState } from "react";

type SectionDiff = {
  key: string;
  before_order: string[];
  after_order: string[];
  bullet_changes: { entry: string; before: string[]; after: string[] }[];
};

type Diff = { experience: SectionDiff; projects: SectionDiff } | null;

function Section({ section }: { section: SectionDiff }) {
  const reordered = JSON.stringify(section.before_order) !== JSON.stringify(section.after_order);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wide opacity-60">{section.key}</div>
      {reordered && (
        <div className="text-xs opacity-70">
          reordered: {section.after_order.join(" → ")}
        </div>
      )}
      {section.bullet_changes.map((change) => (
        <div key={change.entry} className="text-sm">
          <div className="font-medium">{change.entry}</div>
          {change.before.map((b, i) => (
            <div key={`b${i}`} className="pl-3 text-red-700/80 dark:text-red-400/80 line-through decoration-1">
              {b}
            </div>
          ))}
          {change.after.map((a, i) => (
            <div key={`a${i}`} className="pl-3 text-green-700/80 dark:text-green-400/80">
              {a}
            </div>
          ))}
        </div>
      ))}
      {section.bullet_changes.length === 0 && !reordered && (
        <div className="text-sm opacity-50">No changes.</div>
      )}
    </div>
  );
}

export function ResumeDiff({
  diff: rawDiff,
  coverNote,
}: {
  diff: unknown;
  coverNote?: string;
}) {
  const [open, setOpen] = useState(false);
  const diff = rawDiff as Diff;

  if (!diff) return null;

  return (
    <div className="border-t border-black/10 dark:border-white/15 pt-2 mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm underline opacity-70 hover:opacity-100"
      >
        {open ? "Hide" : "Show"} tailored resume diff
      </button>
      {open && (
        <div className="flex flex-col gap-3 mt-3">
          <Section section={diff.experience} />
          <Section section={diff.projects} />
          {coverNote && (
            <div>
              <div className="text-xs uppercase tracking-wide opacity-60">cover note</div>
              <p className="text-sm">{coverNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
