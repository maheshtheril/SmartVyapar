import { describe, it } from "node:test";
import assert from "node:assert";
import { parseIncomingMetaMessage, processCustomerCommand } from "../src/lib/whatsapp-bot";

describe("Two-Way WhatsApp Webhook Bot Engine", () => {
  describe("Meta Webhook Payload Parser (parseIncomingMetaMessage)", () => {
    it("should extract sender phone, message text, and timestamp from standard text message", () => {
      const mockMetaPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "109823746",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "919876543210",
                    phone_number_id: "1029384756",
                  },
                  messages: [
                    {
                      from: "919845012345",
                      id: "wamid.HBgMOTExOTg0NTAxMjM0NQ==",
                      timestamp: "1726750000",
                      text: {
                        body: "BILL",
                      },
                      type: "text",
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const parsed = parseIncomingMetaMessage(mockMetaPayload);
      assert.notStrictEqual(parsed, null);
      assert.strictEqual(parsed?.senderPhone, "919845012345");
      assert.strictEqual(parsed?.text, "BILL");
      assert.strictEqual(parsed?.messageId, "wamid.HBgMOTExOTg0NTAxMjM0NQ==");
    });

    it("should parse button replies from interactive messages", () => {
      const mockButtonPayload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: "919845012345",
                      id: "wamid.button123",
                      timestamp: "1726750010",
                      type: "interactive",
                      interactive: {
                        type: "button_reply",
                        button_reply: {
                          id: "btn_balance",
                          title: "BALANCE",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const parsed = parseIncomingMetaMessage(mockButtonPayload);
      assert.notStrictEqual(parsed, null);
      assert.strictEqual(parsed?.text, "BALANCE");
    });

    it("should return null for delivery status updates (sent, delivered, read receipts)", () => {
      const mockStatusPayload = {
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    {
                      id: "wamid.test",
                      status: "delivered",
                      timestamp: "1726750020",
                      recipient_id: "919845012345",
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const parsed = parseIncomingMetaMessage(mockStatusPayload);
      assert.strictEqual(parsed, null);
    });
  });

  describe("Command Intent Recognition (processCustomerCommand dryRun)", () => {
    it("should recognize greeting and menu keywords (HI, HELLO, MENU)", async () => {
      const result = await processCustomerCommand("9845012345", "HI", true);
      assert.strictEqual(result.intent, "GREETING");
      assert.strictEqual(result.replyText.includes("Namaste"), true);
      assert.strictEqual(result.replyText.includes("BILL"), true);
      assert.strictEqual(result.replyText.includes("BALANCE"), true);
    });

    it("should recognize balance & khata query keywords (BALANCE, DUES, KHATA)", async () => {
      const result = await processCustomerCommand("9845012345", "BALANCE", true);
      assert.strictEqual(result.intent, "BALANCE");
      assert.strictEqual(result.replyText.includes("Khata"), true);
    });

    it("should recognize latest bill query keywords (BILL, INVOICE, RECEIPT)", async () => {
      const result = await processCustomerCommand("9845012345", "BILL", true);
      assert.strictEqual(result.intent, "LATEST_BILL");
    });

    it("should recognize payment link query keywords (PAY, UPI, QR)", async () => {
      const result = await processCustomerCommand("9845012345", "PAY", true);
      assert.strictEqual(result.intent, "PAYMENT_LINK");
      assert.strictEqual(result.replyText.includes("upi://pay"), true);
    });

    it("should return helpful fallback instructions for unrecognized keywords", async () => {
      const result = await processCustomerCommand("9845012345", "WHAT IS THE WEATHER", true);
      assert.strictEqual(result.intent, "UNKNOWN");
      assert.strictEqual(result.replyText.includes("didn't recognize"), true);
      assert.strictEqual(result.replyText.includes("BILL"), true);
    });
  });
});
