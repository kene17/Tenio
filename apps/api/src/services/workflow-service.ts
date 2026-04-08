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
  getAccountSummary,
  getClaimDetail,
  getEvidenceArtifactContent,
  getOnboardingState,
  getPerformanceMetrics,
  getPilotClaimDetail,
  getReviewPolicyForClaim,
  getResultDetail,
  getStatusSummary,
  getValidatedSession,
  inviteUserToOrganization,
  listAuditEvents,
  listClaims,
  listClaimsList,
  listPayerConfigurations,
  listPilotQueueItems,
  listQueue,
  listResultSummaries,
  listUsersByOrganization,
  previewClaimImport,
  heartbeatAgentRun,
  markClaimDetailOpenedForOnboarding,
  removeUserFromOrganization,
  recordAgentTerminalStep,
  startAgentToolStep,
  updateOnboardingState,
  updatePayerConfigurationPolicy,
  enqueueRetrievalJob
} from "../domain/store.js";
import type { ImportProfileId, RawImportRow } from "../import/pms/index.js";

export class WorkflowService {
  async getQueue(organizationId?: string) {
    return queueItemSchema.array().parse(await listQueue(organizationId));
  }

  async getClaims(organizationId?: string) {
    return claimSummarySchema.array().parse(await listClaims(organizationId));
  }

  async getClaimsList(organizationId?: string) {
    return listClaimsList(organizationId);
  }

  async getClaimDetail(claimId: string, organizationId?: string) {
    const claim = await getClaimDetail(claimId, organizationId);

    if (!claim) {
      return null;
    }

    return claimDetailSchema.parse(claim);
  }

  async getPilotQueue(organizationId?: string) {
    return listPilotQueueItems(organizationId);
  }

  async getPilotClaimDetail(claimId: string, organizationId?: string) {
    return getPilotClaimDetail(claimId, organizationId);
  }

  async getResults(organizationId?: string) {
    return listResultSummaries(organizationId);
  }

  async exportResults(...args: Parameters<typeof exportResults>) {
    return exportResults(...args);
  }

  async getResultDetail(resultId: string, organizationId?: string) {
    return getResultDetail(resultId, organizationId);
  }

  async getEvidenceArtifactContent(
    artifactId: string,
    organizationId: string,
    actor?: Parameters<typeof getEvidenceArtifactContent>[2]
  ) {
    return getEvidenceArtifactContent(artifactId, organizationId, actor);
  }

  async getAuditLog(organizationId?: string) {
    return listAuditEvents(organizationId);
  }

  async getPerformanceMetrics(organizationId?: string) {
    return getPerformanceMetrics(organizationId);
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

  async getUsers(organizationId: string) {
    return listUsersByOrganization(organizationId);
  }

  async inviteUser(...args: Parameters<typeof inviteUserToOrganization>) {
    return inviteUserToOrganization(...args);
  }

  async removeUser(...args: Parameters<typeof removeUserFromOrganization>) {
    return removeUserFromOrganization(...args);
  }

  async getAccount(organizationId: string) {
    return getAccountSummary(organizationId);
  }

  async getStatus(organizationId: string) {
    return getStatusSummary(organizationId);
  }

  async getOnboardingState(...args: Parameters<typeof getOnboardingState>) {
    return getOnboardingState(...args);
  }

  async updateOnboardingState(...args: Parameters<typeof updateOnboardingState>) {
    return updateOnboardingState(...args);
  }

  async markClaimDetailOpenedForOnboarding(
    ...args: Parameters<typeof markClaimDetailOpenedForOnboarding>
  ) {
    return markClaimDetailOpenedForOnboarding(...args);
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
