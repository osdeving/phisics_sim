import { ReactNode, useState } from "react";
import { SceneDefinition, ScenePanelData, SliderControl } from "../physics/scenes/types";
import { ControlPanel } from "./ControlPanel";
import { ExercisePanel } from "./ExercisePanel";
import { OverviewPanel } from "./OverviewPanel";
import { TutorialTabs } from "./TutorialTabs";

type WorkspaceTabId = "scene" | "tutorial" | "exercise";

interface WorkspaceTabsProps {
  scene: SceneDefinition;
  panel: ScenePanelData;
  controls: SliderControl[];
  config: Record<string, number>;
  onChange: (key: string, value: number) => void;
  sceneContent: ReactNode;
}

const labels: Record<WorkspaceTabId, string> = {
  scene: "Cena",
  tutorial: "Tutorial",
  exercise: "Exercícios",
};

export function WorkspaceTabs({
  scene,
  panel,
  controls,
  config,
  onChange,
  sceneContent,
}: WorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("scene");

  return (
    <section className="workspace-main">
      <header className="card workspace-header">
        <div className="workspace-header__copy">
          <p className="eyebrow">{scene.category}</p>
          <h1>{scene.title}</h1>
          <p className="workspace-header__summary">{scene.summary}</p>
        </div>

        <div className="workspace-tabs__buttons">
          {(Object.keys(labels) as WorkspaceTabId[]).map((tabId) => (
            <button
              key={tabId}
              type="button"
              className={`workspace-tabs__button ${tabId === activeTab ? "is-active" : ""}`}
              onClick={() => setActiveTab(tabId)}
            >
              {labels[tabId]}
            </button>
          ))}
        </div>
      </header>

      <div className="workspace-scene-tab" hidden={activeTab !== "scene"}>
          {sceneContent}

          <div className="workspace-scene-tab__panels">
            <section className="card workspace-panel-card">
              <div className="workspace-panel-card__header">
                <div>
                  <p className="eyebrow">Leitura da cena</p>
                  <h2>Métricas e equações</h2>
                </div>
                <p className="panel-text">
                  Esta área acompanha a cena ativa e resume o que está sendo medido e modelado.
                </p>
              </div>
              <OverviewPanel panel={panel} />
            </section>

            <ControlPanel
              controls={controls}
              config={config}
              onChange={onChange}
            />
          </div>
        </div>

      <div className="workspace-full-tab" hidden={activeTab !== "tutorial"}>
          <TutorialTabs sceneKey={scene.id} panel={panel} />
        </div>

      <section
        className="card workspace-panel-card workspace-panel-card--exercise"
        hidden={activeTab !== "exercise"}
      >
          <div className="workspace-panel-card__header">
            <div>
              <p className="eyebrow">Aplicação</p>
              <h2>Exercícios guiados</h2>
            </div>
            <p className="panel-text">
              Use esta aba para praticar sem a cena competindo por espaço na leitura.
            </p>
          </div>
          <ExercisePanel panel={panel} />
        </section>
    </section>
  );
}
