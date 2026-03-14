import { useEditor } from '@/composables/use-editor';

describe('useEditor', () => {
  it('seeds baseline history when an initial snapshot is provided', () => {
    const editor = useEditor({ initialSnapshot: 'snap-0' });

    expect(editor.history.value).toHaveLength(1);
    expect(editor.historyIndex.value).toBe(0);
    expect(editor.history.value[0]?.snapshot).toBe('snap-0');
    expect(editor.canUndo.value).toBe(false);
    expect(editor.canRedo.value).toBe(false);
    expect(editor.isDirty.value).toBe(false);
  });

  it('pushes snapshots in order and toggles dirty through undo/redo', () => {
    const editor = useEditor({ initialSnapshot: 'snap-0' });

    editor.pushHistory('Update 1', 'snap-1');
    editor.pushHistory('Update 2', 'snap-2');

    expect(editor.history.value.map((entry) => entry.snapshot)).toEqual(['snap-0', 'snap-1', 'snap-2']);
    expect(editor.historyIndex.value).toBe(2);
    expect(editor.canUndo.value).toBe(true);
    expect(editor.isDirty.value).toBe(true);

    expect(editor.undo()).toBe('snap-1');
    expect(editor.isDirty.value).toBe(true);

    expect(editor.undo()).toBe('snap-0');
    expect(editor.isDirty.value).toBe(false);
    expect(editor.canUndo.value).toBe(false);

    expect(editor.redo()).toBe('snap-1');
    expect(editor.isDirty.value).toBe(true);
    expect(editor.canRedo.value).toBe(true);
  });

  it('truncates forward history when pushing after undo', () => {
    const editor = useEditor({ initialSnapshot: 'snap-0' });

    editor.pushHistory('Update 1', 'snap-1');
    editor.pushHistory('Update 2', 'snap-2');
    editor.undo();
    editor.pushHistory('Branch', 'snap-3');

    expect(editor.history.value.map((entry) => entry.snapshot)).toEqual(['snap-0', 'snap-1', 'snap-3']);
    expect(editor.historyIndex.value).toBe(2);
    expect(editor.canRedo.value).toBe(false);
  });

  it('ignores duplicate consecutive snapshots', () => {
    const editor = useEditor({ initialSnapshot: 'snap-0' });

    editor.pushHistory('Update 1', 'snap-1');
    editor.pushHistory('Duplicate update', 'snap-1');

    expect(editor.history.value).toHaveLength(2);
    expect(editor.history.value.map((entry) => entry.label)).toEqual(['Initial state', 'Update 1']);
  });

  it('can set the baseline later and clears dirty state', () => {
    const editor = useEditor();

    editor.setHistoryBaseline('snap-0', 'Initial');
    editor.pushHistory('Update', 'snap-1');
    expect(editor.isDirty.value).toBe(true);

    editor.undo();
    expect(editor.isDirty.value).toBe(false);
  });
});
