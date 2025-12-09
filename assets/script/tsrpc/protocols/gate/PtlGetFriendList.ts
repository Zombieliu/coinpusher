import { Friend, FriendRequest } from '../../../server/gate/bll/SocialSystem';

export interface ReqGetFriendList {
    // 无参数
}

export interface ResGetFriendList {
    friends: Array<Friend & { online: boolean }>;
    receivedRequests: FriendRequest[];
}
