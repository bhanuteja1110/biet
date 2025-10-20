const drives = [
  { company: 'TCS', role: 'Software Engineer', date: '2025-12-05', ctc: '₹ 7 LPA', apply: 'https://nextstep.tcs.com' },
  { company: 'Infosys', role: 'Systems Engineer', date: '2025-12-12', ctc: '₹ 5.5 LPA', apply: 'https://careers.infosys.com' },
  { company: 'Amazon', role: 'SDE Intern', date: '2025-12-20', ctc: 'Stipend ₹ 80,000', apply: 'https://www.amazon.jobs' },
];

export default function Placements() {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold">Placement Drives</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr><th className="py-2">Company</th><th>Role</th><th>Date</th><th>CTC</th><th>Apply</th></tr>
            </thead>
            <tbody>
              {drives.map((d, i) => (
                <tr key={i} className="border-t border-neutral-200/60 dark:border-neutral-800">
                  <td className="py-2">{d.company}</td>
                  <td>{d.role}</td>
                  <td>{d.date}</td>
                  <td>{d.ctc}</td>
                  <td><a href={d.apply} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">Apply</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


