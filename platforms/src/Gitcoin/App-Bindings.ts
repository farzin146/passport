import { PlatformOptions, ProviderPayload } from "../types";
import { Platform } from "../utils/platform";

export class GitcoinPlatform extends Platform {
  platformId = "Gitcoin";
  path = "github";
  clientId: string = null;
  redirectUri: string = null;
  bannerContent = "The Gitcoin Grant stamp only recognizes contributions during Gitcoin Grants rounds.";

  constructor(options: PlatformOptions = {}) {
    super();
    this.clientId = options.clientId as string;
    this.redirectUri = options.redirectUri as string;
  }

  async getOAuthUrl(state: string): Promise<string> {
    const githubUrl = await Promise.resolve(
      `https://github.com/login/oauth/authorize?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&state=${state}`
    );
    return githubUrl;
  }
}
