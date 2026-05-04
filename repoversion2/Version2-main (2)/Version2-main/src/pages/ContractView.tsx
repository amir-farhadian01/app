import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, getDoc, serverTimestamp, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, CheckCircle2, AlertCircle, DollarSign, FileText, PenTool, ArrowLeft, Loader2, CreditCard, Banknote } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'platform' | 'cash'>('platform');

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'contracts', id), (doc) => {
      if (doc.exists()) {
        setContract({ id: doc.id, ...doc.data() });
        if (doc.data().paymentMethod) setPaymentMethod(doc.data().paymentMethod);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `contracts/${id}`));

    return () => unsubscribe();
  }, [id]);

  const handleSign = async () => {
    if (!contract || !user) return;
    setIsSigning(true);
    try {
      const isClient = user.uid === contract.customerId;
      const isProvider = user.uid === contract.providerId;

      const updates: any = {};
      if (isClient) {
        updates.clientSigned = true;
        updates.clientSignedAt = new Date().toISOString();
        updates.paymentMethod = paymentMethod;
      } else if (isProvider) {
        updates.providerSigned = true;
        updates.providerSignedAt = new Date().toISOString();
      }

      // If both signed, move to confirmed
      if ((isClient && contract.providerSigned) || (isProvider && contract.clientSigned)) {
        updates.status = 'confirmed';
      }

      await updateDoc(doc(db, 'contracts', contract.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contracts/${contract.id}`);
    } finally {
      setIsSigning(false);
    }
  };

  const handleComplete = async () => {
    if (!contract || !user) return;
    setIsSigning(true);
    try {
      // 1. Mark contract as completed
      await updateDoc(doc(db, 'contracts', contract.id), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      // 2. If payment was cash, update provider debt
      if (contract.paymentMethod === 'cash') {
        const commission = contract.commissionAmount || (contract.amount * 0.1); // Default 10% if not set
        await updateDoc(doc(db, 'users', contract.providerId), {
          currentDebt: increment(commission)
        });
      }

      // 3. Update request status
      await updateDoc(doc(db, 'requests', contract.requestId), {
        status: 'completed'
      });

      navigate('/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contracts/${contract.id}`);
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <AlertCircle className="w-16 h-16 text-neutral-200 mx-auto" />
        <h2 className="text-2xl font-black italic uppercase tracking-tight">Contract Not Found</h2>
        <button onClick={() => navigate('/dashboard')} className="text-sm font-bold text-neutral-400 hover:text-neutral-900 underline">Return to Dashboard</button>
      </div>
    );
  }

  const isClient = user?.uid === contract.customerId;
  const isProvider = user?.uid === contract.providerId;
  const canSign = (isClient && !contract.clientSigned) || (isProvider && !contract.providerSigned);
  const bothSigned = contract.clientSigned && contract.providerSigned;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Service Agreement</h1>
          <p className="text-neutral-500 font-medium">Contract #{contract.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          {/* Legal Terms */}
          <section className="bg-white p-10 rounded-[3rem] border border-neutral-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-neutral-400">
              <FileText className="w-5 h-5" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Legal Terms & Conditions</h3>
            </div>
            <div className="prose prose-neutral max-w-none text-sm leading-relaxed text-neutral-600">
              <p>This agreement is entered into between the Client and the Contractor for the performance of the services specified in Request #{contract.requestId}.</p>
              <h4 className="font-black text-neutral-900 mt-6">1. Contractor Obligations</h4>
              <p>The Contractor agrees to perform the services with the highest quality and within the specified time. Any negligence in performing the work will result in the Contractor's liability.</p>
              <h4 className="font-black text-neutral-900 mt-6">2. Client Obligations</h4>
              <p>The Client agrees to pay the agreed amount after final approval of the work. If paid in cash, the Contractor is responsible for settling the platform commission.</p>
              <h4 className="font-black text-neutral-900 mt-6">3. Platform Commission</h4>
              <p>The platform, as an intermediary, receives an amount of ${contract.commissionAmount || (contract.amount * 0.1)} as a software service fee.</p>
            </div>
          </section>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6">
            <div className={cn(
              "p-8 rounded-[2.5rem] border transition-all space-y-4",
              contract.clientSigned ? "bg-emerald-50 border-emerald-100" : "bg-white border-neutral-100"
            )}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Customer Signature</p>
                {contract.clientSigned && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              </div>
              <div className="h-20 flex items-center justify-center border-b border-dashed border-neutral-200">
                {contract.clientSigned ? (
                  <span className="font-black italic text-xl text-neutral-900 opacity-40">SIGNED</span>
                ) : (
                  <span className="text-neutral-200 italic">Awaiting Signature</span>
                )}
              </div>
              <p className="text-[10px] font-bold text-neutral-400 text-center">
                {contract.clientSignedAt ? new Date(contract.clientSignedAt).toLocaleString() : '---'}
              </p>
            </div>

            <div className={cn(
              "p-8 rounded-[2.5rem] border transition-all space-y-4",
              contract.providerSigned ? "bg-emerald-50 border-emerald-100" : "bg-white border-neutral-100"
            )}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Provider Signature</p>
                {contract.providerSigned && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              </div>
              <div className="h-20 flex items-center justify-center border-b border-dashed border-neutral-200">
                {contract.providerSigned ? (
                  <span className="font-black italic text-xl text-neutral-900 opacity-40">SIGNED</span>
                ) : (
                  <span className="text-neutral-200 italic">Awaiting Signature</span>
                )}
              </div>
              <p className="text-[10px] font-bold text-neutral-400 text-center">
                {contract.providerSignedAt ? new Date(contract.providerSignedAt).toLocaleString() : '---'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Financial Summary */}
          <section className="bg-neutral-900 text-white p-10 rounded-[3rem] space-y-8 shadow-2xl shadow-neutral-900/20">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Amount</p>
              <h3 className="text-5xl font-black italic">${contract.amount.toLocaleString()}</h3>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/60">Platform Fee</span>
                <span className="font-black">${(contract.commissionAmount || (contract.amount * 0.1)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/60">Provider Net</span>
                <span className="font-black text-emerald-400">${(contract.amount - (contract.commissionAmount || (contract.amount * 0.1))).toLocaleString()}</span>
              </div>
            </div>

            {isClient && !contract.clientSigned && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setPaymentMethod('platform')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                      paymentMethod === 'platform' ? "bg-white text-neutral-900 border-white" : "bg-white/5 border-white/10 text-white/60"
                    )}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase">Platform</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                      paymentMethod === 'cash' ? "bg-white text-neutral-900 border-white" : "bg-white/5 border-white/10 text-white/60"
                    )}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase">Cash</span>
                  </button>
                </div>
              </div>
            )}

            {canSign && (
              <button 
                onClick={handleSign}
                disabled={isSigning}
                className="w-full py-4 bg-white text-neutral-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl"
              >
                {isSigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
                Sign Agreement
              </button>
            )}

            {bothSigned && contract.status !== 'completed' && isProvider && (
              <button 
                onClick={handleComplete}
                disabled={isSigning}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl"
              >
                {isSigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Complete Job
              </button>
            )}
          </section>

          {/* Status Alert */}
          <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex gap-4">
            <Shield className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-amber-900">Secure Transaction</h4>
              <p className="text-xs text-amber-700/70 leading-relaxed">
                {contract.paymentMethod === 'cash' 
                  ? "Cash payment is selected. The contractor is responsible for platform commission settlement."
                  : "Payment is processed via the platform. Your funds are secured and guaranteed."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
