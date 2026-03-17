import { SceneDefinition, ScenePanelData } from "../physics/scenes/types";
import { MathFormula } from "./MathFormula";

interface MathFoundationBoardProps {
  scene: SceneDefinition;
  panel: ScenePanelData;
}

function collectBoardNotes(scene: SceneDefinition, panel: ScenePanelData) {
  const items = [
    ...(scene.boardHighlights ?? []),
    ...panel.concept.map((item) => item.body),
    ...panel.studyNotes.map((item) => item.body),
    ...(panel.intuition ?? []).map((item) => item.body),
    ...(panel.pitfalls ?? []).map((item) => item.body),
  ].filter(Boolean);

  return items.slice(0, 8);
}

export function MathFoundationBoard({
  scene,
  panel,
}: MathFoundationBoardProps) {
  const boardNotes = collectBoardNotes(scene, panel);

  return (
    <section className="math-board">
      <div className="math-board__paper">
        <header className="math-board__hero">
          <div className="math-board__hero-main">
            <span className="math-board__badge">BASE</span>
            <h2>{scene.title}</h2>
            <p className="math-board__subtitle">{scene.subtitle}</p>
            <p className="math-board__summary">{scene.summary}</p>
          </div>

          <div className="math-board__hero-side">
            <span className="math-board__label">
              {scene.boardLabel ?? scene.category}
            </span>
            <div className="math-board__tag-list">
              {(scene.boardTags ?? []).map((tag) => (
                <span key={tag} className="math-board__tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="math-board__grid">
          <section className="math-board__section">
            <div className="math-board__section-heading">
              <p className="eyebrow">Mapa rapido</p>
              <h3>Ideias que precisam ficar automaticas</h3>
            </div>

            <ul className="math-board__bullet-list">
              {boardNotes.map((note, index) => (
                <li key={`${scene.id}-note-${index}`}>{note}</li>
              ))}
            </ul>
          </section>

          <section className="math-board__section">
            <div className="math-board__section-heading">
              <p className="eyebrow">Formulas-chave</p>
              <h3>Padroes que mais voltam</h3>
            </div>

            <div className="math-board__formula-list">
              {panel.formulas.map((formula) => (
                <article key={formula.title} className="math-board__formula-card">
                  <span className="math-board__formula-title">
                    {formula.title}
                  </span>
                  <div className="math-board__formula-expression">
                    <MathFormula expression={formula.formula} displayMode />
                  </div>
                  <p>{formula.explanation}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="math-board__rail">
            <section className="math-board__section math-board__section--compact">
              <div className="math-board__section-heading">
                <p className="eyebrow">Metricas</p>
                <h3>O foco dessa base</h3>
              </div>

              <div className="math-board__metric-list">
                {panel.metrics.map((metric) => (
                  <article key={metric.label} className="math-board__metric-card">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <p>{metric.helper}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="math-board__section math-board__section--compact">
              <div className="math-board__section-heading">
                <p className="eyebrow">Roteiro</p>
                <h3>Como estudar aqui</h3>
              </div>

              <ol className="math-board__step-list">
                {panel.loopSteps.map((step) => (
                  <li key={step.title}>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
