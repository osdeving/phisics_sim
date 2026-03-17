import { useMemo, useState } from "react";
import { SceneDefinition } from "../physics/scenes/types";
import { WorkspaceTabId } from "./WorkspaceTabs";

type MenuId = "file" | "view" | "categories" | "scene" | "base" | "help";

interface AppNavbarProps {
  scenes: SceneDefinition[];
  activeScene: SceneDefinition;
  activeTab: WorkspaceTabId;
  leftDockCollapsed: boolean;
  rightDockCollapsed: boolean;
  onChangeScene: (sceneId: string) => void;
  onChangeTab: (tabId: WorkspaceTabId) => void;
  onToggleLeftDock: () => void;
  onToggleRightDock: () => void;
}

const workspaceTabLabels: Record<WorkspaceTabId, string> = {
  scene: "Cena",
  tutorial: "Tutorial",
  exercise: "Exercícios",
};

export function AppNavbar({
  scenes,
  activeScene,
  activeTab,
  leftDockCollapsed,
  rightDockCollapsed,
  onChangeScene,
  onChangeTab,
  onToggleLeftDock,
  onToggleRightDock,
}: AppNavbarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);

  const groupedScenes = useMemo(() => {
    const groups = new Map<string, SceneDefinition[]>();

    scenes.forEach((scene) => {
      const bucket = groups.get(scene.category);
      if (bucket) {
        bucket.push(scene);
        return;
      }

      groups.set(scene.category, [scene]);
    });

    return Array.from(groups.entries()).map(([category, bucket]) => ({
      category,
      scenes: bucket,
    }));
  }, [scenes]);

  const activeCategoryScenes = groupedScenes.find(
    (group) => group.category === activeScene.category,
  )?.scenes ?? [activeScene];

  const foundationScenes = scenes.filter(
    (scene) => scene.category === "Matematica base",
  );

  const closeMenu = () => setOpenMenu(null);
  const toggleMenu = (menuId: MenuId) => {
    setOpenMenu((current) => (current === menuId ? null : menuId));
  };

  return (
    <header className="app-navbar card">
      <button type="button" className="app-navbar__logo" onClick={closeMenu}>
        <span>PS</span>
      </button>

      <nav
        className="app-navbar__menu"
        aria-label="Menu principal"
        onMouseLeave={closeMenu}
      >
        <div
          className={`app-navbar__menu-item ${openMenu === "file" ? "is-open" : ""}`}
          onMouseEnter={() => setOpenMenu("file")}
        >
          <button
            type="button"
            className="app-navbar__menu-button"
            onClick={() => toggleMenu("file")}
          >
            Arquivo
          </button>
          <div className="app-navbar__dropdown" role="menu">
            <button
              type="button"
              className="app-navbar__scene-link"
              onClick={() => {
                onChangeScene(scenes[0].id);
                closeMenu();
              }}
            >
              <span className="app-navbar__scene-copy">
                <span className="app-navbar__scene-title">Primeira cena</span>
                <span className="app-navbar__scene-subtitle">
                  Volta para o início da biblioteca.
                </span>
              </span>
            </button>

            <button
              type="button"
              className="app-navbar__scene-link"
              onClick={() => {
                onChangeScene(scenes[scenes.length - 1].id);
                closeMenu();
              }}
            >
              <span className="app-navbar__scene-copy">
                <span className="app-navbar__scene-title">Última cena</span>
                <span className="app-navbar__scene-subtitle">
                  Salta direto para o fim da sequência.
                </span>
              </span>
            </button>
          </div>
        </div>

        <div
          className={`app-navbar__menu-item ${openMenu === "view" ? "is-open" : ""}`}
          onMouseEnter={() => setOpenMenu("view")}
        >
          <button
            type="button"
            className="app-navbar__menu-button"
            onClick={() => toggleMenu("view")}
          >
            Exibir
          </button>
          <div className="app-navbar__dropdown" role="menu">
            {(Object.keys(workspaceTabLabels) as WorkspaceTabId[]).map((tabId) => (
              <button
                key={tabId}
                type="button"
                className={`app-navbar__scene-link ${activeTab === tabId ? "is-active" : ""}`}
                onClick={() => {
                  onChangeTab(tabId);
                  closeMenu();
                }}
              >
                <span className="app-navbar__scene-copy">
                  <span className="app-navbar__scene-title">
                    {workspaceTabLabels[tabId]}
                  </span>
                  <span className="app-navbar__scene-subtitle">
                    Alterna a área central para esta visualização.
                  </span>
                </span>
              </button>
            ))}

            <button
              type="button"
              className="app-navbar__scene-link"
              onClick={() => {
                onToggleLeftDock();
                closeMenu();
              }}
            >
              <span className="app-navbar__scene-copy">
                <span className="app-navbar__scene-title">
                  {leftDockCollapsed ? "Mostrar biblioteca" : "Ocultar biblioteca"}
                </span>
                <span className="app-navbar__scene-subtitle">
                  Controla o painel esquerdo.
                </span>
              </span>
            </button>

            <button
              type="button"
              className="app-navbar__scene-link"
              onClick={() => {
                onToggleRightDock();
                closeMenu();
              }}
            >
              <span className="app-navbar__scene-copy">
                <span className="app-navbar__scene-title">
                  {rightDockCollapsed ? "Mostrar inspector" : "Ocultar inspector"}
                </span>
                <span className="app-navbar__scene-subtitle">
                  Controla o painel direito.
                </span>
              </span>
            </button>
          </div>
        </div>

        <div
          className={`app-navbar__menu-item ${openMenu === "categories" ? "is-open" : ""}`}
          onMouseEnter={() => setOpenMenu("categories")}
        >
          <button
            type="button"
            className="app-navbar__menu-button"
            onClick={() => toggleMenu("categories")}
          >
            Categorias
          </button>
          <div className="app-navbar__dropdown" role="menu">
            {groupedScenes.map((group) => (
              <button
                key={group.category}
                type="button"
                className={`app-navbar__scene-link ${group.category === activeScene.category ? "is-active" : ""}`}
                onClick={() => {
                  onChangeScene(group.scenes[0].id);
                  closeMenu();
                }}
              >
                <span className="app-navbar__scene-copy">
                  <span className="app-navbar__scene-title">{group.category}</span>
                  <span className="app-navbar__scene-subtitle">
                    {group.scenes.length} cena{group.scenes.length === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`app-navbar__menu-item ${openMenu === "scene" ? "is-open" : ""}`}
          onMouseEnter={() => setOpenMenu("scene")}
        >
          <button
            type="button"
            className="app-navbar__menu-button"
            onClick={() => toggleMenu("scene")}
          >
            Cena
          </button>
          <div className="app-navbar__dropdown" role="menu">
            {activeCategoryScenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                className={`app-navbar__scene-link ${scene.id === activeScene.id ? "is-active" : ""}`}
                onClick={() => {
                  onChangeScene(scene.id);
                  closeMenu();
                }}
              >
                <span
                  className="app-navbar__scene-dot"
                  style={{ ["--scene-accent" as string]: scene.accent }}
                />
                <span className="app-navbar__scene-copy">
                  <span className="app-navbar__scene-title">{scene.title}</span>
                  <span className="app-navbar__scene-subtitle">
                    {scene.subtitle}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`app-navbar__menu-item ${openMenu === "base" ? "is-open" : ""}`}
          onMouseEnter={() => setOpenMenu("base")}
        >
          <button
            type="button"
            className="app-navbar__menu-button"
            onClick={() => toggleMenu("base")}
          >
            Base
          </button>
          <div className="app-navbar__dropdown" role="menu">
            {foundationScenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                className={`app-navbar__scene-link ${scene.id === activeScene.id ? "is-active" : ""}`}
                onClick={() => {
                  onChangeScene(scene.id);
                  closeMenu();
                }}
              >
                <span className="app-navbar__scene-copy">
                  <span className="app-navbar__scene-title">{scene.title}</span>
                  <span className="app-navbar__scene-subtitle">{scene.subtitle}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`app-navbar__menu-item ${openMenu === "help" ? "is-open" : ""}`}
          onMouseEnter={() => setOpenMenu("help")}
        >
          <button
            type="button"
            className="app-navbar__menu-button"
            onClick={() => toggleMenu("help")}
          >
            Ajuda
          </button>
          <div className="app-navbar__dropdown" role="menu">
            {activeScene.keyboardHints.map((hint) => (
              <button
                key={hint}
                type="button"
                className="app-navbar__scene-link"
                onClick={closeMenu}
              >
                <span className="app-navbar__scene-copy">
                  <span className="app-navbar__scene-title">{hint}</span>
                  <span className="app-navbar__scene-subtitle">
                    Atalho mental da cena ativa.
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="app-navbar__status">
        <span className="app-navbar__status-label">Workspace ativo</span>
        <strong>{activeScene.title}</strong>
        <p>{workspaceTabLabels[activeTab]}</p>
      </div>
    </header>
  );
}
