import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export function LoginPage() {
  const { loginWithPassword, signup } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  // User fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'retailer' | 'wholesaler'>('retailer');
  
  // Organization fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('kirana');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Update default business type when role changes
  useEffect(() => {
    if (role === 'retailer') {
      setBusinessType('kirana');
    } else {
      setBusinessType('fmcg');
    }
  }, [role]);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithPassword(email, password);
      } else {
        await signup({ 
          email, 
          password, 
          first_name: firstName, 
          last_name: lastName, 
          role,
          business_name: businessName,
          business_type: businessType,
          address_line1: address,
          city,
          state,
          pincode
        });
      }
      navigate('/');
    } catch (err: any) {
        // Backend often returns an object of errors, let's try to parse it if it looks like JSON or just use the string
        let errorMessage = err.message || (isLogin ? 'Invalid credentials or server error.' : 'Failed to create account.');
        try {
            const parsed = JSON.parse(err.message);
            if (typeof parsed === 'object' && parsed !== null) {
                // Get the first error value if it's a dict
                const firstKey = Object.keys(parsed)[0];
                if (firstKey && Array.isArray(parsed[firstKey])) {
                    errorMessage = `${firstKey}: ${parsed[firstKey][0]}`;
                } else if (firstKey) {
                   errorMessage = `${firstKey}: ${parsed[firstKey]}`;
                }
            }
        } catch(e) { /* ignore parse error, keep string */ }
        
        setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 relative overflow-hidden">
      {/* Abstract background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className={`w-full space-y-8 glass p-10 rounded-3xl shadow-2xl relative z-10 transition-all duration-500 transform ${isLogin ? 'max-w-md' : 'max-w-2xl'}`}>
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-500/20 flex items-center justify-center mb-6 transform rotate-3 hover:rotate-0 transition-transform">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">SmartStock</h1>
          <h2 className="mt-4 text-2xl font-bold text-slate-700">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h2>
          <p className="mt-2 text-sm text-slate-400 font-medium tracking-wide italic">
            {isLogin ? 'Professional B2B Inventory Solutions' : 'Build your wholesale supply chain today'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first-name" className="block text-sm font-medium text-slate-500 mb-1">First Name</label>
                    <input
                      id="first-name"
                      name="firstName"
                      type="text"
                      required
                      className="input-field"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="last-name" className="block text-sm font-medium text-slate-400 mb-1">Last Name</label>
                    <input
                      id="last-name"
                      name="lastName"
                      type="text"
                      required
                      className="input-field"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
               </div>
            )}
            
            <div className={!isLogin ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                <div>
                  {isLogin && <label htmlFor="email-address" className="sr-only">Email address</label>}
                  {!isLogin && <label htmlFor="email-address" className="block text-sm font-medium text-slate-500 mb-1">Email address</label>}
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input-field"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  {isLogin && <label htmlFor="password" className="sr-only">Password</label>}
                  {!isLogin && <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1">Password</label>}
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                    className="input-field"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
            </div>
            
            {!isLogin && (
                <>
                <div className="border-t border-slate-200/20 my-4 pt-4">
                  <h3 className="text-lg font-bold text-slate-700 mb-4 tracking-tight uppercase">Business Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="business-name" className="block text-sm font-medium text-slate-400 mb-1">Business Name</label>
                        <input
                          id="business-name"
                          name="businessName"
                          type="text"
                          required
                          className="input-field"
                          placeholder="Store or Company Name"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="business-type" className="block text-sm font-medium text-slate-400 mb-1">Business Type</label>
                        <select
                          id="business-type"
                          name="businessType"
                          required
                          className="input-field"
                          value={businessType}
                          onChange={(e) => setBusinessType(e.target.value)}
                        >
                          {role === 'retailer' ? (
                            <>
                              <option value="kirana">Kirana Store</option>
                              <option value="supermarket">Small Supermarket</option>
                              <option value="restaurant">Restaurant</option>
                              <option value="cafe">Cafe</option>
                              <option value="bakery">Bakery</option>
                              <option value="hotel">Small Hotel</option>
                              <option value="other">Other</option>
                            </>
                          ) : (
                            <>
                              <option value="fmcg">FMCG Distributor</option>
                              <option value="grocery">Grocery Wholesaler</option>
                              <option value="beverage">Beverage Distributor</option>
                              <option value="food_supplier">Food Supplier</option>
                              <option value="other">Other</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-slate-400 mb-1">Address Line 1</label>
                        <input
                          id="address"
                          name="address"
                          type="text"
                          required
                          className="input-field"
                          placeholder="Street Address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-slate-400 mb-1">City</label>
                        <input
                          id="city"
                          name="city"
                          type="text"
                          required
                          className="input-field"
                          placeholder="City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-slate-400 mb-1">State</label>
                        <input
                          id="state"
                          name="state"
                          type="text"
                          required
                          className="input-field"
                          placeholder="State"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="pincode" className="block text-sm font-medium text-slate-400 mb-1">Pincode</label>
                        <input
                          id="pincode"
                          name="pincode"
                          type="text"
                          required
                          className="input-field"
                          placeholder="Postal Code"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                        />
                      </div>
                      <div>
                         <label htmlFor="role" className="block text-sm font-medium text-slate-400 mb-1">I am a:</label>
                         <select
                           id="role"
                           name="role"
                           value={role}
                           onChange={(e) => setRole(e.target.value as 'retailer' | 'wholesaler')}
                           className="input-field"
                         >
                           <option value="retailer">Retailer (Buying stock)</option>
                           <option value="wholesaler">Wholesaler (Selling stock)</option>
                         </select>
                      </div>
                  </div>
                </div>
                </>
            )}
          </div>

          {error && (
            <div className="text-secondary-700 text-sm text-center bg-secondary-50/20 border border-secondary-100/50 py-3 rounded-xl backdrop-blur-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white disabled:opacity-70 transition-colors"
            >
              {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </div>
          
          <div className="text-center text-sm">
             <button
               type="button"
               onClick={() => {
                   setIsLogin(!isLogin);
                   setError(null);
               }}
               className="text-primary-600 hover:text-primary-500 font-medium"
             >
               {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}

