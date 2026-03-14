import { useDragDrop } from '@/composables/use-drag-drop';

describe('useDragDrop', () => {
  it('tracks a new component drag from start to drop target', () => {
    const dragDrop = useDragDrop();

    dragDrop.startDragNew('PbText');
    dragDrop.updateDropTarget(10, 2, 'default');

    expect(dragDrop.dragState.value.isDragging).toBe(true);
    expect(dragDrop.dragState.value.isNewComponent).toBe(true);
    expect(dragDrop.dragState.value.sourceComponentName).toBe('PbText');
    expect(dragDrop.dragState.value.dropTargetId).toBe(10);
    expect(dragDrop.dragState.value.dropIndex).toBe(2);
    expect(dragDrop.dragState.value.dropSlot).toBe('default');
  });

  it('endDrag returns the final state and resets drag state', () => {
    const dragDrop = useDragDrop();

    dragDrop.startDragExisting(42);
    dragDrop.updateDropTarget(5, 1);

    const result = dragDrop.endDrag();

    expect(result.isDragging).toBe(true);
    expect(result.sourceNodeId).toBe(42);
    expect(result.dropTargetId).toBe(5);
    expect(dragDrop.dragState.value.isDragging).toBe(false);
    expect(dragDrop.dragState.value.sourceNodeId).toBeNull();
    expect(dragDrop.dragState.value.dropTargetId).toBeNull();
  });

  it('cancelDrag resets state without needing drop result', () => {
    const dragDrop = useDragDrop();

    dragDrop.startDragNew('PbImage');
    dragDrop.updateDropTarget(7, 0, 'sidebar');
    dragDrop.cancelDrag();

    expect(dragDrop.dragState.value.isDragging).toBe(false);
    expect(dragDrop.dragState.value.sourceComponentName).toBeNull();
    expect(dragDrop.dragState.value.dropTargetId).toBeNull();
    expect(dragDrop.dragState.value.dropSlot).toBe('default');
  });

  it('ignores drop target updates when no drag is active', () => {
    const dragDrop = useDragDrop();

    dragDrop.updateDropTarget(99, 3, 'default');

    expect(dragDrop.dragState.value.dropTargetId).toBeNull();
    expect(dragDrop.dragState.value.dropIndex).toBe(0);
  });
});
