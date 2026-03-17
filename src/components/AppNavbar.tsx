import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SceneDefinition } from "../physics/scenes/types";
import { WorkspaceTabId } from "./WorkspaceTabs";

type MenuId =
  | "file"
  | "edit"
  | "view"
  | "window"
  | "journey"
  | "insert"
  | "settings"
  | "help";

type MenuEntry =
  | {
      type: "item";
      key: string;
      label: string;
      meta?: string;
      active?: boolean;
      onSelect: () => void;
    }
  | {
      type: "divider";
      key: string;
    };

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

const menuLabels: Record<MenuId, string> = {
  file: "File",
  edit: "Edit",
  view: "View",
  window: "Window",
  journey: "Journey",
  insert: "Insert",
  settings: "Settings",
  help: "Help",
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

const MENU_WIDTH = 248;
const MENU_GAP = 6;
const VIEWPORT_PADDING = 12;

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
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const buttonRefs = useRef<Record<MenuId, HTMLButtonElement | null>>({
    file: null,
    edit: null,
    view: null,
    window: null,
    journey: null,
    insert: null,
    settings: null,
    help: null,
  });
  const closeTimerRef = useRef<number | null>(null);

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

  const activeSceneIndex = scenes.findIndex((scene) => scene.id === activeScene.id);
  const previousScene = scenes[(activeSceneIndex - 1 + scenes.length) % scenes.length];
  const nextScene = scenes[(activeSceneIndex + 1) % scenes.length];
  const activeCategoryScenes =
    groupedScenes.find((group) => group.category === activeScene.category)?.scenes ??
    [activeScene];
  const foundationScenes = scenes.filter(
    (scene) => scene.category === "Matematica base",
  );

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const closeMenu = () => {
    clearCloseTimer();
    setOpenMenu(null);
    setMenuPosition(null);
  };

  const scheduleCloseMenu = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenMenu(null);
      setMenuPosition(null);
    }, 90);
  };

  const computeMenuPosition = (menuId: MenuId) => {
    const button = buttonRefs.current[menuId];
    if (!button) {
      return null;
    }

    const rect = button.getBoundingClientRect();
    const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING;
    const left = Math.max(VIEWPORT_PADDING, Math.min(rect.left, maxLeft));

    return {
      top: rect.bottom + MENU_GAP,
      left,
      width: MENU_WIDTH,
    };
  };

  const openMenuAt = (menuId: MenuId) => {
    clearCloseTimer();
    setOpenMenu(menuId);
    setMenuPosition(computeMenuPosition(menuId));
  };

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const updatePosition = () => {
      setMenuPosition(computeMenuPosition(openMenu));
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openMenu]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  const menus = useMemo<Record<MenuId, MenuEntry[]>>(
    () => ({
      file: [
        {
          type: "item",
          key: "first-scene",
          label: "Open First Scene",
          meta: "Home",
          onSelect: () => onChangeScene(scenes[0].id),
        },
        {
          type: "item",
          key: "last-scene",
          label: "Open Last Scene",
          meta: "End",
          onSelect: () => onChangeScene(scenes[scenes.length - 1].id),
        },
        { type: "divider", key: "file-divider" },
        {
          type: "item",
          key: "active-category",
          label: `Open ${activeScene.category}`,
          meta: `${activeCategoryScenes.length}`,
          onSelect: () => onChangeScene(activeCategoryScenes[0].id),
        },
      ],
      edit: [
        {
          type: "item",
          key: "previous-scene",
          label: "Previous Scene",
          meta: "[",
          onSelect: () => onChangeScene(previousScene.id),
        },
        {
          type: "item",
          key: "next-scene",
          label: "Next Scene",
          meta: "]",
          onSelect: () => onChangeScene(nextScene.id),
        },
        { type: "divider", key: "edit-divider" },
        {
          type: "item",
          key: "scene-tab",
          label: "Show Scene Tab",
          meta: "1",
          active: activeTab === "scene",
          onSelect: () => onChangeTab("scene"),
        },
        {
          type: "item",
          key: "tutorial-tab",
          label: "Show Tutorial Tab",
          meta: "2",
          active: activeTab === "tutorial",
          onSelect: () => onChangeTab("tutorial"),
        },
        {
          type: "item",
          key: "exercise-tab",
          label: "Show Exercises Tab",
          meta: "3",
          active: activeTab === "exercise",
          onSelect: () => onChangeTab("exercise"),
        },
      ],
      view: [
        {
          type: "item",
          key: "toggle-library",
          label: leftDockCollapsed ? "Show Library" : "Hide Library",
          meta: "L",
          onSelect: onToggleLeftDock,
        },
        {
          type: "item",
          key: "toggle-inspector",
          label: rightDockCollapsed ? "Show Inspector" : "Hide Inspector",
          meta: "I",
          onSelect: onToggleRightDock,
        },
        { type: "divider", key: "view-divider" },
        {
          type: "item",
          key: "focus-scene",
          label: "Focus Current Scene",
          meta: activeScene.title,
          onSelect: () => onChangeScene(activeScene.id),
        },
      ],
      window: groupedScenes.map((group) => ({
        type: "item" as const,
        key: group.category,
        label: group.category,
        meta: `${group.scenes.length}`,
        active: group.category === activeScene.category,
        onSelect: () => onChangeScene(group.scenes[0].id),
      })),
      journey: activeCategoryScenes.map((scene) => ({
        type: "item" as const,
        key: scene.id,
        label: scene.title,
        meta: scene.id === activeScene.id ? "Live" : undefined,
        active: scene.id === activeScene.id,
        onSelect: () => onChangeScene(scene.id),
      })),
      insert: foundationScenes.map((scene) => ({
        type: "item" as const,
        key: scene.id,
        label: scene.title,
        meta: scene.navGlyph,
        active: scene.id === activeScene.id,
        onSelect: () => onChangeScene(scene.id),
      })),
      settings: [
        {
          type: "item",
          key: "library-state",
          label: leftDockCollapsed ? "Library Collapsed" : "Library Expanded",
          meta: "Dock",
          onSelect: onToggleLeftDock,
        },
        {
          type: "item",
          key: "inspector-state",
          label: rightDockCollapsed ? "Inspector Collapsed" : "Inspector Expanded",
          meta: "Dock",
          onSelect: onToggleRightDock,
        },
        { type: "divider", key: "settings-divider" },
        {
          type: "item",
          key: "current-tab",
          label: `Current Tab: ${activeTab}`,
          meta: "State",
          active: true,
          onSelect: () => onChangeTab(activeTab),
        },
      ],
      help: activeScene.keyboardHints.map((hint, index) => ({
        type: "item" as const,
        key: `${activeScene.id}-hint-${index}`,
        label: hint,
        meta: "Hint",
        onSelect: () => undefined,
      })),
    }),
    [
      activeCategoryScenes,
      activeScene.category,
      activeScene.id,
      activeScene.keyboardHints,
      activeScene.title,
      activeTab,
      foundationScenes,
      groupedScenes,
      leftDockCollapsed,
      nextScene.id,
      onChangeScene,
      onChangeTab,
      onToggleLeftDock,
      onToggleRightDock,
      previousScene.id,
      rightDockCollapsed,
      scenes,
    ],
  );

  const renderedOverlay =
    openMenu && menuPosition
      ? createPortal(
          <div
            className="app-navbar__menu-overlay"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleCloseMenu}
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
            }}
          >
            <div className="app-navbar__dropdown" role="menu">
              {menus[openMenu].map((entry) => {
                if (entry.type === "divider") {
                  return (
                    <div
                      key={entry.key}
                      className="app-navbar__dropdown-divider"
                    />
                  );
                }

                return (
                  <button
                    key={entry.key}
                    type="button"
                    role="menuitem"
                    className={`app-navbar__dropdown-item ${entry.active ? "is-active" : ""}`}
                    onClick={() => {
                      entry.onSelect();
                      closeMenu();
                    }}
                  >
                    <span className="app-navbar__dropdown-label">
                      {entry.label}
                    </span>
                    {entry.meta ? (
                      <span className="app-navbar__dropdown-meta">
                        {entry.meta}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <header className="app-navbar card">
        <button type="button" className="app-navbar__logo" onClick={closeMenu}>
          <span>PS</span>
        </button>

        <div className="app-navbar__menu-rail">
          <nav className="app-navbar__menu" aria-label="Application menu">
            {(Object.keys(menuLabels) as MenuId[]).map((menuId) => (
              <div
                key={menuId}
                className={`app-navbar__menu-item ${openMenu === menuId ? "is-open" : ""}`}
                onMouseEnter={() => openMenuAt(menuId)}
                onMouseLeave={scheduleCloseMenu}
              >
                <button
                  ref={(node) => {
                    buttonRefs.current[menuId] = node;
                  }}
                  type="button"
                  className="app-navbar__menu-button"
                  aria-haspopup="menu"
                  aria-expanded={openMenu === menuId}
                  onClick={() => openMenuAt(menuId)}
                >
                  {menuLabels[menuId]}
                </button>
              </div>
            ))}
          </nav>
        </div>

        <div className="app-navbar__status">
          <span className="app-navbar__status-title">{activeScene.title}</span>
          <span className="app-navbar__status-subtitle">
            {scenes.length} items
          </span>
          <span className="app-navbar__status-dot" />
        </div>
      </header>

      {renderedOverlay}
    </>
  );
}
