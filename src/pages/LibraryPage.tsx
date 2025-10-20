const books = [
  { id: 'L1', title: 'Introduction to Algorithms', author: 'Cormen', status: 'Issued', due: '2025-11-05' },
  { id: 'L2', title: 'Operating Systems', author: 'Silberschatz', status: 'Available', due: '-' },
  { id: 'L3', title: 'Computer Networks', author: 'Tanenbaum', status: 'Reserved', due: '2025-10-30' },
];

export default function LibraryPage() {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold mb-3">Library</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr><th className="py-2">Book</th><th>Author</th><th>Status</th><th>Due</th></tr>
            </thead>
            <tbody>
              {books.map(b => (
                <tr key={b.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                  <td className="py-2">{b.title}</td>
                  <td>{b.author}</td>
                  <td>{b.status}</td>
                  <td>{b.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


