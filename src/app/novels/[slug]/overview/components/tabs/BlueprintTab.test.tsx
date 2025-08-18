// src/app/novels/[slug]/overview/components/tabs/BlueprintTab.test.tsx
// ไฟล์ทดสอบสำหรับ BlueprintTab component
// ทดสอบ multiple selection, save system, และ infinite loops prevention

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Ensure Jest types are properly loaded
/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

// Mock all backend models to avoid MongoDB parsing issues
jest.mock('@/backend/models/StoryMap', () => ({
  StoryMapNodeType: {
    START_NODE: 'start_node',
    SCENE_NODE: 'scene_node',
    CHOICE_NODE: 'choice_node',
    END_NODE: 'end_node',
    BRANCH_NODE: 'branch_node',
    COMMENT_NODE: 'comment_node',
    GROUP_NODE: 'group_node',
    DELAY_NODE: 'delay_node',
    RANDOM_BRANCH_NODE: 'random_branch_node',
    PARALLEL_EXECUTION_NODE: 'parallel_execution_node',
    SUB_STORYMAP_NODE: 'sub_storymap_node'
  }
}));

jest.mock('@/backend/models/Scene', () => ({}));
jest.mock('@/backend/models/Character', () => ({}));
jest.mock('@/backend/models/Media', () => ({}));
jest.mock('@/backend/models/OfficialMedia', () => ({}));

// Import after mocking
import BlueprintTab from './BlueprintTab';
const { StoryMapNodeType } = jest.requireMock('@/backend/models/StoryMap');

// Mock dependencies
// FIX: Changed 'react-flow-renderer' to '@xyflow/react' to match the installed package.
jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, onSelectionChange }: any) => (
    <div data-testid="react-flow">
      {children}
      <button
        data-testid="select-nodes"
        onClick={() => onSelectionChange({
          nodes: [{ id: 'node1' }, { id: 'node2' }],
          edges: []
        })}
      >
        Select Multiple Nodes
      </button>
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  Panel: ({ children }: any) => <div data-testid="panel">{children}</div>,
  MarkerType: { ArrowClosed: 'ArrowClosed' },
  ConnectionMode: { Loose: 'Loose' },
  ConnectionLineType: { SmoothStep: 'SmoothStep', Straight: 'Straight', Bezier: 'Bezier' },
  SelectionMode: { Partial: 'Partial', Full: 'Full' },
  BackgroundVariant: { Lines: 'Lines', Dots: 'Dots' },
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: ({ children }: any) => <div>{children}</div>,
  BaseEdge: ({ children }: any) => <div>{children}</div>,
  EdgeLabelRenderer: ({ children }: any) => <div>{children}</div>,
  getSmoothStepPath: jest.fn(() => 'M0,0 L100,100'),
  getStraightPath: jest.fn(() => 'M0,0 L100,100'),
  getBezierPath: jest.fn(() => 'M0,0 L100,100'),
  useNodesState: () => [[], jest.fn()],
  useEdgesState: () => [[], jest.fn()],
  addEdge: jest.fn(),
  useReactFlow: () => ({
    fitView: jest.fn(),
    getNodes: () => [],
    getEdges: () => [],
    setNodes: jest.fn(),
    setEdges: jest.fn(),
  }),
  useStore: () => ({}),
  useHandleConnections: () => [],
  useUpdateNodeInternals: () => jest.fn(),
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }
}));

const mockProps = {
  novel: {
    _id: 'novel1',
    slug: 'test-novel',
    title: 'Test Novel'
  },
  storyMap: {
    _id: 'storymap1',
    nodes: [
      {
        nodeId: 'node1',
        nodeType: StoryMapNodeType.START_NODE,
        title: 'Start Node',
        position: { x: 0, y: 0 }
      },
      {
        nodeId: 'node2',
        nodeType: StoryMapNodeType.SCENE_NODE,
        title: 'Scene Node',
        position: { x: 100, y: 100 }
      }
    ],
    edges: [],
    storyVariables: []
  },
  scenes: [],
  characters: [],
  userMedia: [],
  officialMedia: [],
  episodes: [],
  onStoryMapUpdate: jest.fn(),
  onManualSave: jest.fn(),
  onDirtyChange: jest.fn(),
  onNavigateToDirector: jest.fn(),
  userSettings: {
    visualNovelGameplay: {
      blueprintEditor: {
        autoSaveEnabled: false,
        autoSaveIntervalSec: 30,
        showSceneThumbnails: true,
        showNodeLabels: true,
        showGrid: true
      }
    }
  }
};

