import { Ticket, TicketStatus, TicketType } from "../../../../server/gate/bll/TicketSystem";

export interface ReqGetTickets {
    __ssoToken?: string;
    userId?: string;
    status?: TicketStatus;
    type?: TicketType;
    page?: number;
    limit?: number;
}

export interface ResGetTickets {
    success: boolean;
    tickets?: Ticket[];
    total?: number;
    error?: string;
}
