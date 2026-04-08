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
  commitClaimImport,
  createClaim,
  completeAgentToolStep,
  exportResults,
  failRetrievalJob,
  getClaimDetail,
  getEvidenceArtifactContent,
  getPerformanceMetrics,
  getPilotClaimDetail,
  getReviewPolicyForClaim,
  getResultDetail,
  getValidatedSession,
  listAuditEvents,
  listClaims,
  listClaimsList,
  listPayerConfigurations,
  listPilotQueueItems,
  listQueue,
  listResultSummaries,
  previewClaimImport,
  heartbeatAgentRun,
  recordAgentTerminalStep,
  startAgentToolStep,
  updatePayerConfigurationPolicy,
  enqueueRetrievalJob
} from "../domain/store.js";
import type { ImportProfileId, RawImportRow } from "../import/pms/index.js";

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

  async exportResults(...args: Parameters<typeof exportResults>) {
    return exportResults(...args);
  }

  async getResultDetail(resultId: string) {
    return getResultDetail(resultId);
  }

  async getEvidenceArtifactContent(artifactId: string, organizationId: string) {
    return getEvidenceArtifactContent(artifactId, organizationId);
  }

  async getAuditLog() {
    return listAuditEvents();
  }

  async getPerformanceMetrics() {
    return getPerformanceMetrics();
  }

  async getPayerConfigurations(organizationId?: string) {
    return listPayerConfigurations(organizationId);
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

  async getReviewPolicyForClaim(...args: Parameters<typeof getReviewPolicyForClaim>) {
    return getReviewPolicyForClaim(...args);
  }

  async previewClaimImport(
    rows: RawImportRow[],
    actor: Parameters<typeof previewClaimImport>[1],
    importProfile?: ImportProfileId
  ) {
    return previewClaimImport(rows, actor, importProfile);
  }

  async commitClaimImport(
    rows: RawImportRow[],
    actor: Parameters<typeof commitClaimImport>[1],
    importProfile?: ImportProfileId
  ) {
    return commitClaimImport(rows, actor, importProfile);
  }

  async updatePayerConfigurationPolicy(
    ...args: Parameters<typeof updatePayerConfigurationPolicy>
  ) {
    return updatePayerConfigurationPolicy(...args);
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

  async heartbeatAgentRun(...args: Parameters<typeof heartbeatAgentRun>) {
    return heartbeatAgentRun(...args);
  }

  async startAgentToolStep(...args: Parameters<typeof startAgentToolStep>) {
    return startAgentToolStep(...args);
  }

  async completeAgentToolStep(...args: Parameters<typeof completeAgentToolStep>) {
    return completeAgentToolStep(...args);
  }

  async recordAgentTerminalStep(...args: Parameters<typeof recordAgentTerminalStep>) {
    return recordAgentTerminalStep(...args);
  }

  async failRetrievalJob(...args: Parameters<typeof failRetrievalJob>) {
    return failRetrievalJob(...args);
  }

  async applyRetrievalOutcome(...args: Parameters<typeof applyRetrievalOutcome>) {
    return applyRetrievalOutcome(...args);
  }
}
