const ts=require('/workspace/csf-countdown/node_modules/typescript');const fs=require('fs');
let src=fs.readFileSync(__dirname+'/useExtensionConfig.ts','utf8');
const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const Module=require('module');const orig=Module._load;
Module._load=function(r,...a){if(r==='react')return{createContext:()=>({}),createElement(){},useContext(){},useEffect(){},useMemo(){},useRef(){},useState(){}};if(r.startsWith('@airtable'))return{useRecords(){}};return orig.call(this,r,...a)};
const m=new Module('x');m._compile(out,'x.js');const E=m.exports;
const assert=require('assert');
const TOTAL=269; assert.equal(E.FIELD_ORDER.length,TOTAL); assert.equal(new Set(E.FIELD_ORDER).size,TOTAL);
const FO=E.FIELD_ORDER, at=n=>FO.indexOf(n);
assert.equal(at('Toggle_Label_1'),at('Toggle_10')+1); assert.equal(at('Duration_1'),at('Toggle_Label_10')+1);
assert.deepEqual(FO.slice(at('Filter_10'),at('Filter_10')+4),['Filter_10','Filter_Operator_10','Filter_Value_10','Filter_Label_10']);
assert.equal(at('Me_Field'),at('Sort_Direction_2')+1); assert.equal(at('Option_List_10'),at('Color_1')-1); assert.equal(at('Option_List_1'),at('Dropdown_Default_10')+1);
fs.writeFileSync('/tmp/field_order.json',JSON.stringify(E.FIELD_ORDER));
const mkT=(id,name,fields)=>({id,name,fields:fields.map(([fid,fn])=>({id:fid,name:fn})),getFieldByIdIfExists(i){return this.fields.find(f=>f.id===i)??null}});
const slots=mkT('tblAAAAAAAAAAAAA1','Slots_Events',[['fldAAAAAAAAAAAAA1','Status'],['fldAAAAAAAAAAAAA2','Start'],['fldAAAAAAAAAAAAA3','Pickup.Time']]);
const ppl=mkT('tblBBBBBBBBBBBBB1','People v1.2',[['fldBBBBBBBBBBBBB1','Full Name']]);
const base={tables:[slots,ppl],getTableByIdIfExists(i){return this.tables.find(t=>t.id===i)??null}};
const r=(s,c=null)=>{const x=E.resolveRef(base,s,c);return [x.table?.name??null,x.field?.name??null]};
assert.deepEqual(r('Slots_Events.Status'),['Slots_Events','Status']);
assert.deepEqual(r('slots events.status'),['Slots_Events','Status']);
assert.deepEqual(r('Slots_Events'),['Slots_Events',null]);
assert.deepEqual(r('People v1.2.Full Name'),['People v1.2','Full Name']);
assert.deepEqual(r('Slots_Events.Pickup.Time'),['Slots_Events','Pickup.Time']);
assert.deepEqual(r('Start',slots),['Slots_Events','Start']);
assert.deepEqual(r('tblAAAAAAAAAAAAA1.fldAAAAAAAAAAAAA2'),['Slots_Events','Start']);
assert.deepEqual(r('fldBBBBBBBBBBBBB1'),['People v1.2','Full Name']);
assert.deepEqual(r('Slots_Events.Nope'),['Slots_Events',null]);
assert.deepEqual(r('Nope'),[null,null]);
assert.deepEqual(E.parseOptionList('# c\nמשובץ\nהקרנה | הקרנה | #2563eb | 🎬\n\n'),[{value:'משובץ',label:'משובץ',color:'',icon:''},{value:'הקרנה',label:'הקרנה',color:'#2563eb',icon:'🎬'}]);
// v3: icon/colour optional, trailing pipe, blank = ''
assert.deepEqual(E.parseOptionList('Staffing | צוות | #9e1a44 |\nTasks | משימות\n360 | 6 שעות ||'),[{value:'Staffing',label:'צוות',color:'#9e1a44',icon:''},{value:'Tasks',label:'משימות',color:'',icon:''},{value:'360',label:'6 שעות',color:'',icon:''}]);
const st=E.parseOptionList('Todo | לביצוע\nלא התחילה | לביצוע\nDone | הושלם');
assert.equal(E.optionLabel(st,'לא התחילה'),'לביצוע'); assert.equal(E.optionLabel(st,'todo'),'לביצוע'); assert.equal(E.optionLabel(st,'אחר'),'אחר');
// multi-field filter cells
assert.deepEqual(E.splitRefs(' Slots_Events.Location | Staffing.Location (from Slot) |'),['Slots_Events.Location','Staffing.Location (from Slot)']);
// tokens
const now=new Date('2026-10-09T16:49:00Z'); const ctx={now,date:n=>n===1?new Date('2026-10-16T08:00:00+03:00'):null};
assert.equal(E.expandToken('@now',ctx),now.toISOString());
assert.equal(E.expandToken('@today',ctx),'2026-10-08T21:00:00.000Z'); // 00:00 IL (UTC+3)
assert.equal(E.expandToken('@Date_1-1d',ctx),'2026-10-15T05:00:00.000Z');
assert.equal(E.expandToken('@date_1 + 2h',ctx),'2026-10-16T07:00:00.000Z');
assert.equal(E.expandToken('@Date_2',ctx),null);
assert.equal(E.expandToken('למחיקה',ctx),'למחיקה');
assert.ok(E.isMeToken('@ME')); assert.ok(!E.isMeToken('@meh'));
// Advanced_JSON schema
let j=E.parseAdvancedJson('{"filters":[{"field":"Tasks.Status","operator":"is not","value":"בוטלה|הועברה לאחר"},{"value":"x"}],"filterMap":{"1":{"fields":["Staffing.Location (from Slot)"],"unmatched":"hide"},"x":{}},"closedByDefault":["Notebook"]}');
assert.equal(j.json.filters.length,1); assert.deepEqual(j.json.filterMap,{"1":{fields:['Staffing.Location (from Slot)'],unmatched:'hide'}});
assert.deepEqual(j.json.closedByDefault,['Notebook']); assert.equal(j.problems.length,2);
assert.deepEqual(E.parseAdvancedJson('{oops').json,null); assert.equal(E.parseAdvancedJson('').problems.length,0);
assert.equal(E.parseAdvancedJson('[1]').json,null);
// @me → person records
const meF={id:'fldMe'}; const rec=(id,c)=>({id,getCellValue:()=>c});
const recs=[rec('recA',{id:'usrDemoUser',email:'d@x.il'}),rec('recB',[{id:'usrOther'}]),rec('recC','D@X.IL'),rec('recD',null)];
assert.deepEqual(E.meRecordIds(recs,meF,{id:'usrDemoUser',email:'d@x.il'}),['recA','recC']);
assert.deepEqual(E.meRecordIds(recs,null,{id:'usrDemoUser'}),[]);
assert.equal(E.initialToggle(null,true),true);assert.equal(E.initialToggle(false,true),false);
console.log('all ok', E.FIELD_ORDER.length);
