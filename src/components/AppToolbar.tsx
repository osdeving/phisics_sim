import { SceneDefinition } from "../physics/scenes/types";
import { WorkspaceTabId } from "./WorkspaceTabs";

interface AppToolbarProps {
  scenes: SceneDefinition[];
  activeScene: SceneDefinition;
  activeTab: WorkspaceTabId;
  leftDockCollapsed: boolean;
  rightDockCollapsed: boolean;
  onChangeScene: (sceneId: string) => void;
  onChangeTab: (tabId: WorkspaceTabId) => void;
  onPreviousScene: () => void;
  onNextScene: () => void;
  onToggleLeftDock: () => void;
  onToggleRightDock: () => void;
}

const tabLabels: Record<WorkspaceTabId, string> = {
  scene: "Cena",
  tutorial: "Tutorial",
  exercise: "Exercícios",
};

export function AppToolbar({
  scenes,
  activeScene,
  activeTab,
  leftDockCollapsed,
  rightDockCollapsed,
  onChangeScene,
  onChangeTab,
  onPreviousScene,
  onNextScene,
  onToggleLeftDock,
  onToggleRightDock,
}: AppToolbarProps) {
  return (
    <section className="app-toolbar card" aria-label="Ferramentas do workspace">
      <div className="app-toolbar__cluster app-toolbar__cluster--scene">
        <label className="app-toolbar__field">
          <span className="app-toolbar__label">Cena</span>
          <select
            value={activeScene.id}
            onChange={(event) => onChangeScene(event.target.value)}
            className="app-toolbar__select"
          >
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.category} · {scene.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="app-toolbar__cluster">
        <button type="button" className="app-toolbar__button" onClick={onPreviousScene}>
          ← Anterior
        </button>
        <button type="button" className="app-toolbar__button" onClick={onNextScene}>
          Próxima →
        </button>
      </div>

      <div className="app-toolbar__cluster">
        {(Object.keys(tabLabels) as WorkspaceTabId[]).map((tabId) => (
          <button
            key={tabId}
            type="button"
            className={`app-toolbar__button ${activeTab === tabId ? "is-active" : ""}`}
            onClick={() => onChangeTab(tabId)}
          >
            {tabLabels[tabId]}
          </button>
        ))}
      </div>

      <div className="app-toolbar__cluster">
        <button
          type="button"
          className={`app-toolbar__button ${leftDockCollapsed ? "" : "is-active"}`}
          onClick={onToggleLeftDock}
        >
          {leftDockCollapsed ? "Mostrar biblioteca" : "Ocultar biblioteca"}
        </button>
        <button
          type="button"
          className={`app-toolbar__button ${rightDockCollapsed ? "" : "is-active"}`}
          onClick={onToggleRightDock}
        >
          {rightDockCollapsed ? "Mostrar inspector" : "Ocultar inspector"}
        </button>
      </div>

      <div className="app-toolbar__status">
        <span className="app-toolbar__status-chip">{activeScene.category}</span>
        <span className="app-toolbar__status-copy">{activeScene.subtitle}</span>
      </div>
    </section>
  );
}
