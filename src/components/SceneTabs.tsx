import { useEffect, useMemo, useState } from "react";
import { SceneDefinition } from "../physics/scenes/types";

interface SceneTabsProps {
  scenes: SceneDefinition[];
  activeSceneId: string;
  onChange: (sceneId: string) => void;
}

export function SceneTabs({ scenes, activeSceneId, onChange }: SceneTabsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const groupedScenes = useMemo(() => {
    const groups: Array<{ category: string; scenes: SceneDefinition[] }> = [];
    const seen = new Map<string, { category: string; scenes: SceneDefinition[] }>();

    scenes.forEach((scene) => {
      const existing = seen.get(scene.category);
      if (existing) {
        existing.scenes.push(scene);
        return;
      }

      const group = {
        category: scene.category,
        scenes: [scene],
      };
      seen.set(scene.category, group);
      groups.push(group);
    });

    return groups;
  }, [scenes]);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeSceneId]);

  return (
    <div className="scene-menu">
      <button
        type="button"
        className="scene-menu__mobile-trigger"
        onClick={() => setMobileOpen(true)}
      >
        cenas
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="scene-menu__backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`scene-menu__panel ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
      >
        <header className="scene-menu__header">
          {!collapsed && <h2>Cenas</h2>}
          <div className="scene-menu__header-actions">
            <button
              type="button"
              className="scene-menu__icon-button"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? ">>" : "<<"}
            </button>
            <button
              type="button"
              className="scene-menu__icon-button scene-menu__close"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
            >
              x
            </button>
          </div>
        </header>

        <div className="scene-menu__list">
          {groupedScenes.map((group) => (
            <section key={group.category} className="scene-menu__group">
              {!collapsed && (
                <p className="scene-menu__group-title">{group.category}</p>
              )}

              <div className="scene-menu__group-list">
                {group.scenes.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    className={`scene-tab ${scene.id === activeSceneId ? "is-active" : ""}`}
                    onClick={() => onChange(scene.id)}
                    style={{ ["--scene-accent" as string]: scene.accent }}
                    title={scene.title}
                  >
                    <span className="scene-tab__title">{scene.title}</span>
                    {!collapsed && (
                      <span className="scene-tab__subtitle">{scene.subtitle}</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
