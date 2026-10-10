/** source kinds shared by model.ts and dynamic.ts (kept separate to avoid an import cycle) */
export type Kind =
    | 'film'
    | 'slot'
    | 'person'
    | 'pettyCash'
    | 'location'
    | 'role'
    | 'assignment'
    | 'staffing'
    | 'partner'
    | 'files'
    | 'checklist'
    | 'resource'
    | 'bookingResource'
    | 'socialPost'
    | 'campaign'
    | 'targetAudience'
    | 'websitePage'
    | 'graphicDesign'
    | 'project'
    | 'task'
    | 'media'
    | 'itinerary'
    | 'trip'
    | 'supplier';

export type KindDef = {
    he: string;
    plural: string;
    emoji: string;
    typeChoice: string;
    contentsChoice: string;
    tableId: string;
    tableName: string;
    /** English List Item link field name (singular-friendly when it fits) */
    linkFieldName: string;
    /** known DEMO List Item link field id (resolved by id first, then name) */
    linkFieldId: string;
    /** primary/display field id on the source table (fallback = record.name) */
    primaryFieldId: string;
    primaryFieldName: string;
    /** optional attachment field on the source table */
    picFieldId?: string;
    picFieldName?: string;
    /** v0.5.7: other names the source table may carry (PROD / renamed tables), matched case-insensitively */
    tableAliases?: string[];
    /** v0.5.7: other names the List Item link field may carry */
    linkAliases?: string[];
};
/* v0.5.17: every kind resolves by NAME at runtime (DEMO ids are only a shortcut; PROD ids differ). Kinds with tableId ''
 * (Itinerary / Trips / Suppliers – not on DEMO) are name-only: they light up wherever a table with one of their names
 * exists and show as a disabled choice everywhere else. */

