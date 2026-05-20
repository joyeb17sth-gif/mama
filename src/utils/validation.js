import { z } from 'zod';
import DOMPurify from 'dompurify';

// Helper to sanitize strings before validation to prevent stored XSS
export const sanitize = (val) => {
    if (typeof val === 'string') {
        return DOMPurify.sanitize(val.trim());
    }
    return val;
};

// ----------------------------------------------------
// Core Schemas
// ----------------------------------------------------

export const ContractorSchema = z.object({
    contractorId: z.string().min(1, "Contractor ID is required").max(100).transform(sanitize),
    name: z.string().min(2, "Name must be at least 2 characters").max(100).transform(sanitize),
    phone: z.string().max(50).optional().transform(v => v ? sanitize(v) : v),
    email: z.string().email("Invalid email format").max(150).optional().or(z.literal('')).transform(v => v ? sanitize(v) : v),
    role: z.string().max(100).optional().transform(v => v ? sanitize(v) : v),
    bsb: z.string().regex(/^[0-9]{6}$/, "BSB must be exactly 6 digits").optional().or(z.literal('')),
    accountNumber: z.string().min(5, "Account number must be at least 5 digits").max(20).regex(/^[0-9]+$/, "Account number must contain only numbers").optional().or(z.literal('')),
    accountName: z.string().max(100).optional().transform(v => v ? sanitize(v) : v),
    status: z.enum(['active', 'inactive']).default('active'),
    isReferred: z.boolean().default(false),
    referralName: z.string().max(100).optional().transform(v => v ? sanitize(v) : v),
    customRates: z.array(z.any()).optional()
});

export const SiteSchema = z.object({
    siteName: z.string().min(2, "Site Name must be at least 2 characters").max(100).transform(sanitize),
    clientName: z.string().max(100).optional().transform(v => v ? sanitize(v) : v),
    cleaningType: z.enum(['housekeeping', 'cleaning']).default('housekeeping'),
    payrollCycle: z.enum(['weekly', 'fortnightly', 'custom']).default('weekly'),
    budgetedHours: z.number().or(z.string().transform(v => Number(v) || 0)),
    budgetedAmount: z.number().or(z.string().transform(v => Number(v) || 0)),
    isTrainingSite: z.boolean().default(false),
    isSubSite: z.boolean().default(false),
    parentSiteId: z.string().optional().or(z.literal('')),
    codeRates: z.array(z.any()).optional()
});

export const AuthSchema = z.object({
    email: z.string().email("Invalid email format").transform(sanitize),
    password: z.string().min(6, "Password must be at least 6 characters")
});

export const TimesheetSchema = z.object({
    id: z.string().min(1).transform(sanitize),
    siteId: z.string().min(1).transform(sanitize),
    siteName: z.string().min(1).transform(sanitize),
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    entries: z.array(z.any()), // Detailed validation of the entries structure could be added here
    status: z.enum(['draft', 'done']).default('draft'),
    createdAt: z.string(),
    updatedAt: z.string()
});

// Generic numeric validation for inline form fields
export const NumberSchema = z.number().nonnegative("Value cannot be negative");

// ----------------------------------------------------
// Validation Helpers
// ----------------------------------------------------

export const validateData = (schema, data) => {
    try {
        const validData = schema.parse(data);
        return { success: true, data: validData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Extract the first error message
            const issues = error.errors || error.issues || [];
            const firstError = issues[0];
            if (firstError) {
                return { 
                    success: false, 
                    error: `${firstError.path.join('.')} - ${firstError.message}` 
                };
            }
        }
        return { success: false, error: "Validation failed" };
    }
};
