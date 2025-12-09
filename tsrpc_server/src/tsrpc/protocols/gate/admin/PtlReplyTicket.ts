export interface ReqReplyTicket {
    __ssoToken?: string;
    ticketId: string;
    content: string;
    closeTicket?: boolean;
}

export interface ResReplyTicket {
    success: boolean;
    error?: string;
}
