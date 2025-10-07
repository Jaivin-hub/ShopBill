import React, { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import axios from 'axios';
import API from '../config/api';

// --- Sub-Component: Login Form ---
// Updated to accept and display authError
const LoginForm = ({ handleAuth, email, setEmail, password, setPassword, loading, setIsSignup, authError }) => (
    <>
        <h2 className="text-3xl font-extrabold text-white text-center mb-6">
            Welcome Back
        </h2>
        {authError && (
            <div className="p-3 mb-4 text-sm text-red-100 bg-red-800 rounded-lg text-center" role="alert">
                {authError}
            </div>
        )}
        <form className="space-y-4" onSubmit={handleAuth}>
            {/* Email Input */}
            <input
                type="email"
                placeholder="Email Address"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
            />
            {/* Password Input */}
            <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
            />

            {/* Forgot Password - Kept for UX */}
            <div className="flex justify-end pt-1">
                <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300 transition duration-150">
                    Forgot Password?
                </a>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                className="w-full mt-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.01] duration-300 ease-in-out disabled:bg-indigo-400"
                disabled={loading}
            >
                {loading ? 'Logging In...' : 'Log In'}
            </button>
        </form>

        {/* Switch View */}
        <p className="text-center text-gray-400 mt-6 pt-4 border-t border-gray-700/50">
            New to Pocket POS?
            <button
                onClick={() => setIsSignup(true)}
                className="ml-2 text-teal-400 hover:text-teal-300 font-bold transition duration-150"
                disabled={loading}
            >
                Create Account
            </button>
        </p>
    </>
);

// --- Sub-Component: Signup Form ---
const SignupForm = ({ handleAuth, email, setEmail, password, setPassword, phone, setPhone, loading, setIsSignup, authError }) => (
    <>
        <h2 className="text-3xl font-extrabold text-white text-center mb-6">
            Get Started Free
        </h2>
        {authError && (
            <div className="p-3 mb-4 text-sm text-red-100 bg-red-800 rounded-lg text-center" role="alert">
                {authError}
            </div>
        )}
        <form className="space-y-4" onSubmit={handleAuth}>
            {/* Phone Number Input */}
            <input
                type="tel"
                placeholder="Phone Number"
                pattern="[0-9]{10,15}"
                title="Phone number must be between 10 and 15 digits"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                onChange={(e) => setPhone(e.target.value)}
                value={phone}
                required
            />
            {/* Email Input */}
            <input
                type="email"
                placeholder="Email Address"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
            />
            {/* Password Input */}
            <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
            />

            {/* Submit Button */}
            <button
                type="submit"
                className="w-full mt-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.01] duration-300 ease-in-out disabled:bg-indigo-400"
                disabled={loading}
            >
                {loading ? 'Creating Account...' : 'Create Account'}
            </button>
            <p className="text-xs text-gray-400 pt-2 text-center">
                By clicking Create Account, you agree to our Terms and Conditions.
            </p>
        </form>

        {/* Switch View */}
        <p className="text-center text-gray-400 mt-6 pt-4 border-t border-gray-700/50">
            Already have an account?
            <button
                onClick={() => setIsSignup(false)}
                className="ml-2 text-teal-400 hover:text-teal-300 font-bold transition duration-150"
                disabled={loading}
            >
                Log In
            </button>
        </p>
    </>
);


// Main Login Component
const Login = ({ onLogin, onBackToLanding }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false); 
    const [authError, setAuthError] = useState(null); // State for displaying errors

    // NEW: Effect to clear error message when switching forms
    useEffect(() => {
        setAuthError(null);
    }, [isSignup]);


    // Refactored to use real API calls with axios
    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError(null); // Clear previous errors before a new attempt
        const formType = isSignup ? 'Signup' : 'Login';
        const url = isSignup ? API.signup : API.login;
        const authData = isSignup ? { email, password, phone } : { email, password };

        try {
            const response = await axios.post(url, authData);
            
            // Expected response: { token, user: { id, email, role, shopId } }
            if (response.data && response.data.token && response.data.user) {
                
                // CRITICAL UPDATE: Store the token in localStorage
                localStorage.setItem('userToken', response.data.token);
                
                // FIX: Pass the user object and the token as SEPARATE arguments
                onLogin(response.data.user, response.data.token); 
            } else {
                 setAuthError(`${formType} failed. Unexpected response.`);
            }
        } catch (error) {
            console.error(error);
            const errorMessage = error.response?.data?.error || `An unexpected error occurred during ${formType}. Please try again.`;
            setAuthError(errorMessage); // Set error state on API failure
        } finally {
            setLoading(false);
        }
    };


    // Main Login Component Layout
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
            <div className="w-full max-w-md bg-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl shadow-indigo-900/50">

                {/* Logo */}
                <div className="text-center mb-8">
                    <DollarSign className="w-12 h-12 text-indigo-500 mx-auto mb-2" />
                    <h1 className="text-3xl font-extrabold text-white">Pocket POS</h1>
                </div>

                {/* Render the appropriate form, passing props and authError */}
                {isSignup ? (
                    <SignupForm 
                        handleAuth={handleAuth}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        phone={phone}
                        setPhone={setPhone}
                        loading={loading}
                        setIsSignup={setIsSignup}
                        authError={authError} // Pass error state
                    />
                ) : (
                    <LoginForm
                        handleAuth={handleAuth}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        loading={loading}
                        setIsSignup={setIsSignup}
                        authError={authError} // Pass error state
                    />
                )}

                {/* Back Button */}
                <div className="text-center text-sm mt-8">
                    <button
                        onClick={onBackToLanding} // Call the function passed from App.js
                        className="text-gray-500 hover:text-indigo-400 transition duration-150 flex items-center mx-auto"
                        disabled={loading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                        Back to Landing Page
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;