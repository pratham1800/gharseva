import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  Loader2, 
  ArrowLeft,
  AlertTriangle,
  Briefcase,
  Pencil,
  X,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WorkerNavbar } from '@/components/WorkerNavbar';
import { Footer } from '@/components/Footer';
import { VerificationModal } from '@/components/VerificationModal';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkerData {
  id: string;
  name: string;
  phone: string;
  work_type: string;
  residential_address: string | null;
  id_proof_url: string | null;
  status: string | null;
  years_experience: number | null;
  languages_spoken: string[] | null;
}

const WorkerProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingLocation, setPendingLocation] = useState('');
  const [worker, setWorker] = useState<WorkerData | null>(null);
  
  // Edit mode states
  const [editingField, setEditingField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  
  const [originalAddress, setOriginalAddress] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/for-workers/auth');
      return;
    }
    
    if (user) {
      fetchWorkerProfile();
    }
  }, [user, authLoading, navigate]);

  const fetchWorkerProfile = async () => {
    try {
      // Get worker_auth link
      const { data: workerAuth } = await supabase
        .from('worker_auth')
        .select('worker_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (workerAuth?.worker_id) {
        const { data: workerData } = await supabase
          .from('workers')
          .select('*')
          .eq('id', workerAuth.worker_id)
          .single();

        if (workerData) {
          setWorker(workerData);
          setFormData({
            name: workerData.name || '',
            email: user?.email || '',
            phone: workerData.phone || '',
            address: workerData.residential_address || ''
          });
          setOriginalAddress(workerData.residential_address || '');
        }
      } else {
        // No worker profile, use auth data
        setFormData({
          name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
          phone: '',
          address: ''
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (newAddress: string) => {
    if (originalAddress && newAddress !== originalAddress && originalAddress.length > 0) {
      // Simple check - if significantly different, show warning
      if (newAddress.length > 0 && !newAddress.toLowerCase().includes(originalAddress.toLowerCase().split(',')[0])) {
        setPendingLocation(newAddress);
        setShowLocationWarning(true);
        return;
      }
    }
    setFormData(prev => ({ ...prev, address: newAddress }));
  };

  const confirmLocationChange = () => {
    setFormData(prev => ({ ...prev, address: pendingLocation }));
    setOriginalAddress(pendingLocation);
    setShowLocationWarning(false);
    setPendingLocation('');
  };

  const startEditing = (field: string) => {
    setEditingField(field);
  };

  const cancelEditing = () => {
    // Reset to original values
    if (worker) {
      setFormData({
        name: worker.name || '',
        email: user?.email || '',
        phone: worker.phone || '',
        address: worker.residential_address || ''
      });
    }
    setEditingField(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (worker) {
        // Update existing worker
        const { error } = await supabase
          .from('workers')
          .update({
            name: formData.name,
            phone: formData.phone,
            residential_address: formData.address,
            updated_at: new Date().toISOString()
          })
          .eq('id', worker.id);

        if (error) throw error;
      }

      // Also update profiles table
      await supabase
        .from('profiles')
        .upsert({
          id: user!.id,
          full_name: formData.name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        });

      setEditingField(null);
      setOriginalAddress(formData.address);
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    const status = worker?.status;
    if (status === 'verified') {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
          <CheckCircle className="w-3 h-3" />
          {t('verified')}
        </Badge>
      );
    } else if (status === 'pending_verification') {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
          <Clock className="w-3 h-3" />
          {t('verificationPending')}
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
          <AlertTriangle className="w-3 h-3" />
          {language === 'hi' ? 'सत्यापन आवश्यक' : language === 'kn' ? 'ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ' : language === 'mr' ? 'पडताळणी आवश्यक' : 'Verification Required'}
        </Badge>
      );
    }
  };

  const handleVerificationSuccess = () => {
    fetchWorkerProfile();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Profile picture URL
  const profilePictureUrl = worker?.id_proof_url 
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/worker-documents/profile-${worker.id}` 
    : null;

  const EditableField = ({ 
    field, 
    label, 
    icon: Icon, 
    value, 
    disabled = false,
    type = 'text',
    isTextarea = false
  }: { 
    field: string; 
    label: string; 
    icon: any; 
    value: string;
    disabled?: boolean;
    type?: string;
    isTextarea?: boolean;
  }) => {
    const isEditing = editingField === field;
    
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {label}
        </Label>
        <div className="relative">
          {isEditing ? (
            isTextarea ? (
              <Textarea
                value={value}
                onChange={(e) => field === 'address' 
                  ? handleAddressChange(e.target.value)
                  : setFormData(prev => ({ ...prev, [field]: e.target.value }))
                }
                placeholder={`Enter your ${label.toLowerCase()}`}
                rows={3}
                className="pr-10"
                autoFocus
              />
            ) : (
              <Input
                type={type}
                value={value}
                onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                placeholder={`Enter your ${label.toLowerCase()}`}
                className="pr-10"
                disabled={disabled}
                autoFocus
              />
            )
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg min-h-[44px]">
              <span className={`${value ? 'text-foreground' : 'text-muted-foreground'}`}>
                {value || `No ${label.toLowerCase()} set`}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => startEditing(field)}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          )}
          {isEditing && (
            <button
              type="button"
              onClick={cancelEditing}
              className="absolute right-2 top-2 p-1 hover:bg-muted rounded-md"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {disabled && (
          <p className="text-xs text-muted-foreground">
            {label} cannot be changed
          </p>
        )}
      </div>
    );
  };

  const needsVerification = !worker?.status || (worker?.status !== 'verified' && worker?.status !== 'pending_verification');

  return (
    <div className="min-h-screen bg-background">
      <WorkerNavbar />
      
      <main className="pt-20 pb-16">
        <div className="container-main px-4 md:px-8 max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/for-workers/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'hi' ? 'डैशबोर्ड पर वापस' : language === 'kn' ? 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂತಿರುಗಿ' : language === 'mr' ? 'डॅशबोर्डवर परत' : 'Back to Dashboard'}
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {t('myProfile')}
              </h1>
              <p className="text-muted-foreground">
                {language === 'hi' ? 'अपनी व्यक्तिगत जानकारी देखें और अपडेट करें' : language === 'kn' ? 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ವೀಕ್ಷಿಸಿ ಮತ್ತು ನವೀಕರಿಸಿ' : language === 'mr' ? 'तुमची वैयक्तिक माहिती पहा आणि अपडेट करा' : 'View and update your personal information'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Status Badge */}
                <div className="lg:col-span-1">
                  <div className="card-elevated p-6 space-y-4 sticky top-24">
                    <div className="flex flex-col items-center text-center">
                      {getStatusBadge()}
                      
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg w-full">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Shield className="w-4 h-4" />
                          <span>{language === 'hi' ? 'सत्यापन स्थिति' : language === 'kn' ? 'ಪರಿಶೀಲನೆ ಸ್ಥಿತಿ' : language === 'mr' ? 'पडताळणी स्थिती' : 'Verification Status'}</span>
                        </div>
                        {worker?.status === 'verified' ? (
                          <p className="text-sm text-green-600">
                            {language === 'hi' ? 'आपका प्रोफ़ाइल सत्यापित है' : language === 'kn' ? 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ' : language === 'mr' ? 'तुमचे प्रोफाइल सत्यापित आहे' : 'Your profile is verified'}
                          </p>
                        ) : worker?.status === 'pending_verification' ? (
                          <p className="text-sm text-amber-600">
                            {language === 'hi' ? 'आपके दस्तावेज़ समीक्षाधीन हैं' : language === 'kn' ? 'ನಿಮ್ಮ ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ' : language === 'mr' ? 'तुमचे दस्तऐवज पुनरावलोकनाधीन आहेत' : 'Your documents are under review'}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {language === 'hi' ? 'कृपया अपना सत्यापन पूरा करें' : language === 'kn' ? 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪರಿಶೀಲನೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ' : language === 'mr' ? 'कृपया तुमची पडताळणी पूर्ण करा' : 'Please complete your verification'}
                          </p>
                        )}
                      </div>

                      {needsVerification && worker && (
                        <Button 
                          type="button"
                          className="w-full mt-4"
                          onClick={() => setShowVerificationModal(true)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('completeVerification')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Profile Picture & Name */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Header Card with Picture and Name */}
                  <div className="card-elevated p-6">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-border shadow-lg">
                        {profilePictureUrl ? (
                          <img 
                            src={profilePictureUrl} 
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <User className={`w-12 h-12 text-muted-foreground ${profilePictureUrl ? 'hidden' : ''}`} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">{formData.name || 'Worker'}</h2>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                          <Briefcase className="w-4 h-4" />
                          {worker?.work_type?.replace('_', ' ') || 'Worker'}
                        </p>
                        {worker?.years_experience && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {worker.years_experience} {t('years')} {t('experience')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Editable Fields Card */}
                  <div className="card-elevated p-6 space-y-6">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-3">
                      {language === 'hi' ? 'संपर्क जानकारी' : language === 'kn' ? 'ಸಂಪರ್ಕ ಮಾಹಿತಿ' : language === 'mr' ? 'संपर्क माहिती' : 'Contact Information'}
                    </h3>
                    
                    <EditableField
                      field="name"
                      label={language === 'hi' ? 'पूरा नाम' : language === 'kn' ? 'ಪೂರ್ಣ ಹೆಸರು' : language === 'mr' ? 'पूर्ण नाव' : 'Full Name'}
                      icon={User}
                      value={formData.name}
                    />

                    <EditableField
                      field="email"
                      label={language === 'hi' ? 'ईमेल' : language === 'kn' ? 'ಇಮೇಲ್' : language === 'mr' ? 'ईमेल' : 'Email'}
                      icon={Mail}
                      value={formData.email}
                      disabled={true}
                    />

                    <EditableField
                      field="phone"
                      label={language === 'hi' ? 'फ़ोन नंबर' : language === 'kn' ? 'ಫೋನ್ ನಂಬರ್' : language === 'mr' ? 'फोन नंबर' : 'Phone Number'}
                      icon={Phone}
                      value={formData.phone}
                      type="tel"
                    />

                    <EditableField
                      field="address"
                      label={language === 'hi' ? 'आवासीय पता' : language === 'kn' ? 'ವಾಸದ ವಿಳಾಸ' : language === 'mr' ? 'निवासी पत्ता' : 'Residential Address'}
                      icon={MapPin}
                      value={formData.address}
                      isTextarea={true}
                    />
                  </div>

                  {/* Save Button - only show when editing */}
                  {editingField && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Button type="submit" className="w-full" size="lg" disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {language === 'hi' ? 'सहेज रहा है...' : language === 'kn' ? 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...' : language === 'mr' ? 'जतन करत आहे...' : 'Saving...'}
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            {t('save')} {language === 'hi' ? 'परिवर्तन' : language === 'kn' ? 'ಬದಲಾವಣೆಗಳು' : language === 'mr' ? 'बदल' : 'Changes'}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Location Change Warning Dialog */}
      <AlertDialog open={showLocationWarning} onOpenChange={setShowLocationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {language === 'hi' ? 'पता परिवर्तन की पुष्टि करें' : language === 'kn' ? 'ವಿಳಾಸ ಬದಲಾವಣೆಯನ್ನು ದೃಢೀಕರಿಸಿ' : language === 'mr' ? 'पत्ता बदल निश्चित करा' : 'Confirm Address Change'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'hi' ? 'क्या आप वाकई अपना पता बदलना चाहते हैं? यह आपके वर्तमान कार्यस्थलों को प्रभावित कर सकता है।' : language === 'kn' ? 'ನಿಮ್ಮ ವಿಳಾಸವನ್ನು ಬದಲಾಯಿಸಲು ನೀವು ಖಚಿತವಾಗಿ ಬಯಸುವಿರಾ? ಇದು ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಕೆಲಸದ ಸ್ಥಳಗಳ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರಬಹುದು.' : language === 'mr' ? 'तुम्ही खात्री आहात की तुम्ही तुमचा पत्ता बदलू इच्छिता? हे तुमच्या सध्याच्या कामाच्या ठिकाणांवर परिणाम करू शकते.' : 'Are you sure you want to change your address? This may affect your current workplaces as it appears to be significantly different from your previous location.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingLocation('')}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLocationChange}>
              {language === 'hi' ? 'हाँ, पता बदलें' : language === 'kn' ? 'ಹೌದು, ವಿಳಾಸ ಬದಲಾಯಿಸಿ' : language === 'mr' ? 'हो, पत्ता बदला' : 'Yes, Change Address'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verification Modal */}
      {worker && (
        <VerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          workerId={worker.id}
          onSuccess={handleVerificationSuccess}
        />
      )}

      <Footer />
    </div>
  );
};

export default WorkerProfile;