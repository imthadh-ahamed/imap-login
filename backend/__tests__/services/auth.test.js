import { jest } from "@jest/globals";
import { generateAuthUrl, handleOAuthCallback, refreshAccessToken } from "../../src/services/auth.js";

// Mock dependencies
jest.mock("../../src/config/oauth.js", () => ({
  default: {
    generateAuthUrl: jest.fn(),
    getToken: jest.fn(),
    setCredentials: jest.fn(),
    getAccessToken: jest.fn(),
  },
}));

jest.mock("../../src/models/index.js", () => ({
  User: {
    upsert: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("../../src/utils/logger.js", () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Auth Service", () => {
  describe("generateAuthUrl", () => {
    it("should generate OAuth URL", () => {
      const mockUrl = "https://accounts.google.com/oauth2/auth?...";
      const oauth2Client = require("../../src/config/oauth.js").default;
      oauth2Client.generateAuthUrl.mockReturnValue(mockUrl);

      const url = generateAuthUrl();

      expect(url).toBe(mockUrl);
      expect(oauth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: "offline",
        prompt: "consent",
        scope: [
          "https://mail.google.com/",
          "profile",
          "email",
        ],
      });
    });
  });

  describe("handleOAuthCallback", () => {
    it("should throw error if code is missing", async () => {
      await expect(handleOAuthCallback(null)).rejects.toThrow(
        "Missing authorization code"
      );
    });

    it("should handle OAuth callback successfully", async () => {
      const mockCode = "test-code";
      const mockTokens = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        id_token: Buffer.from(
          JSON.stringify({
            header: {},
            payload: { email: "test@example.com" },
            signature: "",
          })
        ).toString("base64"),
      };

      const oauth2Client = require("../../src/config/oauth.js").default;
      const User = require("../../src/models/index.js").User;

      oauth2Client.getToken.mockResolvedValue({ tokens: mockTokens });
      User.upsert.mockResolvedValue([{}, true]);

      const result = await handleOAuthCallback(mockCode);

      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("redirectUrl");
      expect(oauth2Client.getToken).toHaveBeenCalledWith(mockCode);
    });
  });
});
