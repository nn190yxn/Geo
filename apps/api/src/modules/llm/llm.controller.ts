import { Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  AnswerAnalysisInput,
  AnalysisResultInput,
  ApiResponse,
  LLMContentGenerationInput,
  LLMContentGenerationOutput,
  LLMTaskRequest,
  LLMTaskResponse,
  OptimizationPlanningInput,
  OptimizationPlanningOutput,
  QuestionGenerationInput,
  QuestionGenerationOutput
} from '@geo-platform/shared-types';
import { LLMOrchestrationService } from './llm-orchestration.service';

@Controller('brands/:brandId/llm/tasks')
export class LLMController {
  constructor(private readonly llmService: LLMOrchestrationService) {}

  @Post('question-generation')
  async generateQuestions(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: LLMTaskRequest<QuestionGenerationInput>
  ): Promise<ApiResponse<LLMTaskResponse<QuestionGenerationOutput>>> {
    return success(await this.llmService.runTask<QuestionGenerationInput, QuestionGenerationOutput>(request.context.userId, brandId, 'question_generation', body));
  }

  @Post('answer-analysis')
  async analyzeAnswer(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: LLMTaskRequest<AnswerAnalysisInput>
  ): Promise<ApiResponse<LLMTaskResponse<AnalysisResultInput>>> {
    return success(await this.llmService.runTask<AnswerAnalysisInput, AnalysisResultInput>(request.context.userId, brandId, 'answer_analysis', body));
  }

  @Post('content-generation')
  async generateContent(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: LLMTaskRequest<LLMContentGenerationInput>
  ): Promise<ApiResponse<LLMTaskResponse<LLMContentGenerationOutput>>> {
    return success(await this.llmService.runTask<LLMContentGenerationInput, LLMContentGenerationOutput>(request.context.userId, brandId, 'content_generation', body));
  }

  @Post('optimization-planning')
  async planOptimization(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: LLMTaskRequest<OptimizationPlanningInput>
  ): Promise<ApiResponse<LLMTaskResponse<OptimizationPlanningOutput>>> {
    return success(await this.llmService.runTask<OptimizationPlanningInput, OptimizationPlanningOutput>(request.context.userId, brandId, 'optimization_planning', body));
  }

  @Get(':jobId')
  async getTask(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('jobId') jobId: string
  ): Promise<ApiResponse<LLMTaskResponse<null>>> {
    const task = await this.llmService.getTask(request.context.userId, brandId, jobId);

    if (!task) {
      throw new NotFoundException('AI 任务不存在或当前用户无权访问');
    }

    return success(task);
  }
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}
