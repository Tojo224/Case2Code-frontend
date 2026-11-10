import { useAuthStore } from '../store/useAuthStore';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useVersionStore } from '../store/useVersionStore';
import type { RelationshipType } from '../types/uml';

/** Minimal, plain view of the app state that missions, hints and micro-tours reason about. */
export interface TourSnapshot {
  documentId: string | null;
  hasDocument: boolean;
  classCount: number;
  relationshipCount: number;
  attributeCount: number;
  /** At least one class owns an attribute that is not a primary key. */
  hasNonPkAttribute: boolean;
  /** At least one class has nothing but its primary key attribute(s). */
  hasPkOnlyClass: boolean;
  /** Any of the user's projects already contains classes (experienced user). */
  hasProjectContent: boolean;
  isCreateClassModalOpen: boolean;
  hasEditingRelationship: boolean;
  activeRelationType: RelationshipType | null;
  isSqlModalOpen: boolean;
  isGenerating: boolean;
  isGeneratingMobile: boolean;
  isAssistantOpen: boolean;
  /** The current user wrote in the chat or the AI answered. */
  hasChatActivity: boolean;
  /** The AI proposed changes that are waiting for "Aplicar al Diagrama". */
  hologramPending: boolean;
  versionCount: number;
  isVersionPanelOpen: boolean;
  isInviteModalOpen: boolean;
  collaboratorCount: number;
  isAuthModalOpen: boolean;
}

export const EMPTY_SNAPSHOT: TourSnapshot = {
  documentId: null,
  hasDocument: false,
  classCount: 0,
  relationshipCount: 0,
  attributeCount: 0,
  hasNonPkAttribute: false,
  hasPkOnlyClass: false,
  hasProjectContent: false,
  isCreateClassModalOpen: false,
  hasEditingRelationship: false,
  activeRelationType: null,
  isSqlModalOpen: false,
  isGenerating: false,
  isGeneratingMobile: false,
  isAssistantOpen: false,
  hasChatActivity: false,
  hologramPending: false,
  versionCount: 0,
  isVersionPanelOpen: false,
  isInviteModalOpen: false,
  collaboratorCount: 0,
  isAuthModalOpen: false,
};

export const takeSnapshot = (): TourSnapshot => {
  const s = useDiagramStore.getState();
  const collab = useCollaborationStore.getState();
  const versions = useVersionStore.getState();
  const userId = useAuthStore.getState().currentUser?.id;
  const classes = s.currentDocument?.classes ?? [];
  const nonPkCount = (c: (typeof classes)[number]) => c.attributes.filter((a) => !a.primary_key).length;

  return {
    documentId: s.currentDocument?.id ?? null,
    hasDocument: !!s.currentDocument,
    classCount: classes.length,
    relationshipCount: s.currentDocument?.relationships.length ?? 0,
    attributeCount: classes.reduce((sum, c) => sum + c.attributes.length, 0),
    hasNonPkAttribute: classes.some((c) => nonPkCount(c) > 0),
    hasPkOnlyClass: classes.some((c) => nonPkCount(c) === 0),
    hasProjectContent: classes.length > 0 || s.diagramsList.some((d) => (d.classes?.length ?? 0) > 0),
    isCreateClassModalOpen: s.isCreateClassModalOpen,
    hasEditingRelationship: !!s.editingRelationship,
    activeRelationType: s.activeRelationType,
    isSqlModalOpen: s.isSqlModalOpen,
    isGenerating: s.isGenerating,
    isGeneratingMobile: s.isGeneratingMobile,
    isAssistantOpen: s.isAssistantOpen,
    hasChatActivity: collab.chatMessages.some(
      (m) => m.sender_type === 'AI' || (!!userId && m.sender_id === userId),
    ),
    hologramPending: !!s.hologramCommands,
    versionCount: versions.versions.length,
    isVersionPanelOpen: versions.isPanelOpen,
    isInviteModalOpen: collab.isInviteModalOpen,
    collaboratorCount: collab.collaborators.length,
    isAuthModalOpen: collab.isAuthModalOpen,
  };
};

/**
 * References of every store field takeSnapshot() reads. The stores emit on every cursor move,
 * node drag or typing indicator; comparing these references first lets callers skip the
 * snapshot (which walks every class) when nothing it depends on has changed.
 */
