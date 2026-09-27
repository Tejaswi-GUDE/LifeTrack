import { useState } from 'react';
import { useSession } from '../../context/SessionContext';

export default function Import() {
  const { session } = useSession();
  const [csv, setCsv] = useState('');
  const [courseId, setCourseId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!csv || !courseId) {
      alert('Enter CSV data and select a course');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv,
          providerId: session.id,
          courseId,
          dedupeBy: ['contact'],
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1>Import Trainees</h1>
      <p style={{ color: 'var(--slate)' }}>Paste CSV (name, contact, district, status) to import and deduplicate trainee records.</p>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>CSV Data</label>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="name,contact,district,status&#10;Lakshmi,9876543210,Ranchi,employed&#10;Priya,9876543211,Ranchi,unemployed"
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '12px',
            border: '1px solid var(--slate-30)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Course</label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--slate-30)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <option value="">Select a course...</option>
          <option value="course1">Advanced Python</option>
          <option value="course2">Web Development</option>
        </select>
      </div>

      <button
        onClick={handleImport}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: 'var(--ink)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        {loading ? 'Importing...' : 'Import'}
      </button>

      {result && (
        <div style={{ marginTop: '32px', padding: '16px', background: 'var(--slate-5)', borderRadius: 'var(--radius-md)' }}>
          <h3>Import Result</h3>
          <p>✓ Created: {result.summary?.created}</p>
          <p>⚊ Matched (skipped): {result.summary?.matched}</p>
          <p>✗ Errors: {result.summary?.errors}</p>
        </div>
      )}
    </div>
  );
}
