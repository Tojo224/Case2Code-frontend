import { describe, it, expect } from 'vitest';
import { buildTourSteps, type TourSnapshot } from './tourSteps';

const snap = (overrides: Partial<TourSnapshot> = {}): TourSnapshot => ({
  hasDocument: true,
  classCount: 0,
  relationshipCount: 0,
  isCreateClassModalOpen: false,
  hasEditingRelationship: false,
  activeRelationType: null,
  ...overrides,
});

describe('buildTourSteps', () => {
  it('only includes the create-project step when there is no project', () => {
    expect(buildTourSteps(false).some((s) => s.id === 'create-project')).toBe(true);
    expect(buildTourSteps(true).some((s) => s.id === 'create-project')).toBe(false);
  });

  it('has unique ids and valid doneGoTo targets', () => {
    const steps = buildTourSteps(false);
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of steps) {
      if (s.doneGoTo) expect(ids).toContain(s.doneGoTo);
    }
  });

  it('starts centered and ends on the help button', () => {
    const steps = buildTourSteps(true);
    expect(steps[0].target).toBeUndefined();
    expect(steps[steps.length - 1].target).toBe('help-button');
  });

  it('detects a created class only after the modal closed with more classes', () => {
    const submit = buildTourSteps(true).find((s) => s.id === 'class-submit')!;
    const base = snap({ classCount: 1 });
    expect(submit.done!(snap({ classCount: 2, isCreateClassModalOpen: true }), base)).toBe(false);
    expect(submit.done!(snap({ classCount: 1 }), base)).toBe(false);
    expect(submit.done!(snap({ classCount: 2 }), base)).toBe(true);
  });

  it('advances after connecting (a relationship is created, no modal opens) and then offers to edit it', () => {
    const steps = buildTourSteps(true);
    const drag = steps.find((s) => s.id === 'relation-drag')!;
    const base = snap({ relationshipCount: 0 });
    expect(drag.done!(snap({ relationshipCount: 0 }), base)).toBe(false);
    expect(drag.done!(snap({ relationshipCount: 1 }), base)).toBe(true);

    const ids = steps.map((s) => s.id);
    expect(ids.indexOf('relation-edit')).toBe(ids.indexOf('relation-drag') + 1);
    const edit = steps.find((s) => s.id === 'relation-edit')!;
    expect(edit.target).toBe('relation-edge');
    expect(edit.done!(snap({ hasEditingRelationship: true }), base)).toBe(true);
    expect(edit.onSkipTask).toBeTypeOf('function');
  });

  it('every task step has a fallback so Next never dead-ends', () => {
    const steps = buildTourSteps(false);
    for (const s of steps) {
      if (s.done && s.interactive) {
        // Steps whose modal is opened by the tour need onSkipTask; pure observation steps may omit it.
        const needsFallback = ['create-project', 'add-class', 'second-class', 'relation-tool', 'relation-edit'].includes(s.id);
        if (needsFallback) expect(s.onSkipTask).toBeTypeOf('function');
      }
    }
  });
});