export const SRC: {[k in Kind]: KindDef} = {
    film: {
        he: 'סרט', plural: 'סרטים', emoji: '🎬', typeChoice: 'Film', contentsChoice: 'Films',
        tableId: 'tbleQDxV820WtLJYf', tableName: 'Films',
        linkFieldName: 'Film', linkFieldId: 'fldwlzLaMQW1ryscN', tableAliases: ['Film', 'סרטים'], linkAliases: ['Films'],
        primaryFieldId: 'fldnNNYgdTgXc1c7o', primaryFieldName: 'Film_name_HEB',
        picFieldId: 'fld0SoeYu0brBNEdT', picFieldName: 'Poster',
    },
    slot: {
        he: 'משבצת', plural: 'משבצות', emoji: '📅', typeChoice: 'Slot', contentsChoice: 'Slots',
        tableId: 'tblHbwkDkWEKmX9OT', tableName: 'Slots_Events',
        linkFieldName: 'Slot', linkFieldId: 'fldmXZi2cXp5LFlLE', tableAliases: ['Slots', 'Events', 'משבצות'], linkAliases: ['Slots', 'Slot_Event', 'Event'],
        primaryFieldId: 'fldTfMQmhZuGYDcyU', primaryFieldName: 'Slot',
        picFieldId: 'fld4dQ6y3WBYeEWWq', picFieldName: 'Pics for website',
    },
    person: {
        he: 'אדם', plural: 'אנשים', emoji: '👤', typeChoice: 'Person', contentsChoice: 'People',
        tableId: 'tblDETcBuaBMTeUmH', tableName: 'People',
        linkFieldName: 'Person', linkFieldId: 'fldiBsiB716dSWmzZ', tableAliases: ['Person', 'אנשים'], linkAliases: ['People'],
        primaryFieldId: 'fldVySoRplNHsjeBW', primaryFieldName: 'Full Name',
        picFieldId: 'fldXti4SNzyVMvUb2', picFieldName: 'Pic',
    },
    pettyCash: {
        he: 'קופה קטנה', plural: 'קופה קטנה', emoji: '💵', typeChoice: 'Petty Cash', contentsChoice: 'Petty Cash',
        tableId: 'tblp6Ty9VUthECylw', tableName: 'Petty Cash',
        linkFieldName: 'Petty Cash', linkFieldId: 'fld7NYsQQpRvACwyn',
        tableAliases: ['PettyCash', 'Petty Cash Requests', 'קופה קטנה'], linkAliases: ['Petty_Cash', 'Petty Cash Request'],
        primaryFieldId: 'fldre57dTkzvciKBy', primaryFieldName: 'Name',
    },
    location: {
        he: 'לוקיישן', plural: 'לוקיישנים', emoji: '📍', typeChoice: 'Location', contentsChoice: 'Locations',
        tableId: 'tblMYGESPjEcUOmkU', tableName: 'Locations',
        linkFieldName: 'Location', linkFieldId: 'fldMV62Y0WOXzNZMP',
        tableAliases: ['Location', 'Venues', 'לוקיישנים', 'מיקומים'], linkAliases: ['Locations', 'Venue'],
        primaryFieldId: 'fldaw00EB0EzuUaCp', primaryFieldName: 'Name',
    },
    role: {
        he: 'תפקיד', plural: 'תפקידים', emoji: '🏷️', typeChoice: 'Role', contentsChoice: 'Roles',
        tableId: 'tblBvMpH47USsN760', tableName: 'Roles',
        linkFieldName: 'Role', linkFieldId: 'fldrITj9o140ydETe',
        primaryFieldId: 'fldtIE4Rhli3N7bBV', primaryFieldName: 'Role',
    },
    assignment: {
        he: 'שיבוץ', plural: 'שיבוצים', emoji: '📌', typeChoice: 'Assignment', contentsChoice: 'Assignments',
        tableId: 'tblWyA778vlIsatNk', tableName: 'Assignments',
        linkFieldName: 'Assignment', linkFieldId: 'fldOAiB4rE4GfaTF3',
        tableAliases: ['Assignment', 'שיבוצים'], linkAliases: ['Assignments'],
        primaryFieldId: 'fldfIOnGakriR6lTS', primaryFieldName: 'Name and Role',
    },
    staffing: {
        he: 'ציוות', plural: 'ציוות', emoji: '👥', typeChoice: 'Staffing', contentsChoice: 'Staffing',
        tableId: 'tblFa6LqGjICAHqde', tableName: 'Staffing',
        linkFieldName: 'Staffing', linkFieldId: 'fldAqe40fl9zMxczb',
        tableAliases: ['Staffings', 'ציוות', 'איוש'], linkAliases: ['Staffings'],
        primaryFieldId: 'fldExS1DqJXYkbZuO', primaryFieldName: 'Name',
    },
    partner: {
        he: 'שותף', plural: 'שותפים', emoji: '🤝', typeChoice: 'Partner', contentsChoice: 'Partners',
        tableId: 'tblX7qXkvyhDG3Nhe', tableName: 'Partners',
        linkFieldName: 'Partner', linkFieldId: 'fldJ8C4gbpTBok768',
        primaryFieldId: 'fldF0hwX4w0ljZ5pi', primaryFieldName: 'Name',
    },
    files: {
        he: 'קובץ / קישור', plural: 'קבצים וקישורים', emoji: '🔗', typeChoice: 'Files and Links', contentsChoice: 'Files and Links',
        tableId: 'tbl7FPJj84kX1jFur', tableName: 'Files and Links',
        linkFieldName: 'Files and Links', linkFieldId: 'fldwBV4JhP5TW2Iql',
        tableAliases: ['Files & Links', 'Files_and_Links', 'Files', 'Links', 'קבצים וקישורים'], linkAliases: ['Files & Links', 'File', 'Files and Link'],
        primaryFieldId: 'fldt8qhL3Ffyy6SMw', primaryFieldName: 'Name',
        picFieldId: 'fldgwfyTYjnbflpG8', picFieldName: 'Attachments',
    },
    checklist: {
        he: 'צ׳קליסט', plural: 'צ׳קליסטים', emoji: '✅', typeChoice: 'Checklist', contentsChoice: 'Checklists',
        tableId: 'tbl5nxXu7QB3vLqeW', tableName: 'Checklists',
        linkFieldName: 'Checklist', linkFieldId: 'fldu50MfkgQbHWtZP',
        primaryFieldId: 'fldfGjhE3RftULi8F', primaryFieldName: 'Name',
    },
    resource: {
        he: 'משאב', plural: 'משאבים', emoji: '🧰', typeChoice: 'Resource', contentsChoice: 'Resources',
        tableId: 'tblsWAFOpNy2d2jQE', tableName: 'Resources',
        linkFieldName: 'Resources', linkFieldId: 'fldg9AsJpOvC1d9n1',
        tableAliases: ['Resource', 'משאבים'], linkAliases: ['Resource'],
        primaryFieldId: 'fld0ogt5NITHQhUeg', primaryFieldName: 'Name',
        picFieldId: 'fldwcqrYlAQHLvlec', picFieldName: 'Attachments',
    },
    bookingResource: {
        he: 'הזמנת משאב', plural: 'הזמנות משאבים', emoji: '🗓️', typeChoice: 'Booking Resource', contentsChoice: 'Booking Resources',
        tableId: 'tblJY67dvAejS6OdA', tableName: 'Booking Resources',
        linkFieldName: 'Booking Resource', linkFieldId: 'fldo576MOL85tALLm',
        tableAliases: ['Booking Resource', 'Resource Bookings', 'הזמנות משאבים'], linkAliases: ['Booking Resources', 'Booking'],
        primaryFieldId: 'fldIlSnqf0tFCAnua', primaryFieldName: 'Name',
    },
    socialPost: {
        he: 'פוסט', plural: 'פוסטים', emoji: '📱', typeChoice: 'Social Post', contentsChoice: 'Social Posts',
        tableId: 'tblzTSaGnyR2ViPil', tableName: 'Social Posts',
        linkFieldName: 'Social Post', linkFieldId: 'fldn0hc5kMo3bLMDb',
        tableAliases: ['Social Post', 'Posts', 'Social Media Posts', 'פוסטים'], linkAliases: ['Social Posts', 'Post'],
        primaryFieldId: 'fldPir5Enc04QCcSr', primaryFieldName: 'Post title',
        picFieldId: 'fldM5kXID2D7OVv0l', picFieldName: 'Assets',
    },
    campaign: {
        he: 'קמפיין', plural: 'קמפיינים', emoji: '📣', typeChoice: 'Campaign', contentsChoice: 'Campaigns',
        tableId: 'tbl3XlcDcNhvtVZgG', tableName: 'Campaigns',
        linkFieldName: 'Campaign', linkFieldId: 'fldNrmT6fFg54CjOb',
        tableAliases: ['Campaign', 'קמפיינים'], linkAliases: ['Campaigns'],
        primaryFieldId: 'fldX8anenjexuPNr3', primaryFieldName: 'Name',
        picFieldId: 'fld1h2r365h9vB0q3', picFieldName: 'Attachments',
    },
    targetAudience: {
        he: 'קהל יעד', plural: 'קהלי יעד', emoji: '🎪', typeChoice: 'Target Audience', contentsChoice: 'Target Audiences',
        tableId: 'tblUiguCPJjXGSxmV', tableName: 'Target Audiences',
        linkFieldName: 'Target Audience', linkFieldId: 'fldROnoJoLrgBSCM0',
        primaryFieldId: 'fldBevTQG5UscH1gu', primaryFieldName: 'Name',
    },
    websitePage: {
        he: 'עמוד אתר', plural: 'עמודי אתר', emoji: '🌐', typeChoice: 'Website Page', contentsChoice: 'Website Pages',
        tableId: 'tblmUO8bQN6ryXv3H', tableName: 'Website Pages',
        linkFieldName: 'Website Page', linkFieldId: 'fldeVTrBBGNHB7TN0',
        tableAliases: ['Website Page', 'Amudatar', 'עמודי אתר'], linkAliases: ['Website Pages', 'Amudatar'],
        primaryFieldId: 'fldqBSJ2rNlOrQx4R', primaryFieldName: 'Name',
    },
    graphicDesign: {
        he: 'עיצוב גרפי', plural: 'עיצוב גרפי', emoji: '🎨', typeChoice: 'Graphic Design', contentsChoice: 'Graphic Design',
        tableId: 'tbl4EwftfEcFc64Jr', tableName: 'Graphic Design',
        linkFieldName: 'Graphic Design', linkFieldId: 'fldtAS7r1SvIhX3Br',
        tableAliases: ['Graphic Designs', 'GraphicDesign', 'Design', 'עיצוב גרפי'], linkAliases: ['Graphic Designs'],
        primaryFieldId: 'fldnT8xUljMwXWxGF', primaryFieldName: 'Name',
        picFieldId: 'fldyMx6TpBsalpk4m', picFieldName: 'Attachments',
    },
    project: {
        he: 'פרויקט', plural: 'פרויקטים', emoji: '📁', typeChoice: 'Project', contentsChoice: 'Projects',
        tableId: 'tblPDmSZMBOUynGI2', tableName: 'Projects',
        linkFieldName: 'Project', linkFieldId: 'fld2Fi9WDTikgb5d1',
        primaryFieldId: 'fldloAg5O6aRFs3gz', primaryFieldName: 'Project',
        tableAliases: ['Project', 'פרויקטים'], linkAliases: ['Projects'],
    },
    task: {
        he: 'משימה', plural: 'משימות', emoji: '✔️', typeChoice: 'Task', contentsChoice: 'Tasks',
        tableId: 'tblquAuDa1np9b6At', tableName: 'Tasks',
        linkFieldName: 'Task', linkFieldId: 'fldWgdjLlgF5FyrUc',
        primaryFieldId: 'fldAJk1BgUv2AvDmU', primaryFieldName: 'Name',
        tableAliases: ['Task', 'משימות'], linkAliases: ['Tasks'],
    },
    media: {
        he: 'מדיה', plural: 'מדיה', emoji: '🎞️', typeChoice: 'Media', contentsChoice: 'Media',
        tableId: 'tblbP1O0e4zgyJt3m', tableName: 'Media',
        linkFieldName: 'Media', linkFieldId: 'fldqJ6bcC6EJKJpUT',
        tableAliases: ['Medias', 'Media Assets', 'מדיה'], linkAliases: ['Medias'],
        primaryFieldId: 'fldxiCms9FuR5wGlr', primaryFieldName: 'Name',
        picFieldId: 'fldkGrDA4jCuMLdf3', picFieldName: 'Attachments',
    },
    // v0.5.17: name-only kinds (no DEMO table; PROD names assumed, matched loosely – case, spaces/_, singular/plural, Hebrew)
    itinerary: {
        he: 'מסלול', plural: 'מסלולים', emoji: '🧭', typeChoice: 'Itinerary', contentsChoice: 'Itineraries',
        tableId: '', tableName: 'Itinerary',
        linkFieldName: 'Itinerary', linkFieldId: '',
        tableAliases: ['Itineraries', 'Itinerary Items', 'מסלולים', 'לו״ז נסיעה'], linkAliases: ['Itineraries'],
        primaryFieldId: '', primaryFieldName: 'Name',
    },
    trip: {
        he: 'נסיעה', plural: 'נסיעות', emoji: '🚐', typeChoice: 'Trip', contentsChoice: 'Trips',
        tableId: '', tableName: 'Trips',
        linkFieldName: 'Trip', linkFieldId: '',
        tableAliases: ['Trip', 'Travel', 'Travels', 'נסיעות'], linkAliases: ['Trips'],
        primaryFieldId: '', primaryFieldName: 'Name',
    },
    supplier: {
        he: 'ספק', plural: 'ספקים', emoji: '🏭', typeChoice: 'Supplier', contentsChoice: 'Suppliers',
        tableId: '', tableName: 'Suppliers',
        linkFieldName: 'Supplier', linkFieldId: '',
        tableAliases: ['Supplier', 'Vendors', 'Vendor', 'ספקים'], linkAliases: ['Suppliers', 'Vendor'],
        primaryFieldId: '', primaryFieldName: 'Name',
    },

};

