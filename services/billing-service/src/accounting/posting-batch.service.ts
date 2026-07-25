import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PostingEngineService, JournalPostInput } from "./posting-engine.service";

@Injectable()
export class PostingBatchService {
  private readonly logger = new Logger(PostingBatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postingEngine: PostingEngineService,
  ) {}

  async processBatch(organizationId: number, batchCode: string, inputs: JournalPostInput[]): Promise<any> {
    this.logger.log(`Processing Posting Batch ${batchCode} with ${inputs.length} entries`);

    const batch = await this.prisma.postingBatch.create({
      data: {
        organizationId,
        batchCode,
        lifecycle: "PROCESSING",
        startedAt: new Date(),
      },
    });

    const failures: { index: number; error: string; sourceType: string; sourceId: number }[] = [];
    const postedJournalIds: number[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      try {
        const journal = await this.postingEngine.postJournal(input);
        
        // Link journal to batch
        await this.prisma.journal.update({
          where: { id: journal.id },
          data: { batchId: batch.id },
        });

        postedJournalIds.push(journal.id);
      } catch (err: any) {
        this.logger.error(`Failed to post batch item index ${i} (${input.sourceType} #${input.sourceId}): ${err.message}`);
        failures.push({
          index: i,
          error: err.message,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        });
      }
    }

    const completed = failures.length === 0;
    const finalStatus = completed ? "COMPLETED" : failures.length === inputs.length ? "FAILED" : "PARTIALLY_COMPLETED";

    await this.prisma.postingBatch.update({
      where: { id: batch.id },
      data: {
        lifecycle: finalStatus,
        completedAt: new Date(),
        failureLog: failures.length > 0 ? JSON.stringify(failures) : null,
      },
    });

    return {
      batchId: batch.id,
      status: finalStatus,
      postedCount: postedJournalIds.length,
      failedCount: failures.length,
      failures,
    };
  }
}
