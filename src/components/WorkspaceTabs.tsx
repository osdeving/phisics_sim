import { ReactNode } from "react";
import { SceneDefinition, ScenePanelData, SliderControl } from "../physics/scenes/types";
import { ControlPanel } from "./ControlPanel";
import { ExercisePanel } from "./ExercisePanel";
import { MathFoundationBoard } from "./MathFoundationBoard";
import { OverviewPanel } from "./OverviewPanel";
import { TutorialTabs } from "./TutorialTabs";

export type WorkspaceTabId = "scene" | "tutorial" | "exercise";

interface WorkspaceTabsProps {
  scene: SceneDefinition;
  panel: ScenePanelData;
  controls: SliderControl[];
  config: Record<string, number>;
  onChange: (key: string, value: number) => void;
  sceneContent: ReactNode;
  activeTab: WorkspaceTabId;
  onTabChange: (tabId: WorkspaceTabId) => void;
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
  activeTab,
  onTabChange,
}: WorkspaceTabsProps) {
  const sceneTabContent = (
    <div className="workspace-scene-tab">
      {scene.displayMode === "board" ? (
        <MathFoundationBoard scene={scene} panel={panel} />
      ) : (
        sceneContent
      )}

      <div className="workspace-scene-tab__panels">
        <section className="card workspace-panel-card">
          <div className="workspace-panel-card__header">
            <div>
              <p className="eyebrow">Leitura da cena</p>
              <h2>Métricas e equações</h2>
            </div>
            <p className="panel-text">
              Esta area acompanha a cena ativa e resume o que esta sendo medido e modelado.
            </p>
          </div>
          <OverviewPanel panel={panel} />
        </section>

        <ControlPanel controls={controls} config={config} onChange={onChange} />
      </div>
    </div>
  );

  const tutorialTabContent = (
    <div className="workspace-full-tab">
      <TutorialTabs sceneKey={scene.id} panel={panel} />
    </div>
  );

  const exerciseTabContent = (
    <section className="card workspace-panel-card workspace-panel-card--exercise">
      <div className="workspace-panel-card__header">
        <div>
          <p className="eyebrow">Aplicacao</p>
          <h2>Exercicios guiados</h2>
        </div>
        <p className="panel-text">
          Use esta aba para praticar sem a cena competir por espaco com o restante do conteudo.
        </p>
      </div>
      <ExercisePanel panel={panel} />
    </section>
  );

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
              onClick={() => onTabChange(tabId)}
            >
              {labels[tabId]}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "scene" && sceneTabContent}
      {activeTab === "tutorial" && tutorialTabContent}
      {activeTab === "exercise" && exerciseTabContent}
    </section>
  );
}
