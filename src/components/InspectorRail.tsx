import { useMemo, useState } from "react";
import { SceneDefinition, ScenePanelData } from "../physics/scenes/types";
import { MathFormula } from "./MathFormula";

type InspectorRailTabId = "summary" | "formulas" | "notes";

interface InspectorRailProps {
  scene: SceneDefinition;
  panel: ScenePanelData;
}

const inspectorLabels: Record<InspectorRailTabId, string> = {
  summary: "Resumo",
  formulas: "Equações",
  notes: "Guia",
};

export function InspectorRail({ scene, panel }: InspectorRailProps) {
  const [activeTab, setActiveTab] = useState<InspectorRailTabId>("summary");

  const notes = useMemo(() => {
    return [
      ...scene.keyboardHints,
      ...panel.studyNotes.map((item) => item.body),
      ...(panel.pitfalls ?? []).map((item) => item.body),
    ].slice(0, 8);
  }, [panel.pitfalls, panel.studyNotes, scene.keyboardHints]);

  return (
    <aside className="card inspector-rail">
      <header className="inspector-rail__header">
        <div>
          <p className="eyebrow">Inspector</p>
          <h2>{scene.title}</h2>
        </div>

        <div className="inspector-rail__tabs">
          {(Object.keys(inspectorLabels) as InspectorRailTabId[]).map((tabId) => (
            <button
              key={tabId}
              type="button"
              className={`tutorial-tabs__button ${activeTab === tabId ? "is-active" : ""}`}
              onClick={() => setActiveTab(tabId)}
            >
              {inspectorLabels[tabId]}
            </button>
          ))}
        </div>
      </header>

      <div className="inspector-rail__body">
        {activeTab === "summary" && (
          <div className="stack-gap-sm">
            <section className="inspector-panel">
              <p className="eyebrow">Cena ativa</p>
              <h3>{scene.subtitle}</h3>
              <p className="panel-text">{scene.summary}</p>
            </section>

            <section className="inspector-panel">
              <p className="eyebrow">Métricas</p>
              <div className="inspector-rail__metric-list">
                {panel.metrics.map((metric) => (
                  <article key={metric.label} className="metric-card">
                    <span className="metric-card__label">{metric.label}</span>
                    <strong className="metric-card__value">{metric.value}</strong>
                    <span className="metric-card__helper">{metric.helper}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "formulas" && (
          <div className="stack-gap-sm">
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
        )}

        {activeTab === "notes" && (
          <div className="stack-gap-sm">
            <section className="inspector-panel">
              <p className="eyebrow">Atalhos mentais</p>
              <ul className="inspector-rail__list">
                {notes.map((note, index) => (
                  <li key={`${scene.id}-note-${index}`}>{note}</li>
                ))}
              </ul>
            </section>

            {!!panel.exercises.length && (
              <section className="inspector-panel">
                <p className="eyebrow">Exercício rápido</p>
                <h3>{panel.exercises[0].title}</h3>
                <p className="panel-text">{panel.exercises[0].prompt}</p>
                <div className="exercise-card__answer">
                  <strong>Resposta</strong>
                  <p>{panel.exercises[0].answer}</p>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
