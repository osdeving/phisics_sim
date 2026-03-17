import { useMemo, useState } from "react";
import { SceneDefinition } from "../physics/scenes/types";

interface AppNavbarProps {
  scenes: SceneDefinition[];
  activeScene: SceneDefinition;
  onChangeScene: (sceneId: string) => void;
}

export function AppNavbar({
  scenes,
  activeScene,
  onChangeScene,
}: AppNavbarProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const groupedScenes = useMemo(() => {
    const categoryMap = new Map<string, SceneDefinition[]>();

    scenes.forEach((scene) => {
      const bucket = categoryMap.get(scene.category);
      if (bucket) {
        bucket.push(scene);
        return;
      }

      categoryMap.set(scene.category, [scene]);
    });

    return Array.from(categoryMap.entries()).map(([category, categoryScenes]) => ({
      category,
      scenes: categoryScenes,
    }));
  }, [scenes]);

  return (
    <header className="app-navbar card">
      <div className="app-navbar__brand">
        <p className="eyebrow">Workspace</p>
        <h1>Physics Sim</h1>
        <p className="app-navbar__copy">
          Cena, tutorial e exercicios ficam no mesmo container de abas.
        </p>
      </div>

      <nav
        className="app-navbar__menu"
        aria-label="Categorias de cenas"
        onMouseLeave={() => setOpenCategory(null)}
      >
        {groupedScenes.map(({ category, scenes: categoryScenes }) => {
          const isActive = activeScene.category === category;
          const isOpen = openCategory === category;

          return (
            <div
              key={category}
              className={`app-navbar__menu-item ${isActive ? "is-active" : ""} ${isOpen ? "is-open" : ""}`}
              onMouseEnter={() => setOpenCategory(category)}
            >
              <button
                type="button"
                className="app-navbar__menu-button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenCategory((current) =>
                    current === category ? null : category,
                  )
                }
              >
                <span>{category}</span>
                <small>{categoryScenes.length}</small>
                <span className="app-navbar__caret">▾</span>
              </button>

              <div className="app-navbar__dropdown" role="menu">
                {categoryScenes.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    role="menuitem"
                    className={`app-navbar__scene-link ${scene.id === activeScene.id ? "is-active" : ""}`}
                    onClick={() => {
                      onChangeScene(scene.id);
                      setOpenCategory(null);
                    }}
                  >
                    <span
                      className="app-navbar__scene-dot"
                      style={{ ["--scene-accent" as string]: scene.accent }}
                    />
                    <span className="app-navbar__scene-copy">
                      <span className="app-navbar__scene-title">{scene.title}</span>
                      <span className="app-navbar__scene-subtitle">{scene.subtitle}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="app-navbar__status">
        <span className="app-navbar__status-label">Cena ativa</span>
        <strong>{activeScene.title}</strong>
        <p>{activeScene.subtitle}</p>
      </div>
    </header>
  );
}
