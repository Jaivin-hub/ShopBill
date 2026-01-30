/**
 * Validation utility functions for form fields
 */

// Email validation
export const validateEmail = (email) => {
    if (!email || !email.trim()) {
        return 'Email is required.';
    }
    const trimmedEmail = email.trim();
    if (/\s/.test(trimmedEmail)) {
        return 'Email cannot contain spaces.';
    }
    if (trimmedEmail !== trimmedEmail.toLowerCase()) {
        return 'Email must be entirely lowercase.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
        return 'Please enter a valid email address.';
    }
    return null;
};

// Phone number validation (Indian format - 10 digits)
export const validatePhoneNumber = (phone) => {
    if (!phone || !phone.trim()) {
        return 'Phone number is required.';
    }
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
        return 'Phone number must be exactly 10 digits.';
    }
    // Check if it starts with valid Indian mobile prefix (6-9)
    if (!/^[6-9]/.test(digitsOnly)) {
        return 'Phone number must start with 6, 7, 8, or 9.';
    }
    return null;
};

// International phone number validation (with country code)
export const validateInternationalPhone = (phone) => {
    if (!phone || !phone.trim()) {
        return 'Phone number is required.';
    }
    // Remove spaces and check for international format
    const cleaned = phone.replace(/\s/g, '');
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleaned)) {
        return 'Use international format (e.g., +919876543210).';
    }
    return null;
};

// Name validation
export const validateName = (name, fieldName = 'Name') => {
    if (!name || !name.trim()) {
        return `${fieldName} is required.`;
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
        return `${fieldName} must be at least 2 characters.`;
    }
    if (trimmedName.length > 100) {
        return `${fieldName} must be less than 100 characters.`;
    }
    // Allow letters, spaces, hyphens, apostrophes, and common business name characters
    const nameRegex = /^[a-zA-Z0-9\s\-'.,&()]+$/;
    if (!nameRegex.test(trimmedName)) {
        return `${fieldName} contains invalid characters.`;
    }
    return null;
};

// Shop/Business name validation
export const validateShopName = (name) => {
    if (!name || !name.trim()) {
        return 'Shop name is required.';
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
        return 'Shop name must be at least 3 characters.';
    }
    if (trimmedName.length > 100) {
        return 'Shop name must be less than 100 characters.';
    }
    return null;
};

// GSTIN validation (optional field)
export const validateGSTIN = (gstin) => {
    if (!gstin || !gstin.trim()) {
        return null; // GSTIN is optional
    }
    const trimmedGSTIN = gstin.trim().toUpperCase();
    // GSTIN format: 15 characters, alphanumeric
    const gstinRegex = /^[0-9A-Z]{15}$/;
    if (!gstinRegex.test(trimmedGSTIN)) {
        return 'GSTIN must be 15 characters (alphanumeric).';
    }
    return null;
};

// Number validation (positive)
export const validatePositiveNumber = (value, fieldName = 'Amount') => {
    if (value === '' || value === null || value === undefined) {
        return `${fieldName} is required.`;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
        return `${fieldName} must be a valid number.`;
    }
    if (num < 0) {
        return `${fieldName} cannot be negative.`;
    }
    return null;
};

// Credit limit validation
export const validateCreditLimit = (limit) => {
    if (limit === '' || limit === null || limit === undefined) {
        return 'Credit limit is required.';
    }
    const num = parseFloat(limit);
    if (isNaN(num)) {
        return 'Credit limit must be a valid number.';
    }
    if (num < 0) {
        return 'Credit limit cannot be negative.';
    }
    if (num > 10000000) {
        return 'Credit limit cannot exceed ₹1,00,00,000.';
    }
    return null;
};

// Address validation
export const validateAddress = (address) => {
    if (!address || !address.trim()) {
        return null; // Address is usually optional
    }
    const trimmedAddress = address.trim();
    if (trimmedAddress.length < 5) {
        return 'Address must be at least 5 characters.';
    }
    if (trimmedAddress.length > 500) {
        return 'Address must be less than 500 characters.';
    }
    return null;
};

// Tax ID validation (optional)
export const validateTaxId = (taxId) => {
    if (!taxId || !taxId.trim()) {
        return null; // Tax ID is optional
    }
    const trimmedTaxId = taxId.trim();
    if (trimmedTaxId.length < 3) {
        return 'Tax ID must be at least 3 characters.';
    }
    if (trimmedTaxId.length > 50) {
        return 'Tax ID must be less than 50 characters.';
    }
    return null;
};

// Password validation
export const validatePassword = (password) => {
    if (!password || !password.trim()) {
        return 'Password is required.';
    }
    if (password.length < 6) {
        return 'Password must be at least 6 characters.';
    }
    if (password.length > 128) {
        return 'Password must be less than 128 characters.';
    }
    return null;
};

// Price validation
export const validatePrice = (price) => {
    if (price === '' || price === null || price === undefined) {
        return 'Price is required.';
    }
    const num = parseFloat(price);
    if (isNaN(num)) {
        return 'Price must be a valid number.';
    }
    if (num < 0) {
        return 'Price cannot be negative.';
    }
    if (num > 100000000) {
        return 'Price cannot exceed ₹10,00,00,000.';
    }
    return null;
};

// Quantity validation
export const validateQuantity = (quantity) => {
    if (quantity === '' || quantity === null || quantity === undefined) {
        return 'Quantity is required.';
    }
    const num = parseFloat(quantity);
    if (isNaN(num)) {
        return 'Quantity must be a valid number.';
    }
    if (num < 0) {
        return 'Quantity cannot be negative.';
    }
    if (!Number.isInteger(num)) {
        return 'Quantity must be a whole number.';
    }
    if (num > 1000000) {
        return 'Quantity cannot exceed 10,00,000.';
    }
    return null;
};

