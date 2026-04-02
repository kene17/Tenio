import {
  claimDetailSchema,
  claimSummarySchema,
  queueItemSchema
} from "@tenio/domain";

import {
  applyClaimAction,
  applyRetrievalOutcome,
  authenticateUser,
  claimNextRetrievalJob,
  createClaim,
  failRetrievalJob,
  getClaimDetail,
  getEvidenceArtifactContent,
  getPerformanceMetrics,
  getPilotClaimDetail,
  getResultDetail,
  getValidatedSession,
  listAuditEvents,
  listClaims,
  listClaimsList,
  listPayerConfigurations,
  listPilotQueueItems,
  listQueue,
  listResultSummaries,
  enqueueRetrievalJob
} from "../domain/store.js";

export class WorkflowService {
  async getQueue() {
    return queueItemSchema.array().parse(await listQueue());
  }

  async getClaims() {
    return claimSummarySchema.array().parse(await listClaims());
  }

  async getClaimsList() {
    return listClaimsList();
  }

  async getClaimDetail(claimId: string) {
    const claim = await getClaimDetail(claimId);

    if (!claim) {
      return null;
    }

    return claimDetailSchema.parse(claim);
  }

  async getPilotQueue() {
    return listPilotQueueItems();
  }

  async getPilotClaimDetail(claimId: string) {
    return getPilotClaimDetail(claimId);
  }

  async getResults() {
    return listResultSummaries();
  }

  async getResultDetail(resultId: string) {
    return getResultDetail(resultId);
  }

  async getEvidenceArtifactContent(artifactId: string) {
    return getEvidenceArtifactContent(artifactId);
  }

  async getAuditLog() {
    return listAuditEvents();
  }

  async getPerformanceMetrics() {
    return getPerformanceMetrics();
  }

  async getPayerConfigurations() {
    return listPayerConfigurations();
  }

  async authenticateUser(email: string, password: string) {
    return authenticateUser(email, password);
  }

  async getValidatedSession(sessionId: string) {
    return getValidatedSession(sessionId);
  }

  async createClaim(...args: Parameters<typeof createClaim>) {
    return createClaim(...args);
  }

  async applyClaimAction(...args: Parameters<typeof applyClaimAction>) {
    return applyClaimAction(...args);
  }

  async enqueueRetrievalJob(...args: Parameters<typeof enqueueRetrievalJob>) {
    return enqueueRetrievalJob(...args);
  }

  async claimNextRetrievalJob(...args: Parameters<typeof claimNextRetrievalJob>) {
    return claimNextRetrievalJob(...args);
  }

  async failRetrievalJob(...args: Parameters<typeof failRetrievalJob>) {
    return failRetrievalJob(...args);
  }

  async applyRetrievalOutcome(...args: Parameters<typeof applyRetrievalOutcome>) {
    return applyRetrievalOutcome(...args);
  }
}
