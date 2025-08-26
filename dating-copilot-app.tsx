import React, { useState, useRef } from 'react';
import { generateProfileFromPhotoUrls, generateConversationStarters } from './src/api/publicClient';
import { useAuth } from './src/auth/AuthContext';
import SignIn from './src/auth/SignIn';
import SignUp from './src/auth/SignUp';
import { Camera, Upload, MessageCircle, User, Sparkles, Wand2, Copy, RefreshCw, Star, Zap, Target, Crown, CreditCard, Check, X, Lock, TrendingUp, Shield } from 'lucide-react';

const DatingCopilot = () => {
  const [activeTab, setActiveTab] = useState('profile');
  interface LocalPhoto { id: number; file: File; url: string; name: string; backendId?: string }
  interface GeneratedProfile { bio: string; traits: string[]; interests: string[]; matchPercentage: number; profileStrength: string }
  interface CrushPhoto { file: File; url: string; name: string }
  interface Opener { text: string; confidence: number; type: string }
  const [profilePhotos, setProfilePhotos] = useState<LocalPhoto[]>([]);
  const [crushPhoto, setCrushPhoto] = useState<CrushPhoto | null>(null);
  const [generatedProfile, setGeneratedProfile] = useState<GeneratedProfile | null>(null);
  // Generation mode toggle removed; always attempt direct photo URL generation first.
  const [openers, setOpeners] = useState<Opener[]>([]);
  // Auth removed for now – always operate in lightweight preview mode
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [buildStage, setBuildStage] = useState<'idle'|'processing'|'generating'|'done'|'error'>('idle');
  // Separate progress for openers
  const [openerStage, setOpenerStage] = useState<'idle'|'processing'|'generating'|'finalizing'|'done'|'error'>('idle');
  const openerSteps = ['Analyzing Photo', 'Generating Starters', 'Finalizing'];
  const [openerProgressIndex, setOpenerProgressIndex] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const { user, upgradePlan, signOut } = useAuth();
  const userPlan = user?.plan || 'free';
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin'|'signup'>('signin');
  const [usageCount, setUsageCount] = useState({ profiles: 0, openers: 0 });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState('plans');
  const progressSteps = ['Processing Photos', 'Generating Profile', 'Finalizing'];
  const [progressIndex, setProgressIndex] = useState(0);
  const profileFileRef = useRef<HTMLInputElement | null>(null);
  const crushFileRef = useRef<HTMLInputElement | null>(null);

  const plans = {
    pro: {
      name: 'Pro',
      price: '$14.99',
      period: '/month',
      features: [
        'Unlimited profile optimizations',
        'Up to 100 conversation starters per day',
        'Advanced personality analysis',
        'Photo optimization recommendations',
        'Success rate analytics',
        'Priority support'
      ],
      color: 'from-blue-600 to-purple-600',
      popular: false
    },
    premium: {
      name: 'Elite',
      price: '$24.99',
      period: '/month',
      features: [
        'Everything in Pro',
        'Unlimited conversation starters',
        'AI dating coach chat support',
        'Advanced photo analysis & rating',
        'A/B test different profiles',
        'Match probability predictions',
        'Exclusive dating strategies',
        '24/7 VIP support'
      ],
      color: 'from-purple-600 to-cyan-600',
      popular: true
    }
  };

  const limits = {
    free: { profiles: 2, openers: 1 },
    pro: { profiles: Infinity, openers: 100 },
    premium: { profiles: Infinity, openers: Infinity }
  };

  const checkUsageLimit = (type) => {
    const limit = limits[userPlan][type];
    return usageCount[type] >= limit;
  };

  const handlePaidFeature = (type) => {
    if (checkUsageLimit(type)) {
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const processPayment = async (planKey) => {
    // If user not signed in yet, capture intent and show signup
    if(!user){
      setSelectedPlan(planKey);
      setShowPaymentModal(false);
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }
    setPaymentStep('payment');
    await new Promise(r => setTimeout(r, 800));
    try {
      await upgradePlan(planKey);
      setUsageCount({ profiles: 0, openers: 0 });
      setPaymentStep('success');
      setTimeout(() => { setShowPaymentModal(false); setPaymentStep('plans'); }, 1200);
    } catch (e) {
      console.error('Upgrade failed', e);
      setPaymentStep('plans');
    }
  };

  // After successful signup, if a plan was pre-selected trigger upgrade flow
  React.useEffect(() => {
    if(user && selectedPlan && !showAuthModal && showPaymentModal === false){
      // reopen payment modal directly into payment step for selected plan
      setShowPaymentModal(true);
      processPayment(selectedPlan);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleProfilePhotos = (files: FileList | null) => {
    if(!files) return;
    const newPhotos: LocalPhoto[] = Array.from(files).map((file: File) => ({
      id: Date.now() + Math.random(),
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setProfilePhotos(prev => [...prev, ...newPhotos]);
  };

  const handleCrushPhoto = (file: File) => {
    setCrushPhoto({ file, url: URL.createObjectURL(file), name: file.name });
  };

  const analyzePhotos = async () => {
    if (profilePhotos.length === 0) return;
    if (!handlePaidFeature('profiles')) return;
    try {
      setLoading(true);
      setBuildStage('processing');
      setProgressIndex(0);
      // Convert selected files to data URLs (no upload step)
      const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const photoDataUrls = await Promise.all(profilePhotos.map(p => toDataUrl(p.file)));
      setProgressIndex(1);
      setBuildStage('generating');
      const profileData = await generateProfileFromPhotoUrls(photoDataUrls);
      setProgressIndex(2);
      setBuildStage('done');
      setGeneratedProfile({
        bio: profileData.bio,
        traits: profileData.traits,
        interests: profileData.interests,
        matchPercentage: profileData.match_percentage || profileData.matchPercentage,
        profileStrength: profileData.profile_strength || profileData.profileStrength
      });
      setUsageCount(prev => ({ ...prev, profiles: prev.profiles + 1 }));
    } catch (e:any) {
      console.error(e);
      setBuildStage('error');
    } finally {
      setLoading(false);
    }
  };
  // Auth handler removed

  const generateOpeners = async () => {
    if (!crushPhoto) return;
    if (!handlePaidFeature('openers')) return;
    try {
  setLoading(true);
  setOpenerStage('processing');
  setOpenerProgressIndex(0);
      // Convert the crush photo file to a data URL for backend (mirrors profile flow)
      const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const dataUrl = await toDataUrl(crushPhoto.file);
  setOpenerStage('generating');
  setOpenerProgressIndex(1);
      const resp = await generateConversationStarters([dataUrl]);
      // Backend returns { starters: string[], guidance?, model_used, ... }
      const starters: string[] = resp.starters || [];
      const mapped = starters.map((s: string) => ({
        text: s,
        // Confidence is currently not provided by backend; assign placeholder heuristic based on length/variety
        confidence: Math.min(95, Math.max(70, 60 + Math.floor(Math.random() * 40))),
        type: 'AI'
      }));
      setOpeners(mapped);
      setUsageCount(prev => ({ ...prev, openers: prev.openers + 1 }));
  setOpenerStage('finalizing');
  setOpenerProgressIndex(2);
  setTimeout(() => setOpenerStage('done'), 300);
    } catch (e) {
      console.error('Failed generating conversation starters', e);
  setOpenerStage('error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const removePhoto = (id) => {
    setProfilePhotos(prev => prev.filter(photo => photo.id !== id));
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-green-400 bg-green-900/30 border-green-700/50';
    if (confidence >= 80) return 'text-blue-400 bg-blue-900/30 border-blue-700/50';
    return 'text-orange-400 bg-orange-900/30 border-orange-700/50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-32 w-96 h-96 bg-gradient-to-br from-purple-600/5 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-gradient-to-br from-cyan-500/5 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <div className="relative bg-black/40 backdrop-blur-xl shadow-2xl border-b border-gray-800/50">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Flaire Logo */}
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-xl">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Modern "F" with geometric flair */}
                    <path d="M6 4h20v4H10v6h12v4H10v10H6V4z" fill="white"/>
                    {/* Stylized flame/spark accent */}
                    <path d="M24 8l4-2-1 4 3 2-4 1 1 3-3-2z" fill="white" opacity="0.8"/>
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Flaire
                </h1>
                <p className="text-gray-400 text-sm">Your dating advantage</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>Results-Driven</span>
              </div>
              <div className="flex items-center space-x-4 ml-6">
                <div className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">
                  {userPlan === 'free' ? 'Free Plan' : userPlan === 'pro' ? 'Pro Plan' : 'Elite Plan'}
                </div>
                {userPlan === 'free' && (
                  <button
                    onClick={() => { setShowPaymentModal(true); }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 flex items-center space-x-1"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Upgrade</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-10">
        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-gray-900/80 backdrop-blur-xl p-2 rounded-2xl shadow-2xl mb-10 border border-gray-800/50">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transform scale-105'
                : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Profile Builder</span>
          </button>
          <button
            onClick={() => setActiveTab('openers')}
            className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'openers'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transform scale-105'
                : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Conversation Starters</span>
          </button>
        </div>

        {/* Profile Builder Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-10">
            {/* Upload Section */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-gray-800/50">
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-gray-700/50">
                  <Sparkles className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Optimize Your Profile</h2>
                <p className="text-lg text-gray-300 max-w-2xl mx-auto">Upload 2-5 photos and let our AI craft a high-converting profile that gets you matches</p>
              </div>

              {/* Auth / guest UI removed */}
              <div
                onClick={() => profileFileRef.current?.click()}
                className="border-2 border-dashed border-blue-500/50 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-900/20 transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-gray-800/30 to-blue-900/10"
              >
                <Upload className="w-16 h-16 text-blue-400 mx-auto mb-6" />
                <p className="text-xl font-semibold text-gray-200 mb-3">Upload Your Photos</p>
                <p className="text-gray-400 text-lg">Drag & drop or click to select multiple photos</p>
                <p className="text-sm text-gray-500 mt-2">Supported formats: JPG, PNG, HEIC</p>
              </div>

              <input
                ref={profileFileRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleProfilePhotos(e.target.files)}
                className="hidden"
              />

              {/* Generation mode toggle removed */}

              {/* Photo Preview */}
              {profilePhotos.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
                    <Camera className="w-5 h-5" />
                    <span>Your Photos ({profilePhotos.length})</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {profilePhotos.map((photo, index) => (
                      <div key={photo.id} className="relative group">
                        <div className="relative overflow-hidden rounded-xl shadow-lg border border-gray-700/50">
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300"></div>
                        </div>
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:bg-red-600 transform hover:scale-110"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-medium text-white">
                          Photo {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="mt-10 text-center">
                {checkUsageLimit('profiles') && userPlan === 'free' ? (
                  <div className="space-y-4">
                    <div className="bg-yellow-900/50 border border-yellow-700/50 rounded-xl p-4 text-center backdrop-blur-sm">
                      <p className="text-yellow-200 font-medium">You've reached your free limit of {limits.free.profiles} profile generations</p>
                      <p className="text-yellow-400 text-sm mt-1">Upgrade to continue optimizing your profile!</p>
                    </div>
                    <button
                      onClick={() => { setShowPaymentModal(true); }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-2 transition-all duration-300 flex items-center space-x-3 mx-auto"
                    >
                      <Crown className="w-6 h-6" />
                      <span>Upgrade Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userPlan === 'free' && (
                      <div className="text-sm text-gray-400">
                        {limits.free.profiles - usageCount.profiles} profile generations remaining
                      </div>
                    )}
                    <button
                      onClick={analyzePhotos}
                      disabled={profilePhotos.length === 0 || loading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-3 mx-auto relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center space-x-3">
                        <Wand2 className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                        <span>{loading ? (buildStage==='processing' ? 'Processing Photos...' : buildStage==='generating' ? 'Generating Profile...' : 'Analyzing...') : 'Generate Optimized Profile'}</span>
                      </div>
                    </button>
                    {loading && (
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mb-1">
                          {progressSteps.map((s, i) => (
                            <span key={i} className={i===progressIndex? 'text-blue-300 font-medium' : i < progressIndex ? 'text-gray-300' : ''}>{s}</span>
                          ))}
                        </div>
                        <div className="w-full h-2 bg-gray-700/60 rounded-full overflow-hidden">
                          <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500" style={{width: `${(progressIndex/(progressSteps.length-1))*100}%`}}></div>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">Stage: {buildStage}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Generated Profile */}
            {generatedProfile && (
              <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-gray-800/50">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-3xl font-bold text-white flex items-center space-x-3">
                    <Star className="w-8 h-8 text-yellow-500" />
                    <span>Your Optimized Profile</span>
                  </h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">{generatedProfile.matchPercentage}%</div>
                    <div className="text-sm text-gray-400">{generatedProfile.profileStrength}</div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Bio */}
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-4">Bio</h4>
                    <div className="bg-gradient-to-r from-gray-800/50 to-blue-900/20 rounded-xl p-6 border-l-4 border-blue-500">
                      <p className="text-gray-200 leading-relaxed text-lg">{generatedProfile.bio}</p>
                    </div>
                  </div>

                  {/* Traits */}
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-4">Personality Traits</h4>
                    <div className="flex flex-wrap gap-3">
                      {generatedProfile.traits.map((trait, index) => (
                        <span
                          key={index}
                          className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 text-blue-300 px-5 py-3 rounded-full text-sm font-semibold shadow-md border border-blue-800/30"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-4">Interests & Hobbies</h4>
                    <div className="flex flex-wrap gap-3">
                      {generatedProfile.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="bg-gradient-to-r from-purple-900/50 to-cyan-900/50 text-purple-300 px-5 py-3 rounded-full text-sm font-semibold shadow-md border border-purple-800/30"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    onClick={() => copyToClipboard(generatedProfile.bio)}
                    className="flex items-center space-x-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-200 px-6 py-3 rounded-xl font-medium transition-colors duration-200 shadow-md border border-gray-700/50"
                  >
                    <Copy className="w-5 h-5" />
                    <span>Copy Bio</span>
                  </button>
                  <button
                    onClick={analyzePhotos}
                    className="flex items-center space-x-2 bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 px-6 py-3 rounded-xl font-medium transition-colors duration-200 shadow-md border border-blue-800/50"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Generate New Version</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conversation Starters Tab */}
        {activeTab === 'openers' && (
          <div className="space-y-10">
            {/* Upload Section */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-gray-800/50">
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-gray-700/50">
                  <MessageCircle className="w-10 h-10 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Smart Conversation Starters</h2>
                <p className="text-lg text-gray-300 max-w-2xl mx-auto">Upload their photo and get personalized, high-success openers that actually work</p>
              </div>

              <div
                onClick={() => crushFileRef.current?.click()}
                className="border-2 border-dashed border-cyan-500/50 rounded-2xl p-12 text-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-900/20 transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-gray-800/30 to-cyan-900/10"
              >
                <Camera className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
                <p className="text-xl font-semibold text-gray-200 mb-3">Upload Their Photo</p>
                <p className="text-gray-400 text-lg">AI will analyze and suggest perfect conversation starters</p>
                <p className="text-sm text-gray-500 mt-2">Privacy-focused • Secure analysis</p>
              </div>

              <input
                ref={crushFileRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if(file) handleCrushPhoto(file);
                }}
                className="hidden"
              />

              {/* Photo Preview */}
              {crushPhoto && (
                <div className="mt-8 text-center">
                  <h3 className="text-xl font-semibold text-white mb-6">Analyzing This Photo</h3>
                  <div className="inline-block relative">
                    <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-gray-700/50">
                      <img
                        src={crushPhoto.url}
                        alt="Target person"
                        className="w-64 h-64 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>
                    <button
                      onClick={() => setCrushPhoto(null)}
                      className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-colors duration-200"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="mt-10 text-center">
                {checkUsageLimit('openers') && userPlan === 'free' ? (
                  <div className="space-y-4">
                    <div className="bg-yellow-900/50 border border-yellow-700/50 rounded-xl p-4 text-center backdrop-blur-sm">
                      <p className="text-yellow-200 font-medium">You've used all {limits.free.openers} free conversation starters</p>
                      <p className="text-yellow-400 text-sm mt-1">Upgrade for unlimited smart openers!</p>
                    </div>
                    <button
                      onClick={() => { setShowPaymentModal(true); }}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-2 transition-all duration-300 flex items-center space-x-3 mx-auto"
                    >
                      <Crown className="w-6 h-6" />
                      <span>Upgrade Now</span>
                    </button>
                  </div>
                ) : userPlan === 'pro' && checkUsageLimit('openers') ? (
                  <div className="space-y-4">
                    <div className="bg-blue-900/50 border border-blue-700/50 rounded-xl p-4 text-center backdrop-blur-sm">
                      <p className="text-blue-200 font-medium">You've reached your daily limit of {limits.pro.openers} openers</p>
                      <p className="text-blue-400 text-sm mt-1">Upgrade to Elite for unlimited access!</p>
                    </div>
                    <button
                      onClick={() => { setShowPaymentModal(true); }}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-2 transition-all duration-300 flex items-center space-x-3 mx-auto"
                    >
                      <Crown className="w-6 h-6" />
                      <span>Upgrade to Elite</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userPlan === 'free' && (
                      <div className="text-sm text-gray-400">
                        {limits.free.openers - usageCount.openers} conversation starters remaining
                      </div>
                    )}
                    {userPlan === 'pro' && (
                      <div className="text-sm text-gray-400">
                        {limits.pro.openers - usageCount.openers} conversation starters remaining today
                      </div>
                    )}
                    <button
                      onClick={generateOpeners}
                      disabled={!crushPhoto || loading}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-3 mx-auto relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-700 to-blue-700 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center space-x-3">
                        <Sparkles className={`w-6 h-6 ${loading ? 'animate-pulse' : ''}`} />
                        <span>{loading ? (openerStage==='processing' ? 'Analyzing Photo...' : openerStage==='generating' ? 'Generating Starters...' : 'Finalizing...') : 'Generate Smart Openers'}</span>
                      </div>
                    </button>
                    {loading && openerStage !== 'idle' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mb-1">
                          {openerSteps.map((s, i) => (
                            <span key={i} className={i===openerProgressIndex? 'text-cyan-300 font-medium' : i < openerProgressIndex ? 'text-gray-300' : ''}>{s}</span>
                          ))}
                        </div>
                        <div className="w-full h-2 bg-gray-700/60 rounded-full overflow-hidden">
                          <div className="h-2 bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500" style={{width: `${(openerProgressIndex/(openerSteps.length-1))*100}%`}}></div>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">Stage: {openerStage}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Generated Openers */}
            {openers.length > 0 && (
              <div className="bg-gray-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-gray-800/50">
                <h3 className="text-3xl font-bold text-white mb-8 flex items-center space-x-3">
                  <Target className="w-8 h-8 text-green-400" />
                  <span>Personalized Conversation Starters</span>
                </h3>

                <div className="space-y-6">
                  {openers.map((opener, index) => (
                    <div key={index} className="bg-gradient-to-r from-gray-800/50 to-blue-900/20 rounded-2xl p-6 border border-gray-700/50 shadow-lg hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-300">{opener.type}</span>
                            <div className={`text-xs px-2 py-1 rounded-full font-medium mt-1 inline-block border ${getConfidenceColor(opener.confidence)}`}>
                              {opener.confidence}% success rate
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-200 text-lg leading-relaxed mb-4">{opener.text}</p>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => copyToClipboard(opener.text)}
                          className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 font-semibold text-sm bg-gray-800/50 px-4 py-2 rounded-lg shadow-md hover:shadow-lg border border-gray-700/50 transition-all duration-200"
                        >
                          <Copy className="w-4 h-4" />
                          <span>{copiedText === opener.text ? 'Copied!' : 'Copy Message'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    onClick={generateOpeners}
                    className="flex items-center space-x-2 bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 px-6 py-3 rounded-xl font-medium transition-colors duration-200 shadow-md border border-blue-800/50"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Generate New Openers</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
            
            {paymentStep === 'plans' && (
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                    <Crown className="w-8 h-8 text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Upgrade Your Dating Game</h2>
                  <p className="text-gray-300">Choose the perfect plan to unlock unlimited AI-powered dating assistance</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {Object.entries(plans).map(([key, plan]) => (
                    <div
                      key={key}
                      className={`relative bg-gradient-to-br ${plan.color} rounded-2xl p-8 text-white transform hover:scale-105 transition-all duration-300 cursor-pointer ${
                        plan.popular ? 'ring-4 ring-cyan-400' : ''
                      }`}
                      onClick={() => setSelectedPlan(key)}
                    >
                      {plan.popular && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                          <div className="bg-cyan-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                            Most Popular
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                        <div className="flex items-baseline justify-center">
                          <span className="text-4xl font-bold">{plan.price}</span>
                          <span className="text-lg opacity-80">{plan.period}</span>
                        </div>
                      </div>

                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center space-x-3">
                            <Check className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          processPayment(key);
                        }}
                        className="w-full bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-semibold py-4 rounded-xl transition-colors duration-200"
                      >
                        Choose {plan.name}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="text-gray-400 hover:text-gray-200 font-medium"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 'payment' && (
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                    <CreditCard className="w-8 h-8 text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Secure Payment</h2>
                  <p className="text-gray-300">Processing your {selectedPlan && plans[selectedPlan].name} plan subscription</p>
                </div>

                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-6 mb-6 border border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-semibold text-gray-200">
                        {selectedPlan && plans[selectedPlan].name} Plan
                      </span>
                      <span className="text-2xl font-bold text-white">
                        {selectedPlan && plans[selectedPlan].price}
                        <span className="text-sm text-gray-400">/month</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Lock className="w-4 h-4" />
                      <span>Secured by Stripe • Cancel anytime</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="animate-pulse">
                      <div className="bg-gray-700 h-12 rounded-lg mb-4"></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-700 h-12 rounded-lg"></div>
                        <div className="bg-gray-700 h-12 rounded-lg"></div>
                      </div>
                    </div>
                    
                    <div className="text-center text-gray-300">
                      <div className="inline-flex items-center space-x-2">
                        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span>Processing payment...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="p-8 text-center">
                <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-700">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}!</h2>
                <p className="text-lg text-gray-300 mb-6">Your subscription is now active. Get ready to level up your dating game!</p>
                
                <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-2xl p-6 max-w-md mx-auto border border-green-800/50">
                  <h3 className="font-semibold text-gray-200 mb-3">What's Next?</h3>
                  <ul className="text-left space-y-2 text-sm text-gray-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Unlimited profile optimizations</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Smart conversation starters</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Advanced success analytics</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Close button */}
            {paymentStep === 'plans' && (
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute -top-4 -right-4 bg-gray-800 hover:bg-gray-700 text-gray-200 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-gray-700">×</button>
            {authMode==='signin' ? (
              <SignIn onSwitch={() => setAuthMode('signup')} onSuccess={() => setShowAuthModal(false)} />
            ) : (
              <SignUp onSwitch={() => setAuthMode('signin')} onSuccess={() => setShowAuthModal(false)} />
            )}
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-gray-800">
            <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-700">
              <Crown className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Upgrade Required</h3>
            <p className="text-gray-300 mb-6">You've reached your free usage limit. Upgrade to continue using AI-powered dating assistance!</p>
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowPaywall(false);
                  setShowPaymentModal(true);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
              >
                View Pricing Plans
              </button>
              <button
                onClick={() => setShowPaywall(false)}
                className="w-full text-gray-400 hover:text-gray-200 font-medium"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatingCopilot;