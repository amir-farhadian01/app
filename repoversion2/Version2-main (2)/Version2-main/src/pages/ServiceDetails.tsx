import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Star, MapPin, ShieldCheck, Clock, ArrowLeft, Zap, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const sDoc = await getDoc(doc(db, 'services', id));
        if (sDoc.exists()) {
          const sData = sDoc.data();
          setService({ id: sDoc.id, ...sData });
          
          const pDoc = await getDoc(doc(db, 'users', sData.providerId));
          if (pDoc.exists()) {
            setProvider(pDoc.data());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleBook = async () => {
    if (!auth.currentUser) {
      navigate('/auth');
      return;
    }
    if (auth.currentUser.uid === service.providerId) {
      showNotification("You cannot book your own service.", 'error');
      return;
    }

    setBooking(true);
    try {
      await addDoc(collection(db, 'requests'), {
        customerId: auth.currentUser.uid,
        providerId: service.providerId,
        serviceId: service.id,
        status: 'pending',
        details: `Booking for ${service.title}`,
        createdAt: new Date().toISOString()
      });
      setBookingSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'requests');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 dark:border-neutral-800 dark:border-t-neutral-200 rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-2xl font-bold text-app-text">Service not found</h2>
        <button onClick={() => navigate('/')} className="text-app-text font-bold hover:underline flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-500 hover:text-app-text transition-colors font-bold text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Left: Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold uppercase tracking-widest rounded-full">
                {service.category}
              </span>
              <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                <Star className="w-4 h-4 fill-current" />
                {service.rating || 'New'}
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-app-text">{service.title}</h1>
            <div className="flex items-center gap-4 text-neutral-500 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {provider?.location || 'Local Area'}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Usually responds in 1h
              </div>
            </div>
          </div>

          <div className="aspect-video bg-neutral-100 dark:bg-neutral-800 rounded-[2.5rem] overflow-hidden border border-app-border">
            <img 
              src={`https://picsum.photos/seed/${service.id}/1200/675`} 
              alt={service.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-app-text">About this service</h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
              {service.description || "No description provided."}
            </p>
          </div>

          <div className="p-8 bg-app-card rounded-[2rem] border border-app-border space-y-6">
            <h3 className="text-xl font-bold text-app-text">Provider Profile</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-2xl flex items-center justify-center overflow-hidden border border-app-border">
                {provider?.photoURL ? (
                  <img src={provider.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-2xl font-bold text-neutral-300 dark:text-neutral-600">{provider?.displayName?.[0]}</div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-lg text-app-text">{provider?.displayName}</h4>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Identity Verified
                </div>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{provider?.bio || "A trusted neighbor providing quality services."}</p>
            <button className="flex items-center gap-2 text-sm font-bold text-app-text hover:underline">
              <MessageSquare className="w-4 h-4" /> Contact Provider
            </button>
          </div>
        </div>

        {/* Right: Booking Card */}
        <div className="space-y-6">
          <div className="sticky top-24 bg-app-card border border-app-border p-8 rounded-[2.5rem] shadow-xl shadow-neutral-200/50 dark:shadow-none space-y-8">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Starting from</p>
                <h2 className="text-4xl font-bold text-app-text">${service.price}</h2>
              </div>
              <p className="text-sm text-neutral-400">per hour</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-app-border">
                <Zap className="w-5 h-5 text-neutral-400" />
                <div className="text-xs">
                  <p className="font-bold text-app-text">Instant Booking</p>
                  <p className="text-neutral-500">No pre-approval required</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-app-border">
                <ShieldCheck className="w-5 h-5 text-neutral-400" />
                <div className="text-xs">
                  <p className="font-bold text-app-text">Neighborly Guarantee</p>
                  <p className="text-neutral-500">Secure payment & support</p>
                </div>
              </div>
            </div>

            {bookingSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-center space-y-3"
              >
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-emerald-900 dark:text-emerald-400">Request Sent!</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-500">The provider has been notified. Check your dashboard for updates.</p>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all"
                >
                  Go to Dashboard
                </button>
              </motion.div>
            ) : (
              <button 
                onClick={handleBook}
                disabled={booking}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold rounded-2xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg shadow-neutral-900/20 disabled:opacity-50 active:scale-95"
              >
                {booking ? 'Processing...' : 'Book Now'}
              </button>
            )}

            <p className="text-[10px] text-center text-neutral-400 uppercase tracking-widest font-bold">
              No charge until job completion
            </p>
          </div>
        </div>
      </div>
      
      {/* Notification Toast */}
      {notification && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={cn(
            "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 border",
            notification.type === 'success' 
              ? "bg-emerald-500 text-white border-emerald-400" 
              : "bg-red-500 text-white border-red-400"
          )}
        >
          {notification.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
          <p className="font-bold">{notification.message}</p>
        </motion.div>
      )}
    </div>
  );
}
