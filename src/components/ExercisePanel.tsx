import { ScenePanelData } from '../physics/scenes/types';

interface ExercisePanelProps {
  panel: ScenePanelData;
}

export function ExercisePanel({ panel }: ExercisePanelProps) {
  return (
    <div className="exercise-grid">
      {panel.exercises.map((exercise) => (
        <article key={exercise.title} className="exercise-card">
          <p className="eyebrow">Exercício clássico</p>
          <h3>{exercise.title}</h3>
          <p className="exercise-card__prompt">{exercise.prompt}</p>
          <div className="exercise-card__answer">
            <strong>Resposta</strong>
            <p>{exercise.answer}</p>
          </div>
          {exercise.steps && (
            <ul>
              {exercise.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
