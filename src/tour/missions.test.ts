import { describe, it, expect } from 'vitest';
import {
  MISSIONS,
  buildMissionNotice,
  detectDoneMissions,
  evaluateMissions,
  getMission,
  nextPendingMission,
} from './missions';
import { EMPTY_SNAPSHOT, type TourSnapshot } from './tourSteps';

const snap = (o: Partial<TourSnapshot> = {}): TourSnapshot => ({ ...EMPTY_SNAPSHOT, ...o });
const project = (o: Partial<TourSnapshot> = {}) => snap({ hasDocument: true, documentId: 'd1', ...o });

describe('missions detection', () => {
  it('has the nine missions in learning order', () => {
    expect(MISSIONS.map((m) => m.id)).toEqual([
      'create-project',
      'first-class',
      'add-attributes',
      'second-class',
      'first-relationship',
      'ask-ai',
      'generate-code',
      'save-version',
      'invite-team',
    ]);
  });

  it('detects nothing on an empty workspace', () => {
    expect(detectDoneMissions(snap())).toEqual([]);
  });

  it('detects project and class progress', () => {
    expect(detectDoneMissions(project())).toEqual(['create-project']);
    expect(detectDoneMissions(project({ classCount: 1 }))).toEqual(['create-project', 'first-class']);
    expect(detectDoneMissions(project({ classCount: 2, relationshipCount: 1 }))).toEqual([
      'create-project',
      'first-class',
      'second-class',
      'first-relationship',
    ]);
  });

  it('add-attributes needs a non-PK attribute, not just the id', () => {
    const m = getMission('add-attributes')!;
    expect(m.detect(project({ classCount: 1, hasPkOnlyClass: true, hasNonPkAttribute: false }))).toBe(false);
    expect(m.detect(project({ classCount: 1, hasNonPkAttribute: true }))).toBe(true);
  });

  it('detects AI, code generation, versions and team signals', () => {
    expect(getMission('ask-ai')!.detect(snap({ hasChatActivity: true }))).toBe(true);
    expect(getMission('ask-ai')!.detect(snap({ isAssistantOpen: true }))).toBe(false);

    const gen = getMission('generate-code')!;
    expect(gen.detect(snap())).toBe(false);
    expect(gen.detect(snap({ isSqlModalOpen: true }))).toBe(true);
    expect(gen.detect(snap({ isGenerating: true }))).toBe(true);
    expect(gen.detect(snap({ isGeneratingMobile: true }))).toBe(true);

    const ver = getMission('save-version')!;
    expect(ver.detect(snap({ versionCount: 1 }))).toBe(true);
    expect(ver.detect(snap({ isVersionPanelOpen: true }))).toBe(true);
    expect(ver.detect(snap())).toBe(false);

    const team = getMission('invite-team')!;
    expect(team.detect(snap({ collaboratorCount: 1 }))).toBe(false);
    expect(team.detect(snap({ collaboratorCount: 2 }))).toBe(true);
    expect(team.detect(snap({ isInviteModalOpen: true }))).toBe(true);
  });

  it('auto-marks what an experienced workspace already proves, silently', () => {
    const experienced = project({ classCount: 3, hasNonPkAttribute: true, relationshipCount: 2 });
    const result = evaluateMissions(null, experienced, {});
    expect(result.newlyDone).toEqual([
      'create-project',
      'first-class',
      'add-attributes',
      'second-class',
      'first-relationship',
    ]);
    expect(result.announce).toEqual([]);
  });

  it('announces only what the user just did in the project they were working on', () => {
    const result = evaluateMissions(project(), project({ classCount: 1 }), { 'create-project': 1 });
    expect(result.newlyDone).toEqual(['first-class']);
    expect(result.announce).toEqual(['first-class']);
  });

  it('announces the project creation but not the load of another project', () => {
    expect(evaluateMissions(snap(), project(), {}).announce).toEqual(['create-project']);
    const other = project({ documentId: 'd2', classCount: 2 });
    expect(evaluateMissions(project(), other, {}).announce).toEqual([]);
  });

  it('does not report missions that are already stored', () => {
    const stored = { 'create-project': 1, 'first-class': 2 };
    expect(evaluateMissions(project(), project({ classCount: 1 }), stored).newlyDone).toEqual([]);
  });

  it('points to the next pending mission in the toast', () => {
    expect(nextPendingMission({})?.id).toBe('create-project');
    const notice = buildMissionNotice('first-class', { 'create-project': 1 });
    expect(notice.message).toBe('¡Listo! Creaste tu primera clase');
    expect(notice.nextMissionId).toBe('add-attributes');
    expect(nextPendingMission(Object.fromEntries(MISSIONS.map((m) => [m.id, 1])))).toBeUndefined();
  });
});
