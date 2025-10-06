import React, {useState} from 'react'
import {DollarSign, Send} from 'lucide-react'

const Login = ({ onLogin, showToast }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simple Mock Login Logic:
        const lowerEmail = email.toLowerCase();
        let role = null;
        
        // Mock Owner: owner@shop.com / password
        if (lowerEmail === 'owner@shop.com' && password === 'password') {
            role = USER_ROLES.OWNER;
        } 
        // Mock Cashier: cashier@shop.com / password
        else if (lowerEmail === 'cashier@shop.com' && password === 'password') {
            role = USER_ROLES.CASHIER;
        }

        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 800)); 

        if (role) {
            onLogin({ id: lowerEmail.split('@')[0], role });
            showToast(`Logged in successfully as ${role.charAt(0).toUpperCase() + role.slice(1)}!`, 'success');
        } else {
            showToast('Invalid credentials. Try owner@shop.com / password', 'error');
            setPassword('');
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-8">
                    <DollarSign className="w-10 h-10 mx-auto text-indigo-600 dark:text-indigo-400" />
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-4">Welcome to Pocket POS</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to continue to your MERN shop management system.</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition"
                            placeholder="owner@shop.com or cashier@shop.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition"
                            placeholder="password"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition font-semibold shadow-lg disabled:bg-indigo-400"
                    >
                        {loading ? (
                            <Loader className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 mr-2" />
                        )}
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                        Use **owner@shop.com** or **cashier@shop.com** with password **password** for testing.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login