const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/lab/page.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Add User, X, Loader2 to lucide-react import
code = code.replace(
  "import { \n  FlaskConical,",
  "import { \n  FlaskConical,\n  User,\n  X,\n  Loader2,"
);

// 2. Add search and cart state variables
const stateAnchor = "  const [submittingOrder, setSubmittingOrder] = useState(false);";
const stateAdditions = `  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Split-Screen Lab Accession Form & Cart State
  const [patientMode, setPatientMode] = useState<'WALK_IN' | 'REGISTERED'>('WALK_IN');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  const handleSearchPatients = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    try {
      const res = await fetch(\`/api/customers?q=\${encodeURIComponent(query.trim())}&limit=5\`);
      const data = await res.json();
      if (data.success) {
        setCustomerSearchResults(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to search customers:', err);
    }
  };

  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      testSearchQuery === '' ||
      t.name.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(testSearchQuery.toLowerCase()));

    const matchesDept =
      selectedDepartment === 'ALL' ||
      (t.department && t.department.toUpperCase() === selectedDepartment.toUpperCase());

    return matchesSearch && matchesDept;
  });

  const selectedTestObjects = tests.filter((t) => selectedTestIds.includes(t.id));
  const estimatedTotal = selectedTestObjects.reduce((sum, t) => sum + Number(t.price || 0), 0);

  const toggleTestSelection = (testId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };`;

if (code.includes(stateAnchor) && !code.includes('selectedDepartment')) {
  code = code.replace(stateAnchor, stateAdditions);
  console.log('State variables added successfully');
}

// 3. Clear states on creation
code = code.replace(
  "setSelectedTestIds([]);\n        loadData();",
  "setSelectedTestIds([]);\n        setCustomerSearchQuery('');\n        setCustomerSearchResults([]);\n        setTestSearchQuery('');\n        setSelectedDepartment('ALL');\n        loadData();"
);

// 4. Split-screen modal replacement using boundary comments
const startTag = "{/* New Lab Accession Walk-In Modal */}";
const endTag = "{/* Tube Barcode Sticker Modal */}";

