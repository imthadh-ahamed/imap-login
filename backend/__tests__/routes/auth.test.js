import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import authRoutes from "../../src/routes/auth.js";

// Mock controllers
jest.mock("../../src/controllers/authController.js", () => ({
  login: jest.fn((req, res) => res.json({ url: "mock-url" })),
  googleCallback: jest.fn((req, res) => res.redirect("http://localhost:3000/dashboard")),
}));

jest.mock("../../src/middleware/rateLimiter.js", () => ({
  authLimiter: jest.fn((req, res, next) => next()),
}));

jest.mock("../../src/middleware/validation.js", () => ({
  validate: jest.fn(() => (req, res, next) => next()),
  oauthCallbackSchema: {},
}));

const app = express();
app.use("/auth", authRoutes);

describe("Auth Routes", () => {
  describe("GET /auth/login", () => {
    it("should return login URL", async () => {
      const response = await request(app).get("/auth/login");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("url");
    });
  });

  describe("GET /auth/google/callback", () => {
    it("should handle OAuth callback", async () => {
      const response = await request(app)
        .get("/auth/google/callback")
        .query({ code: "test-code" });

      expect(response.status).toBe(302); // Redirect
    });
  });
});