export const snapshotInputs = (): readonly unknown[] => {
  const s = useDiagramStore.getState();
  const collab = useCollaborationStore.getState();
  const versions = useVersionStore.getState();
  return [
    s.isLoading,
    s.currentDocument,
    s.diagramsList,
    s.isCreateClassModalOpen,
    s.editingRelationship,
    s.activeRelationType,
    s.isSqlModalOpen,
    s.isGenerating,
    s.isGeneratingMobile,
    s.isAssistantOpen,
    s.hologramCommands,
    collab.chatMessages,
    collab.isInviteModalOpen,
    collab.collaborators,
    collab.isAuthModalOpen,
    versions.versions,
    versions.isPanelOpen,
    useAuthStore.getState().currentUser?.id,
  ];
};

export const sameInputs = (a: readonly unknown[] | null, b: readonly unknown[]): boolean =>
  !!a && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

/** True while any modal-like surface is in front of the canvas. */
export const hasOpenModal = (snap: TourSnapshot): boolean =>
  snap.isCreateClassModalOpen ||
  snap.hasEditingRelationship ||
  snap.isSqlModalOpen ||
  snap.isInviteModalOpen ||
  snap.isAuthModalOpen ||
  snap.isVersionPanelOpen;

export const tourSelector = (name: string) => `[data-tour="${name}"]`;

export interface TourStepDef {
  id: string;
  /** Value of the `data-tour` attribute to highlight. Omit for a centered popover. */
  target?: string;
  title: string;
  /** HTML allowed (static copy only). */
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** Let the user click the highlighted element (task steps). Informational steps block clicks. */
  interactive?: boolean;
  /** Clicking the highlighted element also moves the tour forward. */
  advanceOnClick?: boolean;
  /** Wait for the target to appear when moving forward (e.g. a modal opening). */
  wait?: boolean;
  /** Skip the step when the target does not exist. */
  optional?: boolean;
  /** Re-focus the target once highlighted (keeps modal inputs usable). */
  focusTarget?: boolean;
  /** True once the user already performed the step's task; the tour then auto-advances. */
  done?: (snap: TourSnapshot, baseline: TourSnapshot) => boolean;
  /** Runs when the step is shown. */
  onEnter?: () => void;
  /** Runs when the user presses Next without having done the task, so the next step still works. */
  onSkipTask?: () => void;
  /** Runs when the user goes back from this step. */
  onBack?: () => void;
}

const diagram = () => useDiagramStore.getState();

const classCreated = (snap: TourSnapshot, base: TourSnapshot) =>
  snap.classCount > base.classCount && !snap.isCreateClassModalOpen;

const closeClassModal = () => {
  if (diagram().isCreateClassModalOpen) diagram().closeCreateClassModal();
};

const closeRelationModal = () => {
  if (diagram().editingRelationship) diagram().setEditingRelationship(null);
};