/** stable order for the add-item chooser (legacy film/slot/person first, then the rest) */
export const KINDS: Kind[] = [
    'film', 'slot', 'person',
    'pettyCash', 'location', 'role', 'assignment', 'staffing', 'partner',
    'files', 'checklist', 'resource', 'bookingResource',
    'websitePage', 'project', 'task', 'graphicDesign', 'media',
    'socialPost', 'campaign', 'targetAudience',
    'itinerary', 'trip', 'supplier',
];

/** v0.5.8: display order for the new-list picker AND the add panel (the rest follow in KINDS order) */
export const KIND_ORDER: Kind[] = ['film', 'slot', 'person', 'websitePage', 'project', 'location', 'task'];

/** kinds that keep special formatting in sourceView / toItem */
export const LEGACY_KINDS: Kind[] = ['film', 'slot', 'person'];

export function isKind(v: unknown): v is Kind {
    return typeof v === 'string' && (KINDS as string[]).includes(v);
}

export function kindByTableId(tableId: string | null | undefined): Kind | null {
    if (!tableId) return null;
    return KINDS.find((k) => SRC[k].tableId === tableId) ?? null;
}

const low = (x: string | null | undefined) => (x ?? '').trim().toLowerCase();
/** v0.5.7: a table name (English or Hebrew alias) → kind. PROD table ids differ from DEMO, names usually don't. */
export function kindByTableName(name: string | null | undefined): Kind | null {
    const n = low(name);
    if (!n) return null;
    return KINDS.find((k) => low(SRC[k].tableName) === n || (SRC[k].tableAliases ?? []).some((a) => low(a) === n)) ?? kindByLooseName(name);
}
/** id first, then name */
export function kindByTable(t: {id: string; name: string} | null | undefined): Kind | null {
    if (!t) return null;
    return kindByTableId(t.id) ?? kindByTableName(t.name);
}
/** a List Item link-field name → kind (last resort when the linked table itself isn't visible to the element) */
export function kindByLinkName(name: string | null | undefined): Kind | null {
    const n = low(name);
    if (!n) return null;
    return KINDS.find((k) => low(SRC[k].linkFieldName) === n || (SRC[k].linkAliases ?? []).some((a) => low(a) === n)) ?? kindByTableName(name);
}
/** a List Item › Type choice ("Location", "Website Page"…) → kind. v0.5.11: exact first, then loose spellings
 * (case, spaces/_/-, Hebrew or English, singular or plural: Location / locations / LOCATIONS / לוקיישנים / מיקום…) */
