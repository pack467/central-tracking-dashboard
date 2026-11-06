import {readFileSync,writeFileSync} from 'node:fs';import ts from '../frontend/node_modules/typescript/lib/typescript.js';
function rewriteFunction(path,name,replacement){let s=readFileSync(path,'utf8');const sf=ts.createSourceFile(path,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n;ts.forEachChild(n,walk);}walk(sf);if(!found)throw Error(name);s=s.slice(0,found.getStart(sf))+replacement+s.slice(found.getEnd());writeFileSync(path,s);}
function importFrom(path,names){let s=readFileSync(path,'utf8');if(s.includes('import { Select } from "@/app/components/ui/Select";'))s=s.replace('import { Select } from "@/app/components/ui/Select";',`import { Select, ${names} } from "@/app/components/ui/Select";`);else{s=s.replace(/^("use client";\r?\n)?/,match=>match+`\nimport { ${names} } from "@/app/components/ui/Select";\n`);}writeFileSync(path,s);}
let p='frontend/app/components/tickets/TicketReportView.tsx';
rewriteFunction(p,'AnalyticsShifterMultiSelect',`function AnalyticsShifterMultiSelect({ selectedList, onChange, staffList }: { selectedList: string[]; onChange: (list: string[]) => void; staffList: typeof STAFF_ROSTER }) {
  return <MultiSelect label="Shifter (PIC)" aria-label="Filter Shifter / PIC" value={selectedList} onChange={onChange} options={staffList.map(staff => ({ value: staff.name, label: staff.name }))} icon={<Users size={16} />} className="analytics-shifter-trigger h-[34px] w-full text-[11.5px]" title={selectedList.length ? selectedList.join(", ") : "Filter Shifter / PIC"} formatValue={values => {
    if (!values.length) return "Semua Shifter (14 Staf)";
    if (values.length === 1) return values[0].split(" ").slice(0, 2).join(" ");
    if (values.length === 2) return values.map(value => value.split(" ")[0]).join(", ");
    return values.length + " Shifter Terpilih";
  }} />;
}`);importFrom(p,'MultiSelect');
p='frontend/app/components/handover/HandoverHistoryControls.tsx';
rewriteFunction(p,'ShifterMultiSelect',`function ShifterMultiSelect({ value, onChange, records }: { value: string; onChange: (val: string) => void; records: StoredHandoverRecord[] }) {
  const selectedList = useMemo(() => value ? value.split(/[,|]/).map(name => name.trim()).filter(Boolean) : [], [value]);
  const allShifters = useMemo(() => {
    const names = new Set<string>(DEFAULT_NOC_SHIFTERS);
    for (const record of records) {
      try { const parsed = typeof record.content === "string" ? JSON.parse(record.content) : record.content; if (parsed?.sourcePic) names.add(parsed.sourcePic); if (parsed?.targetPic) names.add(parsed.targetPic); } catch { /* Keep the existing malformed-record fallback. */ }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [records]);
  return <MultiSelect label="Shifter (PIC)" aria-label="Filter Shifter PIC" value={selectedList} onChange={names => onChange(names.join(", "))} options={allShifters.map(name => ({ value: name, label: name }))} selectAllMode="add-filtered" icon={<Users size={16} />} className="w-full h-[38px] text-[12px]" formatValue={names => !names.length ? "Semua Shifter" : names.length <= 2 ? names.join(", ") : names.slice(0, 2).join(", ") + " (+" + (names.length - 2) + ")"} />;
}`);importFrom(p,'MultiSelect');
p='frontend/app/components/dashboard/MonitoringSchedule.tsx';
rewriteFunction(p,'ScheduleFilterDropdown',`function ScheduleFilterDropdown({ id, icon, label, allLabel, totalCount, selectedValue, options, onSelect }: ScheduleFilterDropdownProps) {
  const activeOption = options.find(option => option.name.toLowerCase() === selectedValue?.toLowerCase());
  const displayLabel = selectedValue ? selectedValue + " (" + (activeOption?.count ?? 0) + ")" : allLabel + " (" + totalCount + ")";
  return <Select id={id} label={label} aria-label={"Filter " + label + ": " + displayLabel} title={"Filter " + label + ": " + displayLabel} value={selectedValue ?? ""} onValueChange={value => onSelect(value || null)} icon={icon} renderValue={() => displayLabel} className="h-8 text-[11.5px] font-semibold" options={[{ value: "", label: allLabel, meta: totalCount }, ...options.map(option => ({ value: option.name, label: option.name, meta: option.count }))]} />;
}`);importFrom(p,'Select');
// Controls that relied on native modal selectors receive the form variant explicitly.
const files=JSON.parse(readFileSync('output/mobile-round3/select-inventory.json','utf8')).map(r=>r.file);
for(const file of new Set(files)){
 let s=readFileSync(file,'utf8'),sf=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 function walk(node){if(ts.isJsxOpeningElement(node)&&node.tagName.getText(sf)==='Select'&&!node.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.text==='className'))edits.push(node.tagName.getEnd());ts.forEachChild(node,walk);}walk(sf);
 for(const at of edits.sort((a,b)=>b-a))s=s.slice(0,at)+' size="form" className="w-full"'+s.slice(at);
 writeFileSync(file,s);
}
