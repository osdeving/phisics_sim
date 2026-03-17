import { ScenePanelData } from "../physics/scenes/types";
import { MathFormula } from "./MathFormula";

interface OverviewPanelProps {
  panel: ScenePanelData;
}

export function OverviewPanel({ panel }: OverviewPanelProps) {
  return (
    <div className="overview-panel">
      <section className="inspector-section">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Leitura rápida</p>
            <h3>Métricas principais</h3>
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
      </section>

      <section className="inspector-section">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Equações</p>
            <h3>O que a cena usa</h3>
          </div>
        </div>

        <div className="formula-grid">
          {panel.formulas.map((formula) => (
            <article key={formula.title} className="formula-card">
              <span className="formula-card__label">{formula.title}</span>
              <strong className="formula-card__formula">
                <MathFormula expression={formula.formula} displayMode />
              </strong>
              <p className="panel-text">{formula.explanation}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
