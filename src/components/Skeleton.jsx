export default function Skeleton({
  variant = "table",
  rows = 5,
  columns = 5,
  count = 4,
}) {
  if (variant === "cards") {
    return (
      <div className="loading-skeleton-cards" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div className="loading-skeleton-card" key={index}>
            <span className="loading-skeleton-shape short" />
            <span className="loading-skeleton-shape value" />
            <span className="loading-skeleton-shape medium" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="loading-skeleton-list" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div className="loading-skeleton-list-row" key={index}>
            <span className="loading-skeleton-shape medium" />
            <span className="loading-skeleton-shape short" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className="loading-skeleton-chart" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <span
            className="loading-skeleton-chart-bar"
            key={index}
            style={{ height: `${35 + ((index * 17) % 55)}%` }}
          />
        ))}
      </div>
    );
  }

  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr className="loading-skeleton-table-row" key={rowIndex} aria-hidden="true">
      {Array.from({ length: columns }, (_, columnIndex) => (
        <td key={columnIndex}>
          <span
            className={`loading-skeleton-shape ${columnIndex % 3 === 0 ? "medium" : "short"}`}
          />
        </td>
      ))}
    </tr>
  ));
}
