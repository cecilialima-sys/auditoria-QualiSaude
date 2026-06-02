export class SisapecIntegrationService {
  async syncUsers() {
    return { synced: true, total: 0, source: "mock-sisapec" };
  }

  async syncSectors() {
    return { synced: true, total: 0, source: "mock-sisapec" };
  }

  async validateSisapecToken(token: string) {
    return { valid: token.length > 10, provider: "SISAPEC SSO mock" };
  }

  async getSisapecUserProfile(userId: string) {
    return {
      id: userId,
      name: "",
      roles: [],
      sectors: []
    };
  }

  async sendAuditSummaryToSisapec(summary: unknown) {
    return { delivered: true, receivedAt: new Date().toISOString(), summary };
  }
}
