import { hasMicroTour, type TourSnapshot } from './tourSteps';

export type MissionId =
  | 'create-project'
  | 'first-class'
  | 'add-attributes'
  | 'second-class'
  | 'first-relationship'
  | 'ask-ai'
  | 'generate-code'
  | 'save-version'
  | 'invite-team';

export interface MissionDef {
  id: MissionId;
  title: string;
  /** One line explaining why the mission matters. */
  why: string;
  /** Message of the toast shown when the mission completes. */
  doneToast: string;
  /** Pure detection from the app snapshot: missions are never forced, only observed. */
  detect: (snap: TourSnapshot) => boolean;
}

/** Ordered as a natural learning path; the first pending one is the "next" mission. */
export const MISSIONS: readonly MissionDef[] = [
  {
    id: 'create-project',
    title: 'Creá tu proyecto',
    why: 'Un proyecto guarda tu diagrama UML.',
    doneToast: '¡Listo! Creaste tu proyecto',
    detect: (s) => s.hasDocument,
  },
  {
    id: 'first-class',
    title: 'Creá tu primera clase',
    why: 'Cada clase es una tabla de tu base de datos.',
    doneToast: '¡Listo! Creaste tu primera clase',
    detect: (s) => s.classCount >= 1,
  },
  {
    id: 'add-attributes',
    title: 'Sumá atributos',
    why: 'Los atributos son las columnas de cada tabla.',
    doneToast: '¡Muy bien! Tu clase ya tiene atributos',
    detect: (s) => s.hasNonPkAttribute,
  },
  {
    id: 'second-class',
    title: 'Creá una segunda clase',
    why: 'Con dos clases ya podés mostrar cómo se vinculan.',
    doneToast: '¡Genial! Ya tenés dos clases',
    detect: (s) => s.classCount >= 2,
  },
  {
    id: 'first-relationship',
    title: 'Relacioná dos clases',
    why: 'Las relaciones se convierten en claves foráneas.',
    doneToast: '¡Excelente! Relacionaste dos clases',
    detect: (s) => s.relationshipCount >= 1,
  },
  {
    id: 'ask-ai',
    title: 'Preguntale a la IA',
    why: 'Tu colega Senior AI te ayuda a modelar más rápido.',
    doneToast: '¡Bien! Ya charlaste con la IA',
    detect: (s) => s.hasChatActivity,
  },
  {
    id: 'generate-code',
    title: 'Generá código',
    why: 'Del diagrama salen el script SQL, el backend y la app.',
    doneToast: '¡Listo! Ya viste cómo se genera el código',
    detect: (s) => s.isSqlModalOpen || s.isGenerating || s.isGeneratingMobile,
  },
  {
    id: 'save-version',
    title: 'Guardá una versión',
    why: 'Así podés volver atrás si algo sale mal.',
    doneToast: '¡Perfecto! Ya conocés el historial de versiones',
    detect: (s) => s.versionCount > 0 || s.isVersionPanelOpen,
  },
  {
    id: 'invite-team',
    title: 'Invitá a tu equipo',
    why: 'Editan el mismo diagrama juntos, en tiempo real.',
    doneToast: '¡Genial! Ya podés trabajar en equipo',
    detect: (s) => s.isInviteModalOpen || s.collaboratorCount > 1,
  },
];

export const getMission = (id: string): MissionDef | undefined => MISSIONS.find((m) => m.id === id);

/** Missions that have a micro-tour ("Mostrame cómo"). */
export const missionHasTour = (id: string): boolean => hasMicroTour(id);

/** Ids of the missions the snapshot proves done, regardless of what was stored. */
export const detectDoneMissions = (snap: TourSnapshot): MissionId[] =>
  MISSIONS.filter((m) => m.detect(snap)).map((m) => m.id);

export const nextPendingMission = (completed: Record<string, number>): MissionDef | undefined =>
  MISSIONS.find((m) => !(m.id in completed));

export interface MissionEvaluation {
  /** Missions detected for the first time (to persist). */
  newlyDone: MissionId[];
  /** Subset worth celebrating with a toast. */
  announce: MissionId[];
}

/**
 * Compares the stored progress with the current snapshot. Missions are completed silently when
 * the snapshot comes from loading existing work (first evaluation or another project), and
 * announced only when the user just did them in the project they were already working on.
 */
export const evaluateMissions = (
  prev: TourSnapshot | null,
  snap: TourSnapshot,
  completed: Record<string, number>,
): MissionEvaluation => {
  const newlyDone = detectDoneMissions(snap).filter((id) => !(id in completed));
  const sameProject =
    !!prev &&
    (prev.documentId === snap.documentId || (prev.documentId === null && snap.classCount === 0));
  return { newlyDone, announce: sameProject ? newlyDone : [] };
};

/** Toast text for a completed mission plus a pointer to the next pending one. */
export const buildMissionNotice = (
  missionId: string,
  completed: Record<string, number>,
): { message: string; nextMissionId: string | null } => ({
  message: getMission(missionId)?.doneToast ?? '¡Listo!',
  nextMissionId: nextPendingMission({ ...completed, [missionId]: 0 })?.id ?? null,
});