const STEP_LIST: TourStepDef[] = [
  {
    id: 'create-project',
    target: 'empty-create-project',
    title: 'Creá tu primer proyecto',
    description:
      'Un proyecto guarda tu diagrama UML. Hacé clic en <strong>+ Crear mi primer proyecto</strong> para empezar.',
    side: 'top',
    align: 'center',
    interactive: true,
    optional: true,
    done: (snap) => snap.hasDocument,
    onSkipTask: () => {
      void diagram().createDiagram('Mi Primer Diagrama', 'Proyecto personal');
    },
  },
  {
    id: 'add-class',
    target: 'navbar-add-class',
    title: 'Agregá una clase',
    description:
      'Cada clase es una entidad de tu modelo y se convierte en una tabla. ' +
      'Hacé clic en <strong>Clase</strong> en la barra superior para abrir el formulario.',
    side: 'bottom',
    align: 'center',
    interactive: true,
    advanceOnClick: true,
    wait: true,
    done: (snap) => snap.isCreateClassModalOpen,
    onSkipTask: () => diagram().openCreateClassModal(),
  },
  {
    id: 'class-name',
    target: 'create-class-name',
    title: 'Poné un nombre',
    description:
      'Escribí el nombre de la clase, por ejemplo <strong>Cliente</strong>. ' +
      'El estereotipo <em>entity</em> ya viene elegido: indica que es una tabla de la base de datos.',
    side: 'right',
    align: 'center',
    interactive: true,
    wait: true,
    optional: true,
    focusTarget: true,
    done: (snap) => !snap.isCreateClassModalOpen,
    onBack: closeClassModal,
  },
  {
    id: 'class-attributes',
    target: 'create-class-attributes',
    title: 'Definí los atributos',
    description:
      'Cada fila es una columna de la tabla. Ya viene un <strong>id</strong> como clave primaria. ' +
      'Con <strong>+ Atributo</strong> sumás más, eligiendo nombre y tipo (por ejemplo <em>nombre: String</em>).',
    side: 'right',
    align: 'center',
    interactive: true,
    wait: true,
    optional: true,
    done: (snap) => !snap.isCreateClassModalOpen,
  },
  {
    id: 'class-submit',
    target: 'create-class-submit',
    title: 'Creá la clase',
    description:
      'Presioná <strong>Crear Clase</strong> (o <kbd>Ctrl</kbd> + <kbd>Enter</kbd>) para agregarla al diagrama.',
    side: 'top',
    align: 'center',
    interactive: true,
    wait: true,
    optional: true,
    done: classCreated,
    onSkipTask: closeClassModal,
  },
  {
    id: 'add-attributes',
    target: 'class-node',
    title: 'Sumá un atributo',
    description:
      'Los atributos son las columnas de la tabla. Al pie de la clase hacé clic en <strong>+ Agregar atributo</strong>, ' +
      'poné un nombre (por ejemplo <em>nombre</em>) y un tipo.',
    side: 'right',
    align: 'center',
    interactive: true,
    optional: true,
    done: (snap) => snap.hasNonPkAttribute,
  },
  {
    id: 'second-class',
    target: 'canvas',
    title: 'Sumá otra clase',
    description:
      'Para relacionar clases necesitás al menos dos. Hacé <strong>doble clic en un espacio vacío</strong> ' +
      'del lienzo, lejos de la primera clase, para abrir el formulario (por ejemplo <strong>Pedido</strong>).',
    side: 'top',
    align: 'center',
    interactive: true,
    done: (snap) => snap.isCreateClassModalOpen,
    onSkipTask: () => diagram().openCreateClassModal(),
  },
  {
    id: 'relation-tool',
    target: 'sidebar-tool-ONE_TO_MANY',
    title: 'Elegí un tipo de relación',
    description:
      'En este panel están todas las relaciones. <strong>1 : N</strong> significa que un registro de la primera ' +
      'clase se vincula con muchos de la segunda (un cliente, muchos pedidos). Hacé clic para activar el modo conexión.',
    side: 'right',
    align: 'center',
    interactive: true,
    advanceOnClick: true,
    wait: true,
    done: (snap) => snap.activeRelationType !== null,
    onEnter: () => diagram().setSidebarCollapsed(false),
    onSkipTask: () => diagram().setActiveRelationType('ONE_TO_MANY'),
    onBack: () => diagram().setActiveRelationType(null),
  },
  {
    id: 'relation-drag',
    target: 'canvas',
    title: 'Conectá las dos clases',
    description:
      'Pasá el mouse por una clase para ver sus puntos de conexión en el borde. ' +
      'Arrastrá desde un punto de la primera clase hasta un punto de la segunda para unirlas.',
    side: 'top',
    align: 'center',
    interactive: true,
    done: (snap, base) => snap.relationshipCount > base.relationshipCount,
    onBack: () => diagram().setActiveRelationType(null),
  },
  {
    // Connecting creates the relationship right away; the edit modal only opens from the edge label.
    id: 'relation-edit',
    target: 'relation-edge',
    title: '¡Ya está relacionada!',
    description:
      'La línea une las dos clases y su etiqueta muestra la cardinalidad (por ejemplo <strong>1 : N</strong>). ' +
      'Hacé <strong>doble clic en la etiqueta</strong> para ajustar el tipo, la cardinalidad y los roles.',
    side: 'top',
    align: 'center',
    interactive: true,
    wait: true,
    optional: true,
    done: (snap) => snap.hasEditingRelationship,
    onEnter: () => diagram().setActiveRelationType(null),
    onSkipTask: () => {
      const rel = diagram().currentDocument?.relationships[0];
      if (rel) diagram().setEditingRelationship(rel);
    },
  },
  {
    id: 'relation-modal',
    target: 'relationship-modal',
    title: 'Ajustá la relación',
    description:
      'Acá definís el tipo, la <strong>cardinalidad</strong> de cada extremo (por ejemplo 1 en Cliente y * en Pedido) ' +
      'y los <strong>roles</strong>, que dan nombre a las claves foráneas.',
    side: 'right',
    align: 'center',
    interactive: true,
    wait: true,
    optional: true,
    onBack: closeRelationModal,
  },
  {
    id: 'relation-save',
    target: 'relationship-save',
    title: 'Guardá la relación',
    description: 'Presioná <strong>Guardar Cambios</strong> para confirmarla. Vas a verla dibujada entre las dos clases.',
    side: 'top',
    align: 'center',
    interactive: true,
    wait: true,
    optional: true,
    done: (snap) => !snap.hasEditingRelationship,
    onSkipTask: closeRelationModal,
  },
  {
    id: 'ai-open',
    target: 'navbar-ai',
    title: 'Tu colega Senior AI',
    description:
      'Abrí el chat y pedile ayuda con el modelado, por ejemplo: <em>«Agregá una clase Producto con nombre y precio»</em>.',
    side: 'bottom',
    align: 'center',
    interactive: true,
    advanceOnClick: true,
    done: (snap) => snap.isAssistantOpen,
    onSkipTask: () => {
      if (!diagram().isAssistantOpen) diagram().toggleAssistant();
    },
  },
  {
    id: 'generate-code',
    target: 'navbar-sql',
    title: 'Generá código',
    description:
      'Con <strong>SQL</strong> ves el script de tu base de datos al instante. Al lado, <strong>Spring Boot</strong> y ' +
      '<strong>Flutter</strong> generan un backend y una app a partir de tu diagrama.',
    side: 'bottom',
    align: 'center',
    interactive: true,
    advanceOnClick: true,
    done: (snap) => snap.isSqlModalOpen,
    onSkipTask: () => diagram().openSqlModal(),
  },
  {
    // The anchor ships with the version-control navbar button; skipped when it is missing.
    id: 'save-version',
    target: 'navbar-history',
    title: 'Guardá una versión',
    description:
      'Una versión es como una foto de tu diagrama: podés volver a ella cuando quieras. ' +
      'Abrí el <strong>Historial</strong> y guardá un punto de control.',
    side: 'bottom',
    align: 'center',
    interactive: true,
    advanceOnClick: true,
    optional: true,
    done: (snap) => snap.isVersionPanelOpen,
    onSkipTask: () => useVersionStore.getState().openPanel(),
  },
  {
    id: 'invite-team',
    target: 'navbar-share',
    title: 'Trabajá en equipo',
    description:
      'Con <strong>Compartir</strong> invitás a otras personas a tu proyecto y editan el diagrama juntas en tiempo real.',
    side: 'bottom',
    align: 'center',
    interactive: true,
    advanceOnClick: true,
    done: (snap) => snap.isInviteModalOpen,
    onSkipTask: () => useCollaborationStore.getState().setInviteModalOpen(true),
  },
];

