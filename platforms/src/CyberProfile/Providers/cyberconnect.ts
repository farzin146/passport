// ----- Types
import { ProviderExternalVerificationError, type Provider, type ProviderOptions } from "../../types";
import type { ProviderContext, RequestPayload, VerifiedPayload } from "@gitcoin/passport-types";

// ----- Ethers library
import { Contract, BigNumber } from "ethers";
import { StaticJsonRpcProvider } from "@ethersproject/providers";

// CyberProfile Proxy Contract Address
const CYBERPROFILE_PROXY_CONTRACT_ADDRESS = "0x2723522702093601e6360CAe665518C4f63e9dA6";

// CyberProfile Proxy ABI functions needed to get the length of primary profile handle
const CYBERPROFILE_PROXY_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getPrimaryProfile",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "profileId", type: "uint256" }],
    name: "getHandleByProfileId",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

export type CyberConnextContext = ProviderContext & {
  cyberConnect?: {
    handle?: string;
  };
};

export interface CyberProfileContract extends Contract {
  getPrimaryProfile?(address: string): Promise<BigNumber>;
  getHandleByProfileId?(id: number): Promise<string>;
  // add other methods as needed
}

type CyberProfileBaseProviderOptions = {
  type: string;
  maxLength: number;
};

class CyberProfileBaseProvider implements Provider {
  type: string;
  maxLength: number;

  // construct the provider instance with supplied options
  constructor(options: CyberProfileBaseProviderOptions) {
    this.type = options.type;
    this.maxLength = options.maxLength;
  }

  // Verify that address defined in the payload has a handle length <= 6 and > 0
  async verify(payload: RequestPayload, context: ProviderContext): Promise<VerifiedPayload> {
    const errors = [];
    let valid = false,
      record = {};

    const address = payload.address.toString().toLowerCase();
    const userHandle = await this.getPrimaryHandle(address, context);
    if (userHandle) {
      const lengthOfPrimaryHandle = userHandle.length;

      if (userHandle.length <= this.maxLength) {
        record = { userHandle };
        valid = true;
      } else {
        errors.push(
          `The length of your primary handle is ${lengthOfPrimaryHandle}, which does not qualify for this stamp data point.`
        );
      }
    } else {
      errors.push("No primary profile handle found");
    }

    return {
      valid,
      record,
      errors,
    };
  }

  async getPrimaryHandle(userAddress: string, context: CyberConnextContext): Promise<string> {
    try {
      if (context.cyberConnect?.handle === undefined) {
        if (!context.cyberConnect) context.cyberConnect = {};
        context.cyberConnect.handle = "";

        const provider: StaticJsonRpcProvider = new StaticJsonRpcProvider(
          process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/"
        );

        const contract: CyberProfileContract = new Contract(
          CYBERPROFILE_PROXY_CONTRACT_ADDRESS,
          CYBERPROFILE_PROXY_ABI,
          provider
        );

        // get primary profile id
        const profileId: BigNumber = await contract.getPrimaryProfile(userAddress);

        // if no primary profile id is found (profileId == 0), return 0
        if (!profileId.isZero()) {
          // get primary profile handle
          const handle: string = await contract.getHandleByProfileId(profileId.toNumber());

          context.cyberConnect.handle = handle;
        }
      }
    } catch (e: unknown) {
      throw new ProviderExternalVerificationError(`Error getting primary handle from CyberProfile: ${String(e)}`);
    }

    return context.cyberConnect.handle;
  }
}

export class CyberProfilePremiumProvider extends CyberProfileBaseProvider {
  constructor() {
    super({
      type: "CyberProfilePremium",
      maxLength: 6,
    });
  }
}

export class CyberProfilePaidProvider extends CyberProfileBaseProvider {
  constructor() {
    super({
      type: "CyberProfilePaid",
      maxLength: 12,
    });
  }
}