const startIndex = code.indexOf(startTag);
const endIndex = code.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
  const newModalSection = `{/* Advanced Split-Screen Lab Accession Modal */}
      {newOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-black text-slate-900">New Diagnostic Lab Accession</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                      LIMS Requisition
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Search registered patients or register walk-in patient with live requisition cart
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewOrderModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Split Screen Columns */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              
              {/* LEFT COLUMN: Patient Info & Test Catalog (7 Cols / ~58%) */}
              <div className="lg:col-span-7 p-6 space-y-4 overflow-y-auto">
                
                {/* Mode Selector Tabs (Registered Patient vs Walk-In) */}
                <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setPatientMode('WALK_IN')}
                    className={\`flex items-center justify-center space-x-1.5 rounded-lg py-1.5 transition \${
                      patientMode === 'WALK_IN'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'hover:text-slate-900'
                    }\`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Walk-in / Outside Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientMode('REGISTERED')}
                    className={\`flex items-center justify-center space-x-1.5 rounded-lg py-1.5 transition \${
                      patientMode === 'REGISTERED'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'hover:text-slate-900'
                    }\`}
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Search Registered Patient</span>
                  </button>
                </div>

                {/* Autocomplete Patient Search (when in Registered Mode) */}
                {patientMode === 'REGISTERED' && (
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Search Patient by Name, Phone, or ID
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          handleSearchPatients(e.target.value);
                        }}
                        placeholder="Type patient name or mobile number (e.g. Ramesh, 98765...)..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                      />
                    </div>

                    {customerSearchResults.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-1 space-y-1">
                        {customerSearchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setNewPatientName(c.name);
                              setNewPatientPhone(c.phone || '');
                              setCustomerSearchResults([]);
                              setCustomerSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-xs flex items-center justify-between transition"
                          >
                            <span className="font-bold text-slate-800">{c.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Demographics Grid */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newPatientName}
                        onChange={(e) => setNewPatientName(e.target.value)}
                        placeholder="e.g. Ramesh Nair"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={newPatientPhone}
                        onChange={(e) => setNewPatientPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Age (Years) *</label>
                      <input
                        type="number"
                        required
                        value={newPatientAge}
                        onChange={(e) => setNewPatientAge(e.target.value)}
                        placeholder="e.g. 45"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                      <select
                        value={newPatientGender}
                        onChange={(e) => setNewPatientGender(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-bold"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Referring Clinician</label>
                      <select
                        value={newDoctorId}
                        onChange={(e) => setNewDoctorId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-semibold truncate"
                      >
                        <option value="">Self / Walk-in</option>
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fast Test Catalog Search & Filter */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Search & Add Lab Tests / Panels
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {filteredTests.length} investigations available
                    </span>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      placeholder="Type test name to search (e.g. CBC, Lipid, Blood Sugar, LFT)..."
                      className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    {testSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTestSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Department Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
                    {['ALL', 'HEMATOLOGY', 'BIOCHEMISTRY', 'LIPID', 'IMMUNOLOGY'].map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDepartment(dept)}
                        className={\`px-2.5 py-1 rounded-lg transition shrink-0 \${
                          selectedDepartment === dept
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }\`}
                      >
                        {dept === 'ALL' ? 'All Departments' : dept}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable Test Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 border border-slate-200 rounded-2xl bg-slate-50/50">
                    {filteredTests.map((t) => {
                      const isSelected = selectedTestIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTestSelection(t.id)}
                          className={\`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between select-none \${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                          }\`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold truncate">{t.name}</div>
                            <div className={\`text-[10px] flex items-center space-x-1.5 mt-0.5 \${isSelected ? 'text-indigo-200' : 'text-slate-500'}\`}>
                              <span className="font-mono">{t.code}</span>
                              <span>•</span>
                              <span>{t.department}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-xs">₹{Number(t.price).toFixed(2)}</div>
                            <div className={\`text-[9px] font-semibold \${isSelected ? 'text-indigo-200' : 'text-indigo-600'}\`}>
                              {isSelected ? '✓ Added' : '+ Add'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredTests.length === 0 && (
                      <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                        No diagnostic tests match &quot;{testSearchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Live Selected Tests Cart & Bill Estimator (5 Cols / ~42%) */}
              <div className="lg:col-span-5 p-6 bg-slate-50/60 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Selected Tests ({selectedTestObjects.length})
                      </h4>
                    </div>
                    {selectedTestIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTestIds([])}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Empty State */}
                  {selectedTestObjects.length === 0 ? (
                    <div className="py-12 px-4 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl bg-white/70">
                      <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400">
                        <FlaskConical className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No tests added yet</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Type in the search box to find and add tests. They will appear here in real time with live bill calculation.
                      </p>
                    </div>
                  ) : (
                    /* Selected Test Items */
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedTestObjects.map((t, idx) => (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                              <span className="font-bold text-slate-800 truncate">{t.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1">
                              <span>{t.department}</span>
                              <span>•</span>
                              <span className="text-indigo-600 font-medium">{t.specimenType || 'Venous Blood'}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="font-bold text-slate-900">₹{Number(t.price).toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => toggleTestSelection(t.id)}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Remove test"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Pricing Summary & Actions */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Investigations</span>
                      <span className="font-bold text-slate-800">{selectedTestObjects.length} items</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Specimen Tubes Required</span>
                      <span className="font-medium text-slate-700">
                        {selectedTestObjects.length > 0 ? \`\${selectedTestObjects.length} Vacutainer(s)\` : '0'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">Estimated Total</span>
                      <span className="text-lg font-black text-indigo-600">
                        ₹{estimatedTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setNewOrderModal(false)}
                      className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingOrder || !newPatientName.trim() || selectedTestIds.length === 0}
                      onClick={handleCreateOrder}
                      className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center space-x-1.5"
                    >
                      {submittingOrder ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Accessioning...</span>
                        </>
                      ) : (
                        <>
                          <Barcode className="h-4 w-4" />
                          <span>Register Accession & Barcode</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      `;

  code = code.slice(0, startIndex) + newModalSection + code.slice(endIndex);
  fs.writeFileSync('src/app/(app)/lab/page.tsx', code, 'utf8');
  console.log('src/app/(app)/lab/page.tsx successfully upgraded to split-screen accession modal!');
} else {
  console.error(`Boundary tags not found: startIndex=${startIndex}, endIndex=${endIndex}`);
}
