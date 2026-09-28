const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\inventory\\\\suppliers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

// Fix the undefined fetchSuppliers method
c = c.replace(/fetchSuppliers\(\);/g, 'loadSuppliers();');

// Improve error handling
c = c.replace(/const \[submitting, setSubmitting\] = useState\(false\);/, `const [submitting, setSubmitting] = useState(false);\n  const [formError, setFormError] = useState('');`);

// Clear formError on open
c = c.replace(/onClick=\{\(\) => setIsModalOpen\(true\)\}/, `onClick={() => { setIsModalOpen(true); setFormError(''); }}`);
c = c.replace(/onClick=\{\(\) => \{ setEditSupplier\(s\); setIsEditModalOpen\(true\); \}\}/, `onClick={() => { setEditSupplier(s); setIsEditModalOpen(true); setFormError(''); }}`);

// Form submission handler
const handleSubmitNew = `
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gstin, phone, email, address })
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setIsModalOpen(false);
        setName('');
        setGstin('');
        setPhone('');
        setEmail('');
        setAddress('');
        loadSuppliers();
      } else {
        setFormError(data?.error || "Server returned an invalid response.");
      }
    } catch (err: any) {
      setFormError(err.message || "Network error. Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };
`;
c = c.replace(/const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?finally \{\s*setSubmitting\(false\);\s*\}\s*\};/, handleSubmitNew.trim());

// Add error display to Add modal
c = c.replace(/<form onSubmit=\{handleSubmit\} className="p-6 space-y-4">/, `<form onSubmit={handleSubmit} className="p-6 space-y-4">\n                {formError && <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{formError}</div>}`);

// Add error display to Edit modal
c = c.replace(/<form onSubmit=\{async \(e\) => \{/, `{formError && <div className="px-6 pt-4"><div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{formError}</div></div>}\n            <form onSubmit={async (e) => {`);

c = c.replace(/e\.preventDefault\(\);\n\s*try \{/, `e.preventDefault();\n              setFormError('');\n              try {`);

c = c.replace(/\} catch \(e\) \{\}/, `} else {\n                  const data = await res.json().catch(()=>null);\n                  setFormError(data?.error || "Failed to update supplier.");\n                }\n              } catch (e: any) { setFormError(e.message || "Failed to update supplier."); }`);

fs.writeFileSync(p, c, 'utf8');
console.log('Improved supplier error handling and fixed fetchSuppliers');