export interface MicroTourDef {
  steps: TourStepDef[];
  /** Stop on their own as soon as the mission is detected as done (otherwise the last step ends them). */
  endOnMission: boolean;
}

const MICRO_TOUR_STEP_IDS: Record<string, { steps: string[]; endOnMission: boolean }> = {
  'create-project': { steps: ['create-project'], endOnMission: true },
  'first-class': { steps: ['add-class', 'class-name', 'class-attributes', 'class-submit'], endOnMission: true },
  'add-attributes': { steps: ['add-attributes'], endOnMission: true },
  'second-class': { steps: ['second-class', 'class-name', 'class-submit'], endOnMission: true },
  // Keeps going after connecting so the user can also see how to edit the relationship.
  'first-relationship': {
    steps: ['relation-tool', 'relation-drag', 'relation-edit', 'relation-modal', 'relation-save'],
    endOnMission: false,
  },
  'ask-ai': { steps: ['ai-open'], endOnMission: false },
  'generate-code': { steps: ['generate-code'], endOnMission: true },
  'save-version': { steps: ['save-version'], endOnMission: false },
  'invite-team': { steps: ['invite-team'], endOnMission: true },
};

const STEPS_BY_ID = new Map(STEP_LIST.map((s) => [s.id, s]));

export const getMicroTour = (missionId: string): MicroTourDef | null => {
  const def = MICRO_TOUR_STEP_IDS[missionId];
  if (!def) return null;
  return {
    steps: def.steps.map((id) => STEPS_BY_ID.get(id)).filter((s): s is TourStepDef => !!s),
    endOnMission: def.endOnMission,
  };
};

export const hasMicroTour = (missionId: string): boolean => missionId in MICRO_TOUR_STEP_IDS;
