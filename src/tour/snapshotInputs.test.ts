import { describe, expect, it } from 'vitest';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { sameInputs, snapshotInputs } from './tourSteps';

describe('snapshotInputs', () => {
  it('ignores store changes the tour does not read (cursors, node drags)', () => {
    const before = snapshotInputs();
    useCollaborationStore.getState().updateRemoteCursor('u2', 'Ana', '#fff', 10, 20);
    useDiagramStore.setState({ nodes: [...useDiagramStore.getState().nodes] });
    expect(sameInputs(before, snapshotInputs())).toBe(true);
  });

  it('detects changes in what the tour reads', () => {
    const before = snapshotInputs();
    useDiagramStore.setState({ isSqlModalOpen: !useDiagramStore.getState().isSqlModalOpen });
    expect(sameInputs(before, snapshotInputs())).toBe(false);
    useDiagramStore.setState({ isSqlModalOpen: false });
  });

  it('never matches a missing baseline', () => {
    expect(sameInputs(null, snapshotInputs())).toBe(false);
  });
});
