# Builds harness/fixture.json — SDK-shaped tables/records mirroring the DEMO seed (appiN9MrP73g6R9hi, 2026-10-09)
# from /workspace/csf-days-screens-2026-10-09/data/data_v7.json (+ junk/placeholder rows from build_data.py).
import json, datetime
from zoneinfo import ZoneInfo
TZ=ZoneInfo('Asia/Jerusalem')
D=json.load(open('/workspace/csf-days-screens-2026-10-09/data/data_v7.json'))
def utc(local):  # 'YYYY-MM-DDTHH:MM' Israel → UTC ISO
    return datetime.datetime.fromisoformat(local).replace(tzinfo=TZ).astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
T={}
def table(name,fields):
    T[name]={'id':'tbl'+name.replace(' ','')[:10],'name':name,'fields':[{'id':'fld'+name[:3]+f[0].replace(' ','')[:12],'name':f[0],'type':f[1]} for f in fields],'records':[]}
def rec(t,rid,cells): T[t]['records'].append({'id':rid,'cells':cells})
L=lambda names:[{'id':'rec'+str(abs(hash(n)))[:10],'name':n} for n in names]
FD=[]
table('Festival Days',[('Name','singleLineText'),('Date','date')])
for d in D['days']:
    rid='recFD'+d['date'].replace('-','')
    FD.append(rid); rec('Festival Days',rid,{'Name':d['name'],'Date':d['date']})
