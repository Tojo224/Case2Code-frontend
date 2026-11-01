import { useDiagramStore } from '../store/useDiagramStore';
import type { RelationshipType } from '../types/uml';

/** Minimal view of the app state the tour reasons about. */
export interface TourSnapshot {
  hasDocument: boolean;
  classCount: number;
  isCreateClassModalOpen: boolean;
  hasEditingRelationship: boolean;
  activeRelationType: RelationshipType | null;
}

export const takeSnapshot = (): TourSnapshot => {
  const s = useDiagramStore.getState();
  return {
    hasDocument: !!s.currentDocument,
    classCount: s.currentDocument?.classes.length ?? 0,
    isCreateClassModalOpen: s.isCreateClassModalOpen,
    hasEditingRelationship: !!s.editingRelationship,
    activeRelationType: s.activeRelationType,
  };
};

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
  /** Step id to jump to when `done` is satisfied (defaults to the next step). */
  doneGoTo?: string;
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

export const buildTourSteps = (hasDocument: boolean): TourStepDef[] => {
  const steps: TourStepDef[] = [
    {
      id: 'welcome',
      title: '¡Bienvenido a Case2Code!',
      description:
        'En un par de minutos vas a armar tu primer diagrama: crear una clase, sumar otra y relacionarlas. ' +
        'Podés hacer cada acción vos mismo o avanzar con <strong>Siguiente</strong>. Saltalo cuando quieras.',
    },
  ];

  if (!hasDocument) {
    steps.push({
      id: 'create-project',
      target: 'empty-create-project',
      title: 'Creá tu primer proyecto',
      description:
        'Un proyecto guarda tu diagrama UML. Hacé clic en <strong>+ Crear mi primer proyecto</strong> para empezar.',
      side: 'top',
      align: 'center',
      interactive: true,
      done: (snap) => snap.hasDocument,
      onSkipTask: () => {
        void diagram().createDiagram('Mi Primer Diagrama', 'Proyecto personal');
      },
    });
  }

  steps.push(
    {
      id: 'add-class',
      target: 'navbar-add-class',
      title: 'Agregá una clase',
      description:
        'Cada clase es una entidad de tu modelo y se convierte en una tabla. ' +
        'Hacé clic en <strong>Clase</strong> en la barra superior para abrir el formulario.',
      side: 'bottom',
      align: 'end',
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
      align: 'start',
      interactive: true,
      wait: true,
      optional: true,
      focusTarget: true,
      done: (snap) => !snap.isCreateClassModalOpen,
      doneGoTo: 'class-node',
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
      align: 'start',
      interactive: true,
      wait: true,
      optional: true,
      done: (snap) => !snap.isCreateClassModalOpen,
      doneGoTo: 'class-node',
    },
    {
      id: 'class-submit',
      target: 'create-class-submit',
      title: 'Creá la clase',
      description:
        'Presioná <strong>Crear Clase</strong> (o <kbd>Ctrl</kbd> + <kbd>Enter</kbd>) para agregarla al diagrama.',
      side: 'top',
      align: 'end',
      interactive: true,
      wait: true,
      optional: true,
      done: classCreated,
      onSkipTask: closeClassModal,
    },
    {
      id: 'class-node',
      target: 'class-node',
      title: '¡Ahí está tu clase!',
      description:
        'Aparece en el lienzo como una caja UML: el nombre arriba y los atributos abajo. ' +
        'Podés moverla arrastrándola.',
      side: 'right',
      align: 'start',
      wait: true,
    },
    {
      id: 'second-class',
      target: 'canvas',
      title: 'Sumá una segunda clase',
      description:
        'Para relacionar clases necesitás al menos dos. Hacé <strong>doble clic en un espacio vacío</strong> ' +
        'del lienzo para abrir el formulario (por ejemplo <strong>Pedido</strong>).',
      side: 'top',
      align: 'center',
      interactive: true,
      done: (snap) => snap.isCreateClassModalOpen,
      onSkipTask: () => diagram().openCreateClassModal(),
    },
    {
      id: 'second-name',
      target: 'create-class-name',
      title: 'Nombre de la segunda clase',
      description: 'Escribí el nombre, por ejemplo <strong>Pedido</strong>, y completá sus atributos si querés.',
      side: 'right',
      align: 'start',
      interactive: true,
      wait: true,
      optional: true,
      focusTarget: true,
      done: (snap) => !snap.isCreateClassModalOpen,
      doneGoTo: 'relation-tool',
      onBack: closeClassModal,
    },
    {
      id: 'second-submit',
      target: 'create-class-submit',
      title: 'Creá la segunda clase',
      description: 'Presioná <strong>Crear Clase</strong> (o <kbd>Ctrl</kbd> + <kbd>Enter</kbd>).',
      side: 'top',
      align: 'end',
      interactive: true,
      wait: true,
      optional: true,
      done: classCreated,
      onSkipTask: closeClassModal,
    },
    {
      id: 'relation-tool',
      target: 'sidebar-tool-ONE_TO_MANY',
      title: 'Elegí un tipo de relación',
      description:
        'En este panel están todas las relaciones. <strong>1 : N</strong> significa que un registro de la primera ' +
        'clase se vincula con muchos de la segunda (un cliente, muchos pedidos). Hacé clic para activar el modo conexión.',
      side: 'right',
      align: 'start',
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
      done: (snap) => snap.hasEditingRelationship,
      onBack: () => diagram().setActiveRelationType(null),
    },
    {
      id: 'relation-modal',
      target: 'relationship-modal',
      title: 'Ajustá la relación',
      description:
        'Acá definís el tipo, la <strong>cardinalidad</strong> de cada extremo (por ejemplo 1 en Cliente y * en Pedido) ' +
        'y los <strong>roles</strong>, que dan nombre a las claves foráneas.',
      side: 'right',
      align: 'start',
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
      align: 'end',
      interactive: true,
      wait: true,
      optional: true,
      done: (snap) => !snap.hasEditingRelationship,
      onSkipTask: closeRelationModal,
    },
    {
      id: 'share',
      target: 'navbar-share',
      title: 'Trabajá en equipo',
      description:
        'Con <strong>Compartir</strong> invitás a otras personas a tu proyecto y editan el diagrama juntas en tiempo real.',
      side: 'bottom',
      align: 'end',
      onEnter: () => diagram().setActiveRelationType(null),
    },
    {
      id: 'ai',
      target: 'navbar-ai',
      title: 'Tu colega Senior AI',
      description: 'Abrí el chat para pedirle ayuda con el modelado o para conversar con tu equipo.',
      side: 'bottom',
      align: 'end',
    },
    {
      id: 'springboot',
      target: 'navbar-springboot',
      title: 'Generá tu backend',
      description:
        'Cuando el modelo esté listo, <strong>Spring Boot</strong> genera y descarga el backend a partir de tu diagrama.',
      side: 'bottom',
      align: 'end',
    },
    {
      id: 'finish',
      target: 'help-button',
      title: '¡Listo, ya sabés lo básico!',
      description:
        'Podés volver a ver este tutorial cuando quieras desde el botón de ayuda <strong>(?)</strong> de la barra superior.',
      side: 'bottom',
      align: 'end',
    },
  );

  return steps;
};
