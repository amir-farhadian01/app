/**
 * Business Verification Service
 * 
 * This service provides methods to verify business information such as 
 * Registration Number and License Number against Official Business Names.
 * 
 * Recommended APIs for production:
 * - Compliancely (https://compliancely.com) - Good for US/Global TIN/EIN check.
 * - Signzy (https://signzy.com) - Global business verification.
 * - Global Database (https://globaldatabase.com) - Comprehensive business data API.
 */

export interface VerificationResult {
  isValid: boolean;
  message: string;
  details?: any;
}

export interface VerificationConfig {
  strictLookup?: boolean;
}

/**
 * Verifies if the business name matches the provided registration and license numbers.
 * Supports simulation of "official" matching logic.
 */
export async function verifyBusinessEntity(
  businessName: string,
  registrationNumber: string,
  businessLicense: string,
  config: VerificationConfig = { strictLookup: true }
): Promise<VerificationResult> {
  // If strict lookup is disabled, skip matching logic
  if (config.strictLookup === false) {
    return {
      isValid: true,
      message: "Business details accepted (Strict Lookup Disabled)."
    };
  }

  // SIMULATION: In production, replace this with a real fetch call.
  console.log(`[Verification] Validating: ${businessName}, ${registrationNumber}, ${businessLicense}`);

  await new Promise(resolve => setTimeout(resolve, 1500));

  // Pattern Matching Simulation
  const regPattern = /^[0-9]{6,10}$/; // Expect 6-10 digits
  const licensePattern = /^[A-Z]{2}-[0-9]{4,8}$/; // Expect prefix XX-NNNN

  if (!regPattern.test(registrationNumber)) {
    return {
      isValid: false,
      message: "Invalid Registration Number format. Expected 6-10 digits."
    };
  }

  // Matching Logic simulation based on inputs
  // Let's say if the business name is "Technical" and Reg starts with "123", it's a match.
  // Otherwise, it's "mismatched" for demo purposes.
  
  const knownRegistries: {[key: string]: string[]} = {
    'neighborly': ['123456', '223344'],
    'technical': ['123446', '654321'],
    'amir': ['556677', '889900']
  };

  const normalizedName = businessName.toLowerCase();
  const matchedKey = Object.keys(knownRegistries).find(key => normalizedName.includes(key));

  if (matchedKey && !knownRegistries[matchedKey].includes(registrationNumber)) {
    return {
      isValid: false,
      message: `Data Mismatch: Registration number ${registrationNumber} is not associated with ${businessName} in our records.`
    };
  }

  if (normalizedName.includes('fail')) {
    return {
      isValid: false,
      message: "External verification service reported a 'No Match' for this entity."
    };
  }

  return {
    isValid: true,
    message: "Business verification successful. Identity and Registration match."
  };
}