export function kindByTypeChoice(name: string | null | undefined): Kind | null {
    const n = low(name);
    if (!n) return null;
    return KINDS.find((k) => low(SRC[k].typeChoice) === n || low(SRC[k].contentsChoice) === n) ?? kindByLooseName(name);
}

/** v0.5.11: normalised spelling – lower case, no geresh/quotes, any run of space _ - – · . / → one space */
export const looseName = (x: string | null | undefined) =>
    (x ?? '')
        .toLowerCase()
        .replace(/[׳'"״`]/g, '')
        .replace(/[\s_\-–·./]+/g, ' ')
        .trim();
/** English plural → singular (Locations → location, Categories → category); Hebrew forms are listed explicitly */
const singular = (x: string) => x.replace(/ies$/, 'y').replace(/([a-z])s$/, '$1');
const spellings = (x: string | null | undefined): string[] => {
    const l = looseName(x);
    if (!l) return [];
    const s = singular(l);
    return [...new Set([l, l.replace(/ /g, ''), s, s.replace(/ /g, '')])];
};
/** extra Hebrew / English spellings people actually type into Type or Source table */
const EXTRA_NAMES: Partial<{[k in Kind]: string[]}> = {
    location: ['מיקום', 'לוקיישן', 'לוקיישנים', 'מיקומים', 'venue', 'venues', 'אולם', 'אולמות'],
    film: ['סרט', 'movie', 'movies'],
    slot: ['משבצת', 'event', 'events', 'אירוע', 'אירועים', 'הקרנה', 'הקרנות', 'screening', 'screenings'],
    person: ['אדם', 'אנשים', 'people', 'persons', 'איש קשר', 'אנשי קשר', 'contact', 'contacts'],
    project: ['פרויקט', 'פרוייקט', 'פרוייקטים'],
    task: ['משימה', 'משימות'],
    websitePage: ['עמוד אתר', 'עמודי אתר', 'web page', 'webpage', 'page', 'pages'],
    // v0.5.17 – the owner's 13 (his spellings: «camaigns», «Booking resources», «files and links»…)
    graphicDesign: ['עיצוב', 'עיצובים', 'גרפיקה'],
    itinerary: ['מסלול נסיעה', 'מסלולי נסיעה', 'itineraries'],
    trip: ['נסיעה', 'טיול', 'טיולים'],
    supplier: ['ספק', 'supplyer', 'suppliers list'],
    assignment: ['שיבוץ'],
    staffing: ['איוש'],
    files: ['קובץ', 'קבצים', 'קישור', 'קישורים', 'files links', 'file and link'],
    resource: ['משאב'],
    bookingResource: ['הזמנת משאבים', 'resource booking', 'bookings resources'],
    socialPost: ['פוסט', 'social', 'post'],
    campaign: ['קמפיין', 'camaign', 'camaigns'],
    pettyCash: ['קופה', 'petty', 'pettycash', 'petty cash request'],
};
/** every name a kind may go by (Type choice, Contents choice, table name + aliases, link name + aliases, Hebrew) */
export function kindNames(k: Kind): string[] {
    const d = SRC[k];
    return [d.typeChoice, d.contentsChoice, d.tableName, ...(d.tableAliases ?? []), d.linkFieldName, ...(d.linkAliases ?? []), d.he, d.plural, ...(EXTRA_NAMES[k] ?? [])];
}
/** v0.5.11: loose name → kind; null when nothing or more than one kind matches (never a guess) */
export function kindByLooseName(name: string | null | undefined): Kind | null {
    const want = spellings(name);
    if (!want.length) return null;
    const hits = KINDS.filter((k) => kindNames(k).some((a) => spellings(a).some((x) => want.includes(x))));
    return hits.length === 1 ? hits[0] : null;
}
/** Hebrew names for tables that have no kind (generic items keep a real table name, never «אחר») */
export const TABLE_HE: {[tableName: string]: {he: string; icon: string}} = {
    tasks: {he: 'משימות', icon: '✔️'},
    task: {he: 'משימות', icon: '✔️'},
    request: {he: 'בקשות', icon: '📨'},
    notebook: {he: 'מחברת', icon: '📓'},
    requests: {he: 'בקשות', icon: '📨'},
    areas: {he: 'תחומים', icon: '🧭'},
    complexes: {he: 'מתחמים', icon: '🏛️'},
    'equipment warehouse': {he: 'מחסן ציוד', icon: '📦'},
    documents: {he: 'מסמכים', icon: '📄'},
    lists: {he: 'רשימות', icon: '📋'},
};
export function tableHe(name: string | null | undefined): {he: string; icon: string} | null {
    const n = low(name);
    if (!n) return null;
    const k = kindByTableName(n);
    if (k) return {he: SRC[k].plural, icon: SRC[k].emoji};
    return TABLE_HE[n] ?? null;
}

/**
 * v0.5.17: the table for a kind among the tables the element can see, by NAME (PROD ids differ from DEMO).
 * Exact table name first, then an exact alias, then any loose spelling that points at this kind only
 * (case, spaces / _ / -, singular / plural, Hebrew / English – kindByTable → kindByLooseName never guesses).
 */
export function kindTableIn<T extends {id: string; name: string}>(k: Kind, tables: readonly T[]): T | null {
    const d = SRC[k];
    return (
        tables.find((t) => low(t.name) === low(d.tableName)) ??
        tables.find((t) => (d.tableAliases ?? []).some((a) => low(a) === low(t.name))) ??
        tables.find((t) => kindByTable(t) === k) ??
        null
    );
}
/** v0.5.17: why a kind can't be used here (null = fine). Shown as the disabled chip / option tooltip. */
export function kindUnavailableTip(k: Kind, why: 'table' | 'link' | null): string | null {
    if (why === 'table') return `הטבלה «${SRC[k].tableName}» לא נמצאה בבסיס הזה או שאינה זמינה לאלמנט`;
    if (why === 'link') return `השדה «${SRC[k].linkFieldName}» ב־List Item לא מופעל באלמנט`;
    return null;
}