fd=lambda date:[{'id':'recFD'+date.replace('-',''),'name':date}] if date else []
table('Slots_Events',[('Slot','singleLineText'),('Type','singleSelect'),('Location','multipleRecordLinks'),('Start','dateTime'),('End','dateTime'),('Status','singleSelect'),('Films','multipleRecordLinks'),('Festival Days','multipleRecordLinks')])
table('Staffing',[('Name','formula'),('Status','singleSelect'),('Slots_Events','multipleRecordLinks'),('Assignments','multipleRecordLinks'),('Notes','multilineText'),('Festival Days','multipleRecordLinks')])
table('Invitations',[('Invitation Name','singleLineText'),('Status','singleSelect'),('Person to invite','multipleRecordLinks'),('Slots_Events','multipleRecordLinks'),('Festival Days','multipleRecordLinks')])
table('Itinerary',[('Itinerary key','singleLineText'),('Day','date'),('Pickup City','singleLineText'),('Drop off City','singleLineText'),('People','multipleRecordLinks'),('Slots_Events for input','multipleRecordLinks')])
table('Lodging',[('Lodging key','singleLineText'),('Check-in date','date'),('Check-out date','date'),('Hotel','multipleRecordLinks'),('Guest','multipleRecordLinks')])
table('Booking Resources',[('Name','formula'),('Status','singleSelect'),('Slots_Events','singleLineText'),('Festival Days','multipleRecordLinks')])
table('Tasks',[('Name','singleLineText'),('Status','singleSelect'),('Start Date','date'),('Deadline','date'),('Owner','singleCollaborator')])
table('Social Posts',[('Post title','singleLineText'),('Publish at','date'),('Status','singleSelect')])
table('Petty Cash',[('Name','singleLineText'),('Request Date','date'),('Cash_paid','currency')])
table('Requests',[('Name','singleLineText'),('Request Date','date'),('Amount','currency')])
table('transactions',[('Approval Number','singleLineText'),('Payment Date','date'),('Amount','currency')])
table('Notebook',[('Subject','singleLineText'),('Meeting Date','date')])
table('Approvals',[('ID','autoNumber'),('Approved At','dateTime'),('Due Date','date'),('Amount','currency'),('Status','singleSelect')])
HALLREV={'אולם ספיר א׳':'אולם ספיר א׳','אולם ספיר ב׳':'אולם ספיר ב׳','קולנוע דרום — אולם ראשי':'קולנוע דרום — אולם ראשי'}
HOT={'מלון 04':'DEMO Locations 04','מלון 06':'DEMO Locations 06'}
for i in D['items']:
    t=i['table'];rid=i['id'];sel=lambda v:{'name':v} if v else None
    if t=='Slots_Events':
        typ=i['sub'].split(' · ')[-1]
        rec(t,rid,{'Slot':i['name'],'Type':sel(typ),'Location':L(i['hall']),'Start':utc(i['start']),'End':utc(i['end']),'Status':sel(i['status']),'Films':L(i['films']),'Festival Days':fd(i['start'][:10])})
    elif t=='Staffing':
        rec(t,rid,{'Name':i['name'],'Status':sel(i['status']),'Slots_Events':[{'id':s,'name':s} for s in i['slots']],'Assignments':L([i['name']]),'Festival Days':fd((i['start'] or i['date'] or '')[:10])})
    elif t=='Invitations':
        rec(t,rid,{'Invitation Name':i['name'],'Status':sel(i['status']),'Person to invite':L(i['people']),'Slots_Events':[{'id':s,'name':s} for s in i['slots']]})
    elif t=='Itinerary':
        a,b=(i['sub'].replace('נסיעה: ','').split(' · ')[0],'')
        nm=i['name'].split(' · ')[-1]; pc,dc=(nm.split('→')+[''])[:2]
        rec(t,rid,{'Itinerary key':i['name'],'Day':(i['start'] or i['date'] or '')[:10] or None,'Pickup City':pc,'Drop off City':dc,'People':L(i['people']),'Slots_Events for input':[{'id':s,'name':s} for s in i['slots']]})
    elif t=='Lodging':
        g=i['guest'];rec(t,rid,{'Lodging key':i['name']+' · DEMO','Check-in date':i['start'][:10],'Check-out date':i['end'][:10],'Hotel':L([HOT[i['hotel']]]),'Guest':L([g])})
    elif t=='Booking Resources':
        rec(t,rid,{'Name':i['name'],'Status':sel(i['status']),'Festival Days':fd(i['date'])})
    elif t=='Tasks':
        rec(t,rid,{'Name':i['name'],'Status':sel(i['status']),'Start Date':i['date'],'Deadline':i['date_end'],'Owner':({'id':'usrDEMOuser','name':i['people'][0]} if i['people'] else None)})
    elif t=='Social Posts': rec(t,rid,{'Post title':i['name'],'Publish at':i['date'],'Status':sel(i['status'])})
    elif t=='Petty Cash': rec(t,rid,{'Name':i['name'],'Request Date':i['date'],'Cash_paid':float(i['sub'].strip('₪').replace(',',''))})
    elif t=='Requests': rec(t,rid,{'Name':i['name'],'Request Date':i['date'],'Amount':float(i['sub'].strip('₪').replace(',',''))})
    elif t=='transactions': rec(t,rid,{'Approval Number':i['name'],'Payment Date':i['date'],'Amount':float(i['sub'].strip('₪').replace(',',''))})
    elif t=='Notebook': rec(t,rid,{'Subject':i['name'],'Meeting Date':i['date']})
    elif t=='Approvals': rec(t,rid,{'ID':str(len(T[t]['records'])+1),'Approved At':utc(i['start']),'Amount':float(i['name'].split('₪')[1].replace(',','')),'Status':{'name':'Approved'}})
# DEMO placeholders (should be hidden by the junk filter)
for n in range(1,25): rec('Slots_Events','recDemoSlot%02d'%n,{'Slot':'DEMO Slot %02d'%n,'Type':{'name':'לא מוגדר'},'Location':[],'Start':None,'End':None,'Status':None,'Films':[],'Festival Days':[]})
rec('Slots_Events','recJunkType',{'Slot':'משבצת ישנה','Type':{'name':'למחיקה'},'Location':[],'Start':utc('2026-11-02T10:00'),'End':utc('2026-11-02T11:00'),'Status':None,'Films':[],'Festival Days':[]})
rec('Tasks','recJunkTask',{'Name':'משימה שבוטלה','Status':{'name':'בוטלה'},'Start Date':'2026-11-02','Deadline':None,'Owner':None})
# Privacy: real collaborator names / ids never go into the fixture (it is published on GitHub).
import os
_RP='/workspace/.private/redactions.json'   # box-only map, never committed
_REDACT=json.load(open(_RP))['replace'] if os.path.exists(_RP) else []
_out=json.dumps({'tables':list(T.values())},ensure_ascii=False)
for _a,_b in _REDACT: _out=_out.replace(_a,_b)
open('fixture.json','w').write(_out)
print({k:len(v['records']) for k,v in T.items()})
