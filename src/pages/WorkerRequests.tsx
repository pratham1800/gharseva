import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2, 
  User, 
  Phone, 
  Clock, 
  MapPin,
  CheckCircle,
  XCircle,
  Calendar,
  Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkerNavbar } from '@/components/WorkerNavbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WorkRequest {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  service_title: string;
  preferred_time: string;
  start_date: string;
  call_scheduled_at: string | null;
  status: string;
  house_size: string;
}

const WorkerRequests = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/for-workers/auth');
      return;
    }
    
    if (user) {
      fetchWorkRequests();
    }
  }, [user, authLoading, navigate]);

  const fetchWorkRequests = async () => {
    try {
      // Get worker_id for current user
      const { data: workerAuth } = await supabase
        .from('worker_auth')
        .select('worker_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!workerAuth?.worker_id) {
        setLoading(false);
        return;
      }

      // Get bookings assigned to this worker that are pending
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('assigned_worker_id', workerAuth.worker_id)
        .in('status', ['pending', 'matched'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRequests(bookings || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          call_status: 'scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: language === 'hi' ? 'अनुरोध स्वीकार किया!' : language === 'kn' ? 'ವಿನಂತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ!' : language === 'mr' ? 'विनंती स्वीकारली!' : 'Request Accepted!',
        description: language === 'hi' ? 'यह अनुरोध आपकी बुकिंग में जोड़ा गया है।' : language === 'kn' ? 'ಈ ವಿನಂತಿಯನ್ನು ನಿಮ್ಮ ಬುಕಿಂಗ್‌ಗಳಿಗೆ ಸೇರಿಸಲಾಗಿದೆ.' : language === 'mr' ? 'ही विनंती तुमच्या बुकिंगमध्ये जोडली गेली आहे.' : 'This request has been added to your bookings.',
      });

      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept request',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      // Update the booking status to indicate worker rejected
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'worker_unavailable',
          assigned_worker_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: language === 'hi' ? 'अनुरोध अस्वीकृत' : language === 'kn' ? 'ವಿನಂತಿ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ' : language === 'mr' ? 'विनंती नाकारली' : 'Request Rejected',
        description: language === 'hi' ? 'अनुरोध आपकी सूची से हटा दिया गया है।' : language === 'kn' ? 'ವಿನಂತಿಯನ್ನು ನಿಮ್ಮ ಪಟ್ಟಿಯಿಂದ ತೆಗೆದುಹಾಕಲಾಗಿದೆ.' : language === 'mr' ? 'विनंती तुमच्या यादीतून काढली गेली आहे.' : 'The request has been removed from your list.',
      });

      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : language === 'mr' ? 'mr-IN' : 'en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : language === 'mr' ? 'mr-IN' : 'en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const texts = {
    title: {
      en: 'Work Requests',
      hi: 'कार्य अनुरोध',
      kn: 'ಕೆಲಸದ ವಿನಂತಿಗಳು',
      mr: 'काम विनंत्या'
    },
    subtitle: {
      en: 'Review and respond to work requests from owners',
      hi: 'मालिकों से काम के अनुरोधों की समीक्षा करें और जवाब दें',
      kn: 'ಮಾಲೀಕರಿಂದ ಕೆಲಸದ ವಿನಂತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಪ್ರತಿಕ್ರಿಯಿಸಿ',
      mr: 'मालकांकडून कामाच्या विनंत्यांचे पुनरावलोकन करा आणि प्रतिसाद द्या'
    },
    noRequests: {
      en: 'No pending work requests',
      hi: 'कोई लंबित कार्य अनुरोध नहीं',
      kn: 'ಯಾವುದೇ ಬಾಕಿ ಕೆಲಸದ ವಿನಂತಿಗಳಿಲ್ಲ',
      mr: 'कोणत्याही प्रलंबित कामाच्या विनंत्या नाहीत'
    },
    noRequestsDesc: {
      en: 'When owners send you work requests, they will appear here.',
      hi: 'जब मालिक आपको काम के अनुरोध भेजेंगे, तो वे यहाँ दिखाई देंगे।',
      kn: 'ಮಾಲೀಕರು ನಿಮಗೆ ಕೆಲಸದ ವಿನಂತಿಗಳನ್ನು ಕಳುಹಿಸಿದಾಗ, ಅವು ಇಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ.',
      mr: 'जेव्हा मालक तुम्हाला काम विनंत्या पाठवतील, तेव्हा त्या येथे दिसतील.'
    },
    accept: {
      en: 'Accept',
      hi: 'स्वीकार करें',
      kn: 'ಸ್ವೀಕರಿಸಿ',
      mr: 'स्वीकारा'
    },
    reject: {
      en: 'Reject',
      hi: 'अस्वीकार करें',
      kn: 'ತಿರಸ್ಕರಿಸಿ',
      mr: 'नाकारा'
    },
    scheduledCall: {
      en: 'Scheduled Call',
      hi: 'निर्धारित कॉल',
      kn: 'ನಿಗದಿತ ಕರೆ',
      mr: 'नियोजित कॉल'
    },
    startDate: {
      en: 'Start Date',
      hi: 'प्रारंभ तिथि',
      kn: 'ಪ್ರಾರಂಭ ದಿನಾಂಕ',
      mr: 'सुरुवातीची तारीख'
    },
    preferredTime: {
      en: 'Preferred Time',
      hi: 'पसंदीदा समय',
      kn: 'ಆದ್ಯತೆಯ ಸಮಯ',
      mr: 'पसंतीची वेळ'
    },
    back: {
      en: 'Back to Dashboard',
      hi: 'डैशबोर्ड पर वापस',
      kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂತಿರುಗಿ',
      mr: 'डॅशबोर्डवर परत'
    }
  };

  const getText = (key: keyof typeof texts) => {
    return texts[key][language] || texts[key]['en'];
  };

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
            {getText('back')}
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {getText('title')}
              </h1>
              <p className="text-muted-foreground">
                {getText('subtitle')}
              </p>
            </div>

            {requests.length === 0 ? (
              <div className="card-elevated p-12 text-center">
                <Inbox className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {getText('noRequests')}
                </h3>
                <p className="text-muted-foreground">
                  {getText('noRequestsDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card-elevated p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        {/* Owner Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{request.full_name}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {request.phone}
                            </p>
                          </div>
                        </div>

                        {/* Service & Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Badge variant="secondary" className="mb-2">
                              {request.service_title}
                            </Badge>
                            <p className="text-sm text-muted-foreground flex items-start gap-1">
                              <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                              {request.address}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm">
                              <span className="text-muted-foreground">{getText('startDate')}: </span>
                              <span className="text-foreground font-medium">
                                {formatDate(request.start_date)}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">{getText('preferredTime')}: </span>
                              <span className="text-foreground font-medium">
                                {request.preferred_time}
                              </span>
                            </div>
                            {request.call_scheduled_at && (
                              <div className="text-sm flex items-center gap-1 text-primary">
                                <Calendar className="w-3 h-3" />
                                <span>{getText('scheduledCall')}: </span>
                                <span className="font-medium">
                                  {formatDate(request.call_scheduled_at)} at {formatTime(request.call_scheduled_at)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-row md:flex-col gap-2 md:w-32">
                        <Button
                          size="sm"
                          className="flex-1 md:w-full"
                          onClick={() => handleAccept(request.id)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {getText('accept')}
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 md:w-full text-destructive hover:text-destructive"
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              {getText('reject')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WorkerRequests;