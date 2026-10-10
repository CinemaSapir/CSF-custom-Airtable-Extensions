/** Which real tables/fields feed each timeline column (DEMO schema appiN9MrP73g6R9hi, 2026-10-07/09). Names match loosely. */
export type TableSpec = {
    key: string;
    aliases: string[];
    /** how this table gets its time */
    time: 'own' | 'borrow' | 'date' | 'lodging' | 'stamp';
    name?: string[];
    start?: string[];
    end?: string[];
    date?: string[];
    dateEnd?: string[];
    slots?: string[];
    hall?: string[];
    people?: string[];
    films?: string[];
    status?: string[];
    type?: string[];
    sub?: string[];
    amount?: string[];
    guest?: string[];
    hotel?: string[];
    festivalDays?: string[];
    from?: string[];
    to?: string[];
};

export const TABLE_SPECS: TableSpec[] = [
    {key: 'Slots_Events', aliases: ['Slots_Events', 'Slots Events', 'Slots'], time: 'own', start: ['Start'], end: ['End'], hall: ['Location'], films: ['Films'], status: ['Status'], type: ['Type'], festivalDays: ['Festival Days']},
    {key: 'Staffing', aliases: ['Staffing'], time: 'borrow', slots: ['Slots_Events'], people: ['Assignments'], status: ['Status'], festivalDays: ['Festival Days']},
    {key: 'Invitations', aliases: ['Invitations'], time: 'borrow', slots: ['Slots_Events'], people: ['Person to invite', 'People'], status: ['Status'], festivalDays: ['Festival Days']},
    {key: 'Itinerary', aliases: ['Itinerary'], time: 'borrow', slots: ['Slots_Events for input', 'Slots_Events'], people: ['People'], date: ['Day'], from: ['Pickup City'], to: ['Drop off City'], festivalDays: ['Festival Days']},
    {key: 'Lodging', aliases: ['Lodging'], time: 'lodging', start: ['Check-in date', 'Check in date'], end: ['Check-out date', 'Check out date'], guest: ['Guest', 'People'], hotel: ['Hotel', 'Location']},
    {key: 'Booking Resources', aliases: ['Booking Resources'], time: 'date', status: ['Status'], festivalDays: ['Festival Days']},
    {key: 'Social Posts', aliases: ['Social Posts'], time: 'date', date: ['Publish at'], status: ['Status'], festivalDays: ['Festival Days']},
];
/** v0.2.11 (the owner 16:50): removed from the timeline completely. An Option_List_6 cell that still lists one is ignored silently. */
export const REMOVED_TABLES = ['Tasks', 'Petty Cash', 'Requests', 'transactions', 'Notebook', 'Approvals'];
export const LOOKUP_TABLES = {festivalDays: ['Festival Days'], people: ['People'], films: ['Films']};
export const FESTIVAL_DAY_FIELDS = {date: ['Date'], name: ['Name']};
/** a «stamp» time (one instant) is drawn as a 20-minute card */
export const STAMP_MIN = 20;
