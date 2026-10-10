import React, {useMemo, useState} from 'react';
import {
    initializeBlock,
    useBase,
    useRecords,
    Box,
    Button,
    Text,
    Input,
} from '@airtable/blocks/ui';

/**
 * CSF hospitality glass.
 * One lens on screen. Day and person survive a lens switch.
 * Read only. No writes.
 *
 * Curly buttons = lens chooser.
 * Square field = search only. Add stays in the grid.
 */

const LENSES = [
    {id: 'day', label: 'יום', table: 'Itinerary'},
    {id: 'people', label: 'אנשים', table: 'People'},
    {id: 'staff', label: 'שיבוץ', table: 'Staffing'},
    {id: 'food', label: 'אוכל + שתיה', table: 'Vouchers'},
    {id: 'lodge', label: 'לינה', table: 'Lodging'},
    {id: 'trips', label: 'נסיעות', table: 'Trips'},
];

function safeTable(base, name) {
    try {
        return base.getTableByName(name);
    } catch (e) {
        return null;
    }
}

function links(record, fieldName) {
    const value = record.getCellValue(fieldName);
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function asText(record, fieldName) {
    try {
        return record.getCellValueAsString(fieldName) || '';
    } catch (e) {
        return '';
    }
}

function dayKey(record, fieldName) {
    const raw = asText(record, fieldName);
    return raw ? raw.slice(0, 10) : '';
}

function isDone(record, lensId) {
    if (lensId === 'food') return Boolean(record.getCellValue('Given'));
    if (lensId === 'staff') return Boolean(record.getCellValue('Done'));
    if (lensId === 'trips') return Boolean(record.getCellValue('מתואם'));
    return null;
}

function personIds(record, lensId) {
    const field =
        lensId === 'food' ? 'Person' :
        lensId === 'lodge' ? 'Guest' :
        lensId === 'day' ? 'Guest' :
        lensId === 'people' ? null :
        lensId === 'staff' ? null :
        null;
    if (lensId === 'people') return [record.id];
    if (!field) return links(record, 'Guest').concat(links(record, 'Person')).map(l => l.id);
    return links(record, field).map(l => l.id);
}

function personLabel(record, lensId) {
    if (lensId === 'people') return asText(record, 'Full Name');
    const names = []
        .concat(links(record, 'Guest'))
        .concat(links(record, 'Person'))
        .concat(links(record, 'Guest (from Itinerary)'))
        .map(l => l.name)
        .filter(Boolean);
    return [...new Set(names)].join(', ');
}

function titleOf(record, lensId) {
    if (lensId === 'people') return asText(record, 'Full Name') || '(בלי שם)';
    if (lensId === 'food') {
        const type = asText(record, 'Voucher type');
        const meal = asText(record, 'Meal');
        const who = personLabel(record, lensId);
        return [type, meal, who].filter(Boolean).join(' · ') || asText(record, 'Voucher number') || record.name;
    }
    if (lensId === 'lodge') {
        return [asText(record, 'Hotel'), personLabel(record, lensId), asText(record, 'Check-in date')].filter(Boolean).join(' · ') || record.name;
    }
    if (lensId === 'staff') {
        return [asText(record, 'Type'), asText(record, 'People (from Assignments)'), asText(record, 'Status')].filter(Boolean).join(' · ') || record.name;
    }
    if (lensId === 'trips') {
        return [asText(record, 'Mode'), asText(record, 'To or From'), asText(record, 'Guest (from Itinerary)')].filter(Boolean).join(' · ') || record.name;
    }
    return [asText(record, 'Day'), personLabel(record, lensId), asText(record, 'Pickup Address')].filter(Boolean).join(' · ') || record.name;
}

function subtitleOf(record, lensId) {
    if (lensId === 'food') {
        const given = record.getCellValue('Given') ? 'ניתן' : 'מתוכנן';
        return [given, asText(record, 'Date Given'), asText(record, 'Count') && `×${asText(record, 'Count')}`].filter(Boolean).join(' · ');
    }
    if (lensId === 'staff') {
        return [record.getCellValue('Done') ? 'בוצע' : 'מתוכנן', asText(record, 'Slots_Events'), asText(record, 'Roles (from Assignments)')].filter(Boolean).join(' · ');
    }
    if (lensId === 'trips') {
        return [record.getCellValue('מתואם') ? 'מתואם' : 'לא מתואם', asText(record, 'Day (from Itinerary)'), asText(record, 'Pickup Time Morning')].filter(Boolean).join(' · ');
    }
    if (lensId === 'lodge') {
        return [asText(record, 'Check-in date'), asText(record, 'Check-out date'), asText(record, 'Cost per Night')].filter(Boolean).join(' · ');
    }
    if (lensId === 'people') {
        return [asText(record, 'Phone_Personal'), asText(record, 'Email_Personal')].filter(Boolean).join(' · ');
    }
    return [asText(record, 'Drop off Address'), asText(record, 'Roles (from Assignments) (from Guest)')].filter(Boolean).join(' · ');
}

function recordDay(record, lensId) {
    if (lensId === 'food') return dayKey(record, 'Date Given');
    if (lensId === 'lodge') return dayKey(record, 'Check-in date');
    if (lensId === 'day') return dayKey(record, 'Day');
    if (lensId === 'trips') return asText(record, 'Day (from Itinerary)').slice(0, 10);
    return '';
}

function LensTable({base, lens, context, search, status, onPick}) {
    const table = safeTable(base, lens.table);
    const records = useRecords(table || base.tables[0]);
    if (!table) {
        return <Text textColor="red">טבלה חסרה: {lens.table}</Text>;
    }
    const rows = records.filter(record => {
        const blob = `${titleOf(record, lens.id)} ${subtitleOf(record, lens.id)}`.toLowerCase();
        if (search && !blob.includes(search.toLowerCase())) return false;
        if (context.day) {
            const d = recordDay(record, lens.id);
            if (d && !d.startsWith(context.day)) return false;
        }
        if (context.personId) {
            const ids = personIds(record, lens.id);
            if (ids.length && !ids.includes(context.personId)) return false;
        }
        const done = isDone(record, lens.id);
        if (status === 'planned' && done === true) return false;
        if (status === 'done' && done === false) return false;
        return true;
    });

    return (
        <Box>
            <Text size="small" textColor="light" marginBottom={2}>
                {rows.length} רשומות · {lens.table}
            </Text>
            {rows.slice(0, 80).map(record => (
                <Box
                    key={record.id}
                    padding={2}
                    marginBottom={1}
                    border="default"
                    borderRadius="default"
                    backgroundColor="white"
                    onClick={() => onPick(record)}
                >
                    <Text>{titleOf(record, lens.id)}</Text>
                    <Text size="small" textColor="light">{subtitleOf(record, lens.id)}</Text>
                </Box>
            ))}
            {rows.length > 80 && <Text size="small">עוד {rows.length - 80} — צמצם בחיפוש</Text>}
            {rows.length === 0 && <Text textColor="light">אין תוצאות לפילוח הזה</Text>}
        </Box>
    );
}

function Hospitality() {
    const base = useBase();
    const [lensId, setLensId] = useState('day');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [context, setContext] = useState({day: '', personId: '', personName: ''});
    const lens = LENSES.find(l => l.id === lensId);

    const onPick = record => {
        const day = recordDay(record, lens.id) || context.day;
        const ids = personIds(record, lens.id);
        const name = personLabel(record, lens.id);
        setContext({
            day: day || context.day,
            personId: ids[0] || context.personId,
            personName: name || context.personName,
        });
    };

    return (
        <Box padding={3} height="100vh" overflow="auto" style={{direction: 'rtl'}}>
            <Text size="large" fontWeight="strong">אירוח</Text>
            <Text size="small" textColor="light" marginBottom={2}>פילוח אחד על המסך. היום והאדם נשארים.</Text>

            <Box display="flex" flexWrap="wrap" marginBottom={2}>
                {LENSES.map(item => (
                    <Box key={item.id} marginLeft={1} marginBottom={1}>
                        <Button
                            size="small"
                            variant={item.id === lensId ? 'primary' : 'secondary'}
                            onClick={() => setLensId(item.id)}
                        >
                            {`{${item.label}}`}
                        </Button>
                    </Box>
                ))}
            </Box>

            <Box display="flex" alignItems="center" marginBottom={2} style={{gap: 8}}>
                <Text size="small">הקשר:</Text>
                <Button size="small" variant={context.day ? 'primary' : 'secondary'} onClick={() => setContext(c => ({...c, day: ''}))}>
                    {context.day ? context.day : 'כל הימים'}
                </Button>
                <Button size="small" variant={context.personId ? 'primary' : 'secondary'} onClick={() => setContext(c => ({...c, personId: '', personName: ''}))}>
                    {context.personName || 'כל האנשים'}
                </Button>
                <Button size="small" onClick={() => setContext({day: '', personId: '', personName: ''})}>נקה</Button>
            </Box>

            <Box marginBottom={2} maxWidth="420px">
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="[חיפוש]"
                />
            </Box>

            <Box display="flex" marginBottom={2}>
                {[
                    ['all', 'הכל'],
                    ['planned', 'מתוכנן'],
                    ['done', 'בוצע'],
                ].map(([id, label]) => (
                    <Box key={id} marginLeft={1}>
                        <Button size="small" variant={status === id ? 'primary' : 'secondary'} onClick={() => setStatus(id)}>
                            {label}
                        </Button>
                    </Box>
                ))}
            </Box>

            <LensTable
                base={base}
                lens={lens}
                context={context}
                search={search}
                status={status}
                onPick={onPick}
            />
        </Box>
    );
}

initializeBlock(() => <Hospitality />);
