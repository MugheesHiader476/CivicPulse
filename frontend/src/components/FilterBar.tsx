import type { ReactNode } from "react";
import { X } from "lucide-react";
import { CATEGORIES, PRIORITIES, STATUSES, type Category, type Priority, type Status } from "../api/client";
import { CATEGORY_META, PRIORITY_META, STATUS_META } from "../lib/presentation";

export interface Filters {
  category: Category | null;
  priority: Priority | null;
  status: Status | null;
}

interface GroupProps<T extends string> {
  name: keyof Filters;
  legend: string;
  values: readonly T[];
  selected: T | null;
  label: (value: T) => string;
  icon?: (value: T) => ReactNode;
  onChange: (value: T | null) => void;
}

function ChipGroup<T extends string>({ name, legend, values, selected, label, icon, onChange }: GroupProps<T>) {
  return (
    <fieldset className="chip-group">
      <legend>{legend}</legend>
      <div className="chips">
        <label className="chip" data-all="">
          <input type="radio" name={name} checked={selected === null} onChange={() => onChange(null)} />
          <span>All</span>
        </label>
        {values.map((value) => (
          <label key={value} className="chip" {...{ [`data-${name}`]: value }}>
            <input type="radio" name={name} value={value} checked={selected === value} onChange={() => onChange(value)} />
            <span>
              {icon?.(value)}
              {label(value)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FilterBar({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  const active = [filters.category, filters.priority, filters.status].filter(Boolean).length;

  return (
    <section className="card filter-bar" aria-label="Filters">
      <ChipGroup
        name="category"
        legend="Category"
        values={CATEGORIES}
        selected={filters.category}
        label={(c) => CATEGORY_META[c].label}
        icon={(c) => {
          const Icon = CATEGORY_META[c].icon;
          return <Icon size={15} strokeWidth={2.5} aria-hidden="true" className="chip-icon" />;
        }}
        onChange={(category) => onChange({ ...filters, category })}
      />
      <div className="filter-row">
        <ChipGroup
          name="priority"
          legend="Priority"
          values={PRIORITIES}
          selected={filters.priority}
          label={(p) => PRIORITY_META[p].label}
          onChange={(priority) => onChange({ ...filters, priority })}
        />
        <ChipGroup
          name="status"
          legend="Status"
          values={STATUSES}
          selected={filters.status}
          label={(s) => STATUS_META[s].label}
          onChange={(status) => onChange({ ...filters, status })}
        />
      </div>
      {active > 0 && (
        <button
          type="button"
          className="btn btn-ghost btn-sm clear-filters"
          onClick={() => onChange({ category: null, priority: null, status: null })}
        >
          <X size={16} aria-hidden="true" /> Clear {active} filter{active > 1 ? "s" : ""}
        </button>
      )}
    </section>
  );
}
