import { useEffect, useMemo, useState } from "react";
import { ScenePanelData } from "../physics/scenes/types";
import { MathFormula } from "./MathFormula";

type TutorialTabId =
  | "concept"
  | "formulas"
  | "loop"
  | "study"
  | "intuition"
  | "engineering"
  | "pitfalls"
  | "references";

interface TutorialTabsProps {
  panel: ScenePanelData;
  embedded?: boolean;
}

const labels: Record<TutorialTabId, string> = {
  concept: "Conceito",
  formulas: "Equações",
  loop: "Solver",
  study: "Estudo",
  intuition: "Intuição",
  engineering: "Engenharia",
  pitfalls: "Erros comuns",
  references: "Referências",
};

export function TutorialTabs({ panel, embedded = false }: TutorialTabsProps) {
  const [activeTab, setActiveTab] = useState<TutorialTabId>("concept");

  const availableTabs = useMemo(() => {
    return (Object.keys(labels) as TutorialTabId[]).filter((tabId) => {
      if (tabId === "intuition") {
        return Boolean(panel.intuition?.length);
      }
      if (tabId === "engineering") {
        return Boolean(panel.engineering?.length);
      }
      if (tabId === "pitfalls") {
        return Boolean(panel.pitfalls?.length);
      }
      if (tabId === "references") {
        return Boolean(panel.references?.length);
      }
      return true;
    });
  }, [panel.engineering, panel.intuition, panel.pitfalls, panel.references]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] ?? "concept");
    }
  }, [activeTab, availableTabs]);

  const content: Array<{
    title: string;
    body?: string;
    bullets?: string[];
    formula?: string;
  }> = useMemo(() => {
    switch (activeTab) {
      case "concept":
        return panel.concept.map((item) => ({
          title: item.title,
          body: item.body,
          bullets: item.bullets,
        }));
      case "formulas":
        return panel.formulas.map((item) => ({
          title: item.title,
          formula: item.formula,
          body: item.explanation,
        }));
      case "loop":
        return panel.loopSteps.map((item) => ({
          title: item.title,
          body: item.body,
          bullets: item.bullets,
        }));
      case "study":
        return panel.studyNotes.map((item) => ({
          title: item.title,
          body: item.body,
          bullets: item.bullets,
        }));
      case "intuition":
        return (panel.intuition ?? []).map((item) => ({
          title: item.title,
          body: item.body,
          bullets: item.bullets,
        }));
      case "engineering":
        return (panel.engineering ?? []).map((item) => ({
          title: item.title,
          body: item.body,
          bullets: item.bullets,
        }));
      case "pitfalls":
        return (panel.pitfalls ?? []).map((item) => ({
          title: item.title,
          body: item.body,
          bullets: item.bullets,
        }));
      case "references":
        return (panel.references ?? []).map((item) => ({
          title: item.title,
          body: item.description,
          bullets: item.href ? [item.href] : undefined,
        }));
      default:
        return [];
    }
  }, [activeTab, panel]);

  return (
    <div
      className={
        embedded ? "stack-gap-sm inspector-panel" : "card stack-gap-sm"
      }
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Tutorial guiado</p>
          <h2>Entenda a simulação</h2>
        </div>
        <p className="panel-text">
          Cada aba explica o fenômeno, as equações e o fluxo numérico.
        </p>
      </div>

      <div className="tutorial-tabs__buttons">
        {availableTabs.map((tabId) => (
          <button
            key={tabId}
            type="button"
            className={`tutorial-tabs__button ${tabId === activeTab ? "is-active" : ""}`}
            onClick={() => setActiveTab(tabId)}
          >
            {labels[tabId]}
          </button>
        ))}
      </div>

      <div className="tutorial-tabs__content">
        {activeTab === "references" && panel.references
          ? panel.references.map((item) => (
              <article
                key={item.title}
                className="tutorial-item tutorial-item--reference"
              >
                {item.src && (
                  <img
                    src={item.src}
                    alt={item.title}
                    className="tutorial-reference__image"
                  />
                )}
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  {item.href && (
                    <p>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="tutorial-link"
                      >
                        Ver fonte/licença
                      </a>
                    </p>
                  )}
                </div>
              </article>
            ))
          : content.map((item) => (
              <article key={item.title} className="tutorial-item">
                <h3>{item.title}</h3>
                {item.formula && (
                  <div className="tutorial-formula">
                    <MathFormula expression={item.formula} displayMode />
                  </div>
                )}
                {item.body && <p>{item.body}</p>}
                {item.bullets && (
                  <ul>
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>
                        {bullet.startsWith("http") ? (
                          <a
                            href={bullet}
                            target="_blank"
                            rel="noreferrer"
                            className="tutorial-link"
                          >
                            {bullet}
                          </a>
                        ) : (
                          bullet
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
      </div>
    </div>
  );
}
