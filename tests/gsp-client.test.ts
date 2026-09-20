import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateStatutoryArn, authenticateGsp, submitGstr1ToGsp } from "../src/lib/gsp-client";

describe("Direct GSP / NIC API Gateway Engine", () => {
  test("generateStatutoryArn should create valid 15-character GSTN ARN format", () => {
    const arn = generateStatutoryArn("32");
    assert.match(arn, /^AA32\d{4}\d{7}$/, "ARN should match AA + State(2) + MMYY(4) + 7 digits");
    assert.equal(arn.length, 15);
  });

  test("authenticateGsp should issue simulated token in sandbox mode", async () => {
    const token = await authenticateGsp({
      provider: "SANDBOX_SIMULATOR",
      isSandbox: true,
    });
    assert.equal(token.tokenType, "Bearer");
    assert.equal(token.provider, "SANDBOX_SIMULATOR");
    assert.ok(token.accessToken.startsWith("gstn_sim_"));
    assert.ok(token.expiresIn > 0);
  });

  test("submitGstr1ToGsp should reject payload missing GSTIN or fp", async () => {
    const res = await submitGstr1ToGsp(
      { b2b: [] },
      { provider: "SANDBOX_SIMULATOR" }
    );
    assert.equal(res.success, false);
    assert.equal(res.status, "FAILED");
    assert.ok(res.error?.includes("Missing GSTIN"));
  });

  test("submitGstr1ToGsp should accept valid payload and return statutory ARN in sandbox", async () => {
    const validPayload = {
      gstin: "32AAAAA0000A1Z5",
      fp: "092026",
      gt: 50000,
      cur_gt: 50000,
      b2b: [],
      b2cs: [],
      hsn: { data: [] },
      doc_issue: { doc_det: [] },
    };

    const res = await submitGstr1ToGsp(validPayload, {
      provider: "SANDBOX_SIMULATOR",
    });

    assert.equal(res.success, true);
    assert.equal(res.status, "SUBMITTED");
    assert.ok(res.arn?.startsWith("AA32"));
    assert.ok(res.referenceId?.startsWith("REF_"));
    assert.ok(res.filingDate);
  });
});
