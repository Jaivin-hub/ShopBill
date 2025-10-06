import React, { useState } from 'react';
import { DollarSign, Send } from 'lucide-react';

// The actual Login function called by App.js
const Login = ({ onLogin, showToast }) => {
    const [isSignup, setIsSignup] = useState(false);

    // --- Mock Login/Signup Handlers (Simulating API calls) ---
    const handleAuth = (e) => {
        e.preventDefault();
        
        // Use the mockAuth function from App.js to simulate success
        const mockAuth = (userRole) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        user: {
                            id: 'mern-user-12345',
                            role: userRole // Can simulate different roles here
                        }
                    });
                }, 1000); // 1s mock latency
            });
        };

        const formType = isSignup ? 'Signup' : 'Login';
        showToast(`Attempting ${formType}...`, 'info');

        mockAuth(isSignup ? 'cashier' : 'owner') // Simulating Owner on Login, Cashier on Signup for variety
            .then(response => {
                if (response.success) {
                    showToast(`${formType} successful!`, 'success');
                    onLogin(response.user); // Calls the App.js handler
                } else {
                    showToast(`${formType} failed. Please check credentials.`, 'error');
                }
            })
            .catch(error => {
                console.error(error);
                showToast(`An error occurred during ${formType}.`, 'error');
            });
    };

    // --- Sub-Component: Login Form ---
    const LoginForm = () => (
        <>
            <h2 className="text-3xl font-extrabold text-white text-center mb-6">
                Welcome Back
            </h2>
            <form className="space-y-4" onSubmit={handleAuth}>
                {/* Email Input */}
                <input
                    type="email"
                    placeholder="Email Address (Use 'owner@shop.com')"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    defaultValue="owner@shop.com"
                    required
                />
                {/* Password Input */}
                <input
                    type="password"
                    placeholder="Password (e.g., '12345')"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    defaultValue="12345"
                    required
                />

                {/* Forgot Password */}
                <div className="flex justify-end pt-1">
                    <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300 transition duration-150">
                        Forgot Password?
                    </a>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full mt-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.01] duration-300 ease-in-out"
                >
                    Log In
                </button>
            </form>

            {/* Switch View */}
            <p className="text-center text-gray-400 mt-6 pt-4 border-t border-gray-700/50">
                New to Pocket POS?
                <button
                    onClick={() => setIsSignup(true)}
                    className="ml-2 text-teal-400 hover:text-teal-300 font-bold transition duration-150"
                >
                    Create Account
                </button>
            </p>
        </>
    );

    // --- Sub-Component: Signup Form ---
    const SignupForm = () => (
        <>
            <h2 className="text-3xl font-extrabold text-white text-center mb-6">
                Get Started Free
            </h2>
            <form className="space-y-4" onSubmit={handleAuth}>
                {/* Shop Name Input */}
                <input
                    type="text"
                    placeholder="Your Shop Name"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                    required
                />
                {/* Email Input */}
                <input
                    type="email"
                    placeholder="Email Address (Use 'cashier@shop.com')"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    defaultValue="cashier@shop.com"
                    required
                />
                {/* Password Input */}
                <input
                    type="password"
                    placeholder="Password (e.g., '12345')"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    defaultValue="12345"
                    required
                />

                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full mt-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.01] duration-300 ease-in-out"
                >
                    Create Account
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
                >
                    Log In
                </button>
            </p>
        </>
    );

    // Main Login Component Layout
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
            <div className="w-full max-w-md bg-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl shadow-indigo-900/50">
                
                {/* Logo */}
                <div className="text-center mb-8">
                    <DollarSign className="w-12 h-12 text-indigo-500 mx-auto mb-2" />
                    <h1 className="text-3xl font-extrabold text-white">Pocket POS</h1>
                </div>

                {isSignup ? <SignupForm /> : <LoginForm />}

                {/* Note: The 'Back to Home' button logic is handled implicitly by the App.js setting isViewingLogin to false, 
                    but since the form is within the Login view, we don't need the explicit button you had previously. */}
            </div>
        </div>
    );
};

export default Login;