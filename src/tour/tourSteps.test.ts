import { describe, it, expect } from 'vitest';
import { EMPTY_SNAPSHOT, getMicroTour, hasMicroTour, hasOpenModal, type TourSnapshot } from './tourSteps';
import { MISSIONS } from './missions';

const snap = (overrides: Partial<TourSnapshot> = {}): TourSnapshot => ({
  ...EMPTY_SNAPSHOT,
  hasDocument: true,
  documentId: 'd1',
  ...overrides,
});

const step = (missionId: string, stepId: string) => {
  const found = getMicroTour(missionId)!.steps.find((s) => s.id === stepId);
  expect(found).toBeDefined();
  return found!;
};

describe('micro-tours', () => {
  it('every mission has a micro-tour made of known, unique steps', () => {
    for (const m of MISSIONS) {
      expect(hasMicroTour(m.id)).toBe(true);
      const tour = getMicroTour(m.id)!;
      expect(tour.steps.length).toBeGreaterThan(0);
      const ids = tour.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(getMicroTour('nope')).toBeNull();
  });

  it('splits the class creation flow and keeps the relationship flow in order', () => {
    expect(getMicroTour('first-class')!.steps.map((s) => s.id)).toEqual([
      'add-class',
      'class-name',
      'class-attributes',
      'class-submit',
    ]);
    expect(getMicroTour('first-relationship')!.steps.map((s) => s.id)).toEqual([
      'relation-tool',
      'relation-drag',
      'relation-edit',
      'relation-modal',
      'relation-save',
    ]);
  });

  it('the history step is optional so it is skipped when the anchor is missing', () => {
    expect(step('save-version', 'save-version').optional).toBe(true);
    expect(step('save-version', 'save-version').target).toBe('navbar-history');
  });

  it('detects a created class only after the modal closed with more classes', () => {
    const submit = step('first-class', 'class-submit');
    const base = snap({ classCount: 1 });
    expect(submit.done!(snap({ classCount: 2, isCreateClassModalOpen: true }), base)).toBe(false);
    expect(submit.done!(snap({ classCount: 1 }), base)).toBe(false);
    expect(submit.done!(snap({ classCount: 2 }), base)).toBe(true);
  });

  it('advances after connecting (no modal opens) and then offers to edit the relationship', () => {
    const drag = step('first-relationship', 'relation-drag');
    const base = snap({ relationshipCount: 0 });
    expect(drag.done!(snap({ relationshipCount: 0 }), base)).toBe(false);
    expect(drag.done!(snap({ relationshipCount: 1 }), base)).toBe(true);

    const edit = step('first-relationship', 'relation-edit');
    expect(edit.target).toBe('relation-edge');
    expect(edit.done!(snap({ hasEditingRelationship: true }), base)).toBe(true);
    expect(edit.onSkipTask).toBeTypeOf('function');
    // The tour keeps going after the relationship exists so the user can see how to edit it.
    expect(getMicroTour('first-relationship')!.endOnMission).toBe(false);
  });

  it('task steps that need the tour to open something have a Next fallback', () => {
    const needsFallback: Array<[string, string]> = [
      ['create-project', 'create-project'],
      ['first-class', 'add-class'],
      ['second-class', 'second-class'],
      ['first-relationship', 'relation-tool'],
      ['first-relationship', 'relation-edit'],
      ['ask-ai', 'ai-open'],
      ['generate-code', 'generate-code'],
      ['save-version', 'save-version'],
      ['invite-team', 'invite-team'],
    ];
    for (const [mission, id] of needsFallback) expect(step(mission, id).onSkipTask).toBeTypeOf('function');
  });

  it('knows when a modal is in front of the canvas', () => {
    expect(hasOpenModal(snap())).toBe(false);
    expect(hasOpenModal(snap({ isCreateClassModalOpen: true }))).toBe(true);
    expect(hasOpenModal(snap({ hasEditingRelationship: true }))).toBe(true);
    expect(hasOpenModal(snap({ isVersionPanelOpen: true }))).toBe(true);
  });
});
