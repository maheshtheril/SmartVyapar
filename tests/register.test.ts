import test from "node:test";
import assert from "node:assert/strict";
import {
  RegisterTenantSchema,
  slugify,
  getStateFromGstin,
  INDIAN_STATES,
} from "../src/lib/schemas/register.js";

test("Self-Serve Merchant Registration & Onboarding (/register)", async (t) => {
  await t.test("Slug Generation Utility", () => {
    assert.equal(slugify("Ziona Electricals & Hardware"), "ziona-electricals-hardware");
    assert.equal(slugify("  Kerala Spices  Pvt Ltd  "), "kerala-spices-pvt-ltd");
    assert.equal(slugify("Shop #12, Market Road!"), "shop-12-market-road");
  });

  await t.test("GSTIN State Code Auto-Detection", () => {
    // Kerala (32)
    const kerala = getStateFromGstin("32AAAAA0000A1Z5");
    assert.deepEqual(kerala, { stateCode: "32", stateName: "Kerala" });

    // Maharashtra (27)
    const mh = getStateFromGstin("27ABCDE1234F1Z5");
    assert.deepEqual(mh, { stateCode: "27", stateName: "Maharashtra" });

    // Karnataka (29)
    const ka = getStateFromGstin("29XYZAB5678C1Z2");
    assert.deepEqual(ka, { stateCode: "29", stateName: "Karnataka" });

    // Delhi (07)
    const dl = getStateFromGstin("07DEFGH9012J1Z8");
    assert.deepEqual(dl, { stateCode: "07", stateName: "Delhi" });

    // Null or invalid input
    assert.equal(getStateFromGstin(null), null);
    assert.equal(getStateFromGstin(""), null);
    assert.equal(getStateFromGstin("99"), null); // Undefined code
  });

  await t.test("Registration Payload Validation (RegisterTenantSchema)", async (t) => {
    await t.test("should accept a valid complete merchant onboarding payload", () => {
      const valid = {
        businessName: "Kochi Retail Hub",
        ownerName: "Rahul Sharma",
        email: "Rahul@KochiHub.in",
        phone: "+91 98765 43210",
        password: "secretpassword123",
        gstin: "32AAAAA0000A1Z5",
        stateCode: "32",
        stateName: "Kerala",
        upiId: "9876543210@upi",
        address: "MG Road, Ernakulam",
        isComposition: false,
      };

      const result = RegisterTenantSchema.safeParse(valid);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.email, "rahul@kochihub.in"); // Lowercased
        assert.equal(result.data.phone, "9876543210"); // Sanitized 10-digit
        assert.equal(result.data.businessName, "Kochi Retail Hub");
      }
    });

    await t.test("should reject registration with password shorter than 6 characters", () => {
      const invalid = {
        businessName: "Kochi Retail Hub",
        ownerName: "Rahul Sharma",
        email: "rahul@kochihub.in",
        phone: "9876543210",
        password: "123",
        upiId: "shop@okaxis",
      };

      const result = RegisterTenantSchema.safeParse(invalid);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) =>
            i.message.includes("Password must be at least 6 characters")
          )
        );
      }
    });

    await t.test("should reject registration with invalid Indian mobile number", () => {
      const invalid = {
        businessName: "Kochi Retail Hub",
        ownerName: "Rahul Sharma",
        email: "rahul@kochihub.in",
        phone: "12345", // Less than 10 digits
        password: "securepassword",
        upiId: "shop@okaxis",
      };

      const result = RegisterTenantSchema.safeParse(invalid);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) =>
            i.message.includes("Must be a valid 10-digit mobile number")
          )
        );
      }
    });

    await t.test("should reject registration with invalid UPI ID format", () => {
      const invalid = {
        businessName: "Kochi Retail Hub",
        ownerName: "Rahul Sharma",
        email: "rahul@kochihub.in",
        phone: "9876543210",
        password: "securepassword",
        upiId: "not-a-upi-vpa",
      };

      const result = RegisterTenantSchema.safeParse(invalid);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) =>
            i.message.includes("Must be a valid UPI VPA format")
          )
        );
      }
    });
  });
});
