import { describe, expect, it } from 'vitest';
import { operationWorkflow, workspaceRouteAliases } from '../layouts/navigation';
import { getWorkspaceRouteTarget } from './WorkspaceRouteRedirect';
import {
  contentGenerationPath,
  growthOptimizationPath,
  monitoringPath,
  publishingPath,
  readWorkflowRouteContext,
  tasksPath,
  userIntentsPath,
  workflowStagePath,
  type WorkflowRouteContext
} from './routePaths';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;
const objectIds = ['object-1', 'object with space', '中文/对象?值&2'] as const;
const modes = ['automatic', 'manual', 'records', 'retest'] as const;
const actions = ['create', 'open'] as const;
const tabs = ['records', 'accounts', 'platform-guidance', 'platform-detail'] as const;
const monitoringSections = ['test-question-candidate-card', 'manual-test-entry', 'monitoring-runs-card'] as const;

type GeneratedRoute = {
  path: string;
  expectedContext: Partial<WorkflowRouteContext>;
  expectedHash?: string;
};

function expectContext(path: string, expectedContext: Partial<WorkflowRouteContext>, expectedHash = '') {
  const url = new URL(path, 'https://geo.example.test');
  const parsedContext = readWorkflowRouteContext(url.search);

  Object.entries(expectedContext).forEach(([key, value]) => {
    expect(parsedContext[key as keyof WorkflowRouteContext]).toBe(value);
  });
  expect(url.hash).toBe(expectedHash);
}

function buildGeneratedRoutes(): GeneratedRoute[] {
  return objectIds.flatMap((id) => {
    const routes: GeneratedRoute[] = [
      {
        path: userIntentsPath({ optimizationUnitId: id, action: 'create' }),
        expectedContext: { optimizationUnitId: id, action: 'create' }
      },
      {
        path: growthOptimizationPath({ question: id, optimizationUnitId: id, intentId: id, promptId: id, runId: id }),
        expectedContext: { question: id, optimizationUnitId: id, intentId: id, promptId: id, runId: id }
      },
      {
        path: contentGenerationPath({ optimizationUnitId: id, intentId: id, runId: id, planId: id, taskId: id }),
        expectedContext: { optimizationUnitId: id, intentId: id, runId: id, planId: id, taskId: id }
      }
    ];

    modes.forEach((mode) => {
      monitoringSections.forEach((section) => {
        routes.push({
          path: monitoringPath({
            question: id,
            optimizationUnitId: id,
            intentId: id,
            promptId: id,
            runId: id,
            taskId: id,
            platformCode: id,
            mode
          }, section),
          expectedContext: {
            question: id,
            optimizationUnitId: id,
            intentId: id,
            promptId: id,
            runId: id,
            taskId: id,
            platformCode: id,
            mode
          },
          expectedHash: `#${section}`
        });
      });
    });

    tabs.forEach((tab) => {
      routes.push({
        path: publishingPath({ generationTaskId: id, versionId: id, publishingRecordId: id, tab }),
        expectedContext: { generationTaskId: id, versionId: id, publishingRecordId: id, tab }
      });
    });

    actions.forEach((action) => {
      routes.push({
        path: tasksPath({
          taskId: id,
          generationTaskId: id,
          publishingRecordId: id,
          promptId: id,
          runId: id,
          platformCode: id,
          action
        }),
        expectedContext: {
          taskId: id,
          generationTaskId: id,
          publishingRecordId: id,
          promptId: id,
          runId: id,
          platformCode: id,
          action
        }
      });
    });

    return routes;
  });
}

describe(`Property P4: workflow context preservation ${validatesCriteria(['3.4', '8.1'])}`, () => {
  it('round-trips generated context through every workflow route builder', () => {
    buildGeneratedRoutes().forEach(({ path, expectedContext, expectedHash }) => {
      expectContext(path, expectedContext, expectedHash);
    });
  });

  it('preserves generated query and hash through every brand workspace redirect', () => {
    const generatedLocations = buildGeneratedRoutes().map(({ path }) => new URL(path, 'https://geo.example.test'));

    Object.entries(workspaceRouteAliases).forEach(([alias, target]) => {
      generatedLocations.forEach((location) => {
        expect(getWorkspaceRouteTarget(alias, location.search, location.hash))
          .toBe(`${target}${location.search}${location.hash}`);
      });
    });
  });

  it('keeps complete context across every adjacent workflow destination', () => {
    objectIds.forEach((id) => {
      modes.forEach((mode) => {
        actions.forEach((action) => {
          tabs.forEach((tab) => {
            const context: WorkflowRouteContext = {
              question: id,
              optimizationUnitId: id,
              intentId: id,
              promptId: id,
              runId: id,
              planId: id,
              taskId: id,
              generationTaskId: id,
              versionId: id,
              publishingRecordId: id,
              platformCode: id,
              mode,
              action,
              tab
            };

            operationWorkflow.forEach((step) => {
              expectContext(workflowStagePath(step.key, context), context);
            });
          });
        });
      });
    });
  });
});
