import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Home,
  User,
  LogOut,
  Settings,
  Plus
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { servicesData } from '@/data/servicesData';

interface Booking {
  id: string;
  service_id: string;
  service_title: string;
  sub_services: { id: string; name: string }[];
  house_size: string;
  preferred_time: string;
  start_date: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  special_requirements: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Pending', 
    color: 'bg-amber-100 text-amber-800 border-amber-200', 
    icon: <Clock className="w-3 h-3" /> 
  },
  confirmed: { 
    label: 'Confirmed', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: <CheckCircle className="w-3 h-3" /> 
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: <Loader2 className="w-3 h-3" /> 
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    icon: <CheckCircle className="w-3 h-3" /> 
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: <AlertCircle className="w-3 h-3" /> 
  },
};

const houseSizeLabels: Record<string, string> = {
  '1bhk': '1 BHK',
  '2bhk': '2 BHK',
  '3bhk': '3 BHK',
  '4bhk': '4+ BHK',
  'villa': 'Villa/Bungalow',
};

const timeSlotLabels: Record<string, string> = {
  'morning': 'Morning (6 AM - 10 AM)',
  'midday': 'Mid-Day (10 AM - 2 PM)',
  'afternoon': 'Afternoon (2 PM - 6 PM)',
  'evening': 'Evening (6 PM - 10 PM)',
  'flexible': 'Flexible',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      toast({
        title: "Please log in",
        description: "You need to be logged in to view your dashboard.",
        variant: "destructive",
      });
    }
  }, [user, authLoading, navigate, toast]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse sub_services from JSON
      const parsedBookings = (data || []).map(booking => ({
        ...booking,
        sub_services: typeof booking.sub_services === 'string' 
          ? JSON.parse(booking.sub_services) 
          : booking.sub_services || []
      }));
      
      setBookings(parsedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load your bookings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceId: string) => {
    const service = servicesData.find(s => s.id === serviceId);
    return service?.icon;
  };

  const getServiceBgColor = (serviceId: string) => {
    const service = servicesData.find(s => s.id === serviceId);
    return service?.bgColor || 'bg-muted';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 sm:px-8 lg:px-16 py-6 sm:py-12 lg:py-16 pt-20 sm:pt-24 pb-24 sm:pb-32">
        <div className="container-main">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 sm:mb-2">
                  Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'User'}! 👋
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Manage your bookings and track your service requests
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate('/services')} className="gap-2 flex-1 sm:flex-none">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Booking</span>
                  <span className="sm:hidden">Book</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
          >
            {[
              { label: 'Total Bookings', value: bookings.length, icon: Calendar },
              { label: 'Active', value: bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length, icon: Clock },
              { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, icon: CheckCircle },
              { label: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, icon: AlertCircle },
            ].map((stat, index) => (
              <div key={stat.label} className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-soft">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Bookings List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Bookings</h2>
            
            {bookings.length === 0 ? (
              <div className="bg-card rounded-3xl p-12 text-center shadow-soft">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start by booking your first domestic service
                </p>
                <Button onClick={() => navigate('/services')} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Book a Service
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-card rounded-2xl p-5 shadow-soft hover:shadow-elevated transition-all cursor-pointer"
                    onClick={() => setSelectedBooking(selectedBooking?.id === booking.id ? null : booking)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Service Icon */}
                      <div className={`w-14 h-14 ${getServiceBgColor(booking.service_id)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        {getServiceIcon(booking.service_id) ? (
                          <img 
                            src={getServiceIcon(booking.service_id)} 
                            alt={booking.service_title} 
                            className="w-8 h-8 object-contain" 
                          />
                        ) : (
                          <Home className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{booking.service_title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {booking.sub_services.length} service{booking.sub_services.length !== 1 ? 's' : ''} • {houseSizeLabels[booking.house_size] || booking.house_size}
                            </p>
                          </div>
                          <Badge className={`${statusConfig[booking.status]?.color || statusConfig.pending.color} gap-1`}>
                            {statusConfig[booking.status]?.icon}
                            {statusConfig[booking.status]?.label || booking.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(booking.start_date).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{timeSlotLabels[booking.preferred_time]?.split(' (')[0] || booking.preferred_time}</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${selectedBooking?.id === booking.id ? 'rotate-90' : ''}`} />
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {selectedBooking?.id === booking.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-4 border-t border-border space-y-4">
                            {/* Sub-services */}
                            <div>
                              <p className="text-sm font-medium text-foreground mb-2">Selected Services</p>
                              <div className="flex flex-wrap gap-2">
                                {booking.sub_services.map((sub: { id: string; name: string }) => (
                                  <span 
                                    key={sub.id} 
                                    className={`px-3 py-1 ${getServiceBgColor(booking.service_id)} rounded-full text-sm`}
                                  >
                                    {sub.name}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Contact & Address */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">{booking.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{booking.phone}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <p className="text-sm text-muted-foreground">{booking.address}</p>
                              </div>
                            </div>

                            {/* Special Requirements */}
                            {booking.special_requirements && (
                              <div>
                                <p className="text-sm font-medium text-foreground mb-1">Special Requirements</p>
                                <p className="text-sm text-muted-foreground">{booking.special_requirements}</p>
                              </div>
                            )}

                            {/* Booking ID & Date */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Booking ID: {booking.id.slice(0, 8)}</span>
                              <span>Booked on {new Date(booking.created_at).toLocaleDateString('en-IN')}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Dashboard;
