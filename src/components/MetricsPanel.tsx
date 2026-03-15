import { ScenePanelData } from '../physics/scenes/types';

interface MetricsPanelProps {
  panel: ScenePanelData;
}

export function MetricsPanel({ panel }: MetricsPanelProps) {
  return (
    <div className="card stack-gap-sm">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Leitura em tempo real</p>
          <h2>Grandezas monitoradas</h2>
        </div>
      </div>

      <div className="metric-grid">
        {panel.metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span className="metric-card__label">{metric.label}</span>
            <strong className="metric-card__value">{metric.value}</strong>
            <span className="metric-card__helper">{metric.helper}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
