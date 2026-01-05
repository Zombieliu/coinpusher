export enum TicketType {
    Support = 'support',
    Bug = 'bug',
    Purchase = 'purchase'
}

export enum TicketStatus {
    Open = 'open',
    InProgress = 'in_progress',
    Resolved = 'resolved',
    Closed = 'closed'
}

export interface TicketMessage {
    senderId: string;
    content: string;
    sentAt: number;
}

export interface Ticket {
    ticketId: string;
    userId: string;
    type: TicketType;
    status: TicketStatus;
    subject?: string;
    messages?: TicketMessage[];
    createdAt: number;
}
