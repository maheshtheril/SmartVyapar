const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\territories\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

const editIconImport = `import { Map, Plus, ChevronRight, FolderTree, MapPin, Edit2, Trash2 } from 'lucide-react';`;
c = c.replace(/import \{ Map, Plus, ChevronRight, FolderTree, MapPin \} from 'lucide-react';/, editIconImport);

const actionFunctions = `
  const handleEdit = async (id: string, type: string, currentName: string) => {
    const newName = window.prompt(\`Edit \${type} Name:\`, currentName);
    if (!newName || newName.trim() === '' || newName === currentName) return;
    
    try {
      const res = await fetch('/api/territories/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: \`UPDATE_\${type}\`, id, name: newName.trim() })
      });
      if (res.ok) load();
    } catch (e) {
      alert("Failed to update");
    }
  };

  const handleDelete = async (id: string, type: string, name: string) => {
    if (!window.confirm(\`Are you sure you want to delete \${name}? This will also delete all children underneath it.\`)) return;
    
    try {
      const res = await fetch('/api/territories/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: \`DELETE_\${type}\`, id })
      });
      if (res.ok) load();
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const ActionButtons = ({ id, type, name }: { id: string, type: string, name: string }) => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
      <button onClick={() => handleEdit(id, type, name)} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Edit2 className="h-3 w-3" /></button>
      <button onClick={() => handleDelete(id, type, name)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 className="h-3 w-3" /></button>
    </div>
  );
`;

c = c.replace(/useEffect\(\(\) => \{/, actionFunctions + '\n  useEffect(() => {');

// Update UI rendering for Region
c = c.replace(/<div className="font-black text-sm text-indigo-900 flex items-center gap-1\.5"><MapPin className="h-3\.5 w-3\.5 text-indigo-500" \/> \{region\.name\} \(Region\)<\/div>/, 
  `<div className="font-black text-sm text-indigo-900 flex items-center gap-1.5 group"><MapPin className="h-3.5 w-3.5 text-indigo-500" /> {region.name} (Region) <ActionButtons id={region.id} type="REGION" name={region.name} /></div>`);

// Update UI rendering for Zone
c = c.replace(/<div className="font-bold text-xs text-slate-700 flex items-center gap-1"><ChevronRight className="h-3 w-3 text-slate-400"\/> \{zone\.name\} \(Zone\)<\/div>/, 
  `<div className="font-bold text-xs text-slate-700 flex items-center gap-1 group"><ChevronRight className="h-3 w-3 text-slate-400"/> {zone.name} (Zone) <ActionButtons id={zone.id} type="ZONE" name={zone.name} /></div>`);

// Update UI rendering for Territory
c = c.replace(/<div className="font-semibold text-\[11px\] text-slate-600 flex items-center gap-1"><ChevronRight className="h-2 w-2 text-slate-300"\/> \{territory\.name\} \(Territory\)<\/div>/, 
  `<div className="font-semibold text-[11px] text-slate-600 flex items-center gap-1 group"><ChevronRight className="h-2 w-2 text-slate-300"/> {territory.name} (Territory) <ActionButtons id={territory.id} type="TERRITORY" name={territory.name} /></div>`);

// Update UI rendering for Beat
c = c.replace(/<div key=\{beat\.id\} className="text-\[10px\] text-slate-500 flex items-center gap-1">/, 
  `<div key={beat.id} className="text-[10px] text-slate-500 flex items-center gap-1 group">`);
c = c.replace(/<span className="h-1 w-1 rounded-full bg-slate-300"><\/span> \{beat\.name\}\n\s*<\/div>/, 
  `<span className="h-1 w-1 rounded-full bg-slate-300"></span> {beat.name} <ActionButtons id={beat.id} type="BEAT" name={beat.name} />\n                                          </div>`);

fs.writeFileSync(p, c, 'utf8');
console.log('UI updated with edit and delete buttons');
