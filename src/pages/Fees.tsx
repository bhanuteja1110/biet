import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

type Payment = {
  id: string;
  date: string;
  amount: number;
  mode: string;
  receipt: string;
};

export default function Fees() {
  const { role, user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFees = async () => {
      try {
        // Fetch total fees
        const feesQuery = query(collection(db, 'fees'), where('studentId', '==', user.uid));
        const feesSnapshot = await getDocs(feesQuery);
        if (!feesSnapshot.empty) {
          const feesData = feesSnapshot.docs[0].data();
          setTotal(feesData.total || 0);
        }

        // Fetch payments
        const paymentsQuery = query(collection(db, 'payments'), where('studentId', '==', user.uid));
        const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
          const paymentsData: Payment[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            paymentsData.push({
              id: doc.id,
              date: data.date || '',
              amount: data.amount || 0,
              mode: data.mode || '',
              receipt: data.receipt || '',
            });
          });
          setPayments(paymentsData);
          setLoading(false);
        });
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching fees:', error);
        setLoading(false);
      }
    };

    fetchFees();
  }, [user]);

  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = total - paid;

  if (loading) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">Loading fees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5"><div className="text-sm text-neutral-500">Total Fees</div><div className="text-3xl font-semibold">₹ {total.toLocaleString()}</div></div>
        <div className="card p-5"><div className="text-sm text-neutral-500">Paid</div><div className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">₹ {paid.toLocaleString()}</div></div>
        <div className="card p-5"><div className="text-sm text-neutral-500">Balance</div><div className="text-3xl font-semibold text-amber-600 dark:text-amber-400">₹ {balance.toLocaleString()}</div></div>
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Payment History</div>
        {payments.length === 0 ? (
          <div className="text-neutral-500">No payment history available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr><th className="py-2">Date</th><th>Amount</th><th>Mode</th><th>Receipt</th></tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                    <td className="py-2">{p.date}</td>
                    <td>₹ {p.amount.toLocaleString()}</td>
                    <td>{p.mode}</td>
                    <td><button className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {role !== 'admin' ? (
          <div className="mt-4">
            <a target="_blank" rel="noreferrer" href="https://onlinesbi.sbi.bank.in/sbicollect/icollecthome.htm" className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">Pay Fee (SBI Collect)</a>
          </div>
        ) : (
          <div className="mt-4 text-sm text-neutral-500">Admin can edit per-student fee details here.</div>
        )}
      </div>
    </div>
  );
}

