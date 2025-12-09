export interface ReqSendMail {
    __ssoToken?: string;
    type: string;
    userIds?: string[];
    title: string;
    content: string;
    rewards?: any;
    expireAt?: number;
}

export interface ResSendMail {
    success: boolean;
    sentCount?: number;
    message?: string;
}
