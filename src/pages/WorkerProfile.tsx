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
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WorkerNavbar } from '@/components/WorkerNavbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
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
}

const WorkerProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLocationWarning, setShowLocationWarning] = useState(false);
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

  // Profile picture - use default silhouette if none
  const hasProfilePicture = worker?.id_proof_url; // In future, add profile_picture_url field

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
        <Label className="flex items-center gap-2">
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
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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

  return (
    <div className="min-h-screen bg-background">
      <WorkerNavbar />
      
      <main className="pt-20 pb-16">
        <div className="container-main px-4 md:px-8 max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/for-workers/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                My Profile
              </h1>
              <p className="text-muted-foreground">
                View and update your personal information
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="card-elevated p-6 space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                    {hasProfilePicture ? (
                      <img 
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/worker-documents/${worker?.id_proof_url}`} 
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <User className={`w-10 h-10 text-muted-foreground ${hasProfilePicture ? 'hidden' : ''}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{formData.name || 'Worker'}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {worker?.work_type?.replace('_', ' ') || 'Worker'}
                    </p>
                  </div>
                </div>

                {/* Editable Fields */}
                <EditableField
                  field="name"
                  label="Full Name"
                  icon={User}
                  value={formData.name}
                />

                <EditableField
                  field="email"
                  label="Email"
                  icon={Mail}
                  value={formData.email}
                  disabled={true}
                />

                <EditableField
                  field="phone"
                  label="Phone Number"
                  icon={Phone}
                  value={formData.phone}
                  type="tel"
                />

                <EditableField
                  field="address"
                  label="Residential Address"
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
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
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
              Confirm Address Change
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change your address? This may affect your current workplaces as it appears to be significantly different from your previous location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingLocation('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLocationChange}>
              Yes, Change Address
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default WorkerProfile;
