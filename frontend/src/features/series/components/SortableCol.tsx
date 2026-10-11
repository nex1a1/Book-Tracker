// Clickable column header: first click sorts by `defaultOrder`, the next ones flip the order.
// Used by the series list view and the missing-volume checklist.
interface SortableColProps {
  label: string;
  sortKey: string;
  defaultOrder: 'ASC' | 'DESC';
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  onSortChange: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void;
  className?: string;
}

export function SortableCol({ label, sortKey, defaultOrder, sortBy, sortOrder, onSortChange, className }: SortableColProps) {
  const isActive = sortBy === sortKey;
  return (
    <button
      type="button"
      className={`list-header-col list-header-col--sortable ${isActive ? 'list-header-col--active' : ''} ${className || ''}`}
      onClick={() => onSortChange(sortKey, isActive ? (sortOrder === 'ASC' ? 'DESC' : 'ASC') : defaultOrder)}
      aria-pressed={isActive}
    >
      {label}
      <span className="list-header-col__sort-icon" aria-hidden="true">
        {isActive ? (sortOrder === 'ASC' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  );
}
