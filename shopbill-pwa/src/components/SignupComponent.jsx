import React from 'react'

const SignupComponent = ({ onSwitchToLogin, onBackToHome }) => (
    <>
        <h2 className="text-3xl font-extrabold text-white text-center mb-6">
            Get Started Free
        </h2>
        <form className="space-y-4">
            {/* Email Input */}
            <input
                type="email"
                placeholder="Email Address"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                required
            />
            
            {/* Phone Number Input - NEW */}
            <input
                type="tel" // Use type="tel" for phone numbers
                placeholder="Phone Number"
                // Added a basic pattern for numbers, feel free to update for specific formats
                pattern="[0-9]{10,15}" 
                title="Phone number must be between 10 and 15 digits"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                required
            />
            
            {/* Password Input (Focus ring updated for consistency) */}
            <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
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
                By clicking Create Account, you agree to our <strong>Terms and Conditions</strong>.
            </p>
        </form>

        {/* Switch View */}
        <p className="text-center text-gray-400 mt-6 pt-4 border-t border-gray-700/50">
            Already have an account?
            <button
                onClick={onSwitchToLogin}
                className="ml-2 text-teal-400 hover:text-teal-300 font-bold transition duration-150"
            >
                Log In
            </button>
        </p>

        {/* Back to Landing Page */}
        <div className="text-center text-sm mt-8">
            <button
                onClick={onBackToHome}
                className="text-gray-500 hover:text-indigo-400 transition duration-150 flex items-center mx-auto"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
                Back to Home
            </button>
        </div>
    </>
);

export default SignupComponent