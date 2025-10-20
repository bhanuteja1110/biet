import { useAuth } from '../auth/AuthContext';

const payments = [
  { id: 'p1', date: '2025-01-15', amount: 20000, mode: 'Online', receipt: '#RC123' },
  { id: 'p2', date: '2025-03-10', amount: 15000, mode: 'Cash', receipt: '#RC124' },
];

export default function Fees() {
  const total = 70000;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = total - paid;
  const { role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5"><div className="text-sm text-neutral-500">Total Fees</div><div className="text-3xl font-semibold">₹ {total.toLocaleString()}</div></div>
        <div className="card p-5"><div className="text-sm text-neutral-500">Paid</div><div className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">₹ {paid.toLocaleString()}</div></div>
        <div className="card p-5"><div className="text-sm text-neutral-500">Balance</div><div className="text-3xl font-semibold text-amber-600 dark:text-amber-400">₹ {balance.toLocaleString()}</div></div>
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Payment History</div>
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
        {role !== 'admin' ? (
          <div className="mt-4">
            <a target="_blank" rel="noreferrer" href="https://onlinesbi.sbi.bank.in/sbicollect/icollecthome.htm" className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">Pay Fee (SBI Collect)</a>
          </div>
        ) : (
          <div className="mt-4 text-sm text-neutral-500">Admin can edit per-student fee details here. (Demo state only)</div>
        )}
      </div>
    </div>
  );
}


