import { Injectable } from '@nestjs/common';
import type { BrandId, QuestionRadarDashboard, QuestionRadarItem, TestQuestionCandidate, TestTheme, VisibilitySprint } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class QuestionRadarService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async getQuestionRadar(userId: string, brandId: BrandId, sprintId: string): Promise<QuestionRadarDashboard | null> {
    const sprint = await this.permissionsService.getVisibilitySprint(userId, brandId, sprintId);
    if (!sprint) {
      return null;
    }

    const [candidates, themes] = await Promise.all([
      this.permissionsService.listTestQuestionCandidates(userId, brandId),
      this.permissionsService.listTestThemes(userId, brandId)
    ]);
    if (!candidates || !themes) {
      return null;
    }

    return this.buildDashboard(brandId, sprint, candidates, themes);
  }

  buildDashboard(brandId: BrandId, sprint: VisibilitySprint, candidates: TestQuestionCandidate[], themes: TestTheme[]): QuestionRadarDashboard {
    const themeById = new Map(themes.map((theme) => [theme.id, theme]));
    const sprintQuestionIds = new Set(sprint.relatedQuestionIds);
    const seenInSprintQuestions = new Set<string>();
    let duplicateInSprintQuestionCount = 0;
    const items: QuestionRadarItem[] = [];

    const sortedCandidates = [...candidates].sort((first, second) => {
      const firstInSprint = sprintQuestionIds.has(first.id) ? 0 : 1;
      const secondInSprint = sprintQuestionIds.has(second.id) ? 0 : 1;
      return firstInSprint - secondInSprint || priorityRank(first.priority) - priorityRank(second.priority) || first.createdAt.localeCompare(second.createdAt);
    });

    for (const candidate of sortedCandidates) {
      const normalizedQuestion = normalizeQuestionText(candidate.question);
      const inSprint = sprintQuestionIds.has(candidate.id);
      const duplicateInSprint = inSprint && seenInSprintQuestions.has(normalizedQuestion);
      if (duplicateInSprint) {
        duplicateInSprintQuestionCount += 1;
        continue;
      }
      if (inSprint) {
        seenInSprintQuestions.add(normalizedQuestion);
      }

      const theme = themeById.get(candidate.themeId);
      items.push({
        questionId: candidate.id,
        sprintId: sprint.sprintId,
        brandId,
        question: candidate.question,
        normalizedQuestion,
        intentLabel: theme?.name ?? '未归类意图',
        intentType: theme?.type ?? 'unknown',
        purposes: candidate.purposes,
        platformCoverage: candidate.targetPlatforms,
        businessValue: candidate.estimatedValue,
        priority: candidate.priority,
        status: inSprint ? 'in_sprint' : candidate.selected ? 'selected' : 'available',
        sprintAssociation: {
          inSprint,
          relation: inSprint ? 'selected_for_sprint' : 'available_for_sprint',
          duplicateInSprint: false
        },
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt
      });
    }

    return {
      brandId,
      sprintId: sprint.sprintId,
      totalQuestionCount: candidates.length,
      inSprintQuestionCount: sprint.relatedQuestionIds.length,
      dedupedInSprintQuestionCount: seenInSprintQuestions.size,
      duplicateInSprintQuestionCount,
      items
    };
  }
}

function normalizeQuestionText(question: string): string {
  return question.trim().replace(/\s+/g, '').replace(/[?？!！。,.，、]/g, '').toLowerCase();
}

function priorityRank(priority: TestQuestionCandidate['priority']): number {
  const rank: Record<TestQuestionCandidate['priority'], number> = { high: 0, medium: 1, low: 2 };
  return rank[priority] ?? 3;
}