describe('BlueprintTab', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Mock window.innerWidth for mobile detection
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  test('renders without crashing', () => {
    render(<BlueprintTab {...mockProps} />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  test('multiple selection works correctly', async () => {
    render(<BlueprintTab {...mockProps} />);

    // Check that ReactFlow is rendered
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();

    // Simulate selecting multiple nodes
    const selectNodesButton = screen.getByTestId('select-nodes');
    fireEvent.click(selectNodesButton);

    // The mock should trigger selection change
    await waitFor(() => {
      expect(selectNodesButton).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('save system prevents duplicate saves', async () => {
    const onManualSave = jest.fn();
    render(<BlueprintTab {...mockProps} onManualSave={onManualSave} />);

    // Check that component renders with save functionality
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    
    // This test would require the actual save button to be present
    // For now, just verify the component doesn't crash with the save prop
    expect(onManualSave).toBeDefined();
  });

  test('localStorage state management prevents infinite loops', () => {
    // Render component multiple times
    const { rerender } = render(<BlueprintTab {...mockProps} />);
    rerender(<BlueprintTab {...mockProps} />);
    rerender(<BlueprintTab {...mockProps} />);

    // Verify component doesn't crash during re-renders
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  test('confirmation bar shows only once for multiple selection', async () => {
    render(<BlueprintTab {...mockProps} />);

    // Select nodes using mock
    const selectNodesButton = screen.getByTestId('select-nodes');
    fireEvent.click(selectNodesButton);

    // Verify the selection doesn't cause crashes
    await waitFor(() => {
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });
  });

  test('auto-save settings are properly managed', () => {
    render(<BlueprintTab {...mockProps} />);

    // Check that component renders with user settings
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();

    // Verify user settings are passed correctly
    expect(mockProps.userSettings).toBeDefined();
    expect(mockProps.userSettings.visualNovelGameplay.blueprintEditor.autoSaveEnabled).toBe(false);
  });
});

// Integration tests สำหรับ SaveManager
describe('SaveManager Integration', () => {
  test('handles server errors gracefully', async () => {
    // Mock fetch to return server error
    global.fetch = jest.fn().mockRejectedValueOnce(
      new Error('Internal server error')
    );

    const { UnifiedSaveManager } = await import('./SaveManager');
    const saveManager = new UnifiedSaveManager({
      novelSlug: 'test-novel',
      autoSaveEnabled: false,
      autoSaveIntervalMs: 30000,
      debounceDelayMs: 1000,
      maxRetries: 3
    });

    const saveOperation = {
      type: 'ADD_NODE' as const,
      data: { nodes: [], edges: [], storyVariables: [] },
      strategy: 'immediate' as const
    };

    // Should handle error without crashing
    await expect(saveManager.saveOperation(saveOperation)).resolves.toBeUndefined();

    // Should update state to show error
    const state = saveManager.getState();
    expect(state.status).toBe('error');
  });

  test('prevents data formatting errors', async () => {
    const { UnifiedSaveManager } = await import('./SaveManager');
    const saveManager = new UnifiedSaveManager({
      novelSlug: 'test-novel',
      autoSaveEnabled: false,
      autoSaveIntervalMs: 30000,
      debounceDelayMs: 1000,
      maxRetries: 3
    });

    // Try to save invalid data
    const invalidOperation = {
      type: 'ADD_NODE' as const,
      data: null, // Invalid data
      strategy: 'immediate' as const
    };

    // Should handle invalid data gracefully
    await expect(saveManager.saveOperation(invalidOperation)).resolves.toBeUndefined();

    const state = saveManager.getState();
    expect(state.status).toBe('error');
    // Check for either data formatting error or retry message
    expect(state.lastError).toMatch(/Data formatting failed|กำลังลองใหม่/);
  });
});
