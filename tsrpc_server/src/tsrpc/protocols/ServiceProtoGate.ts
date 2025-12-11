import { ServiceProto } from 'tsrpc-proto';
import { ReqAdminLogin, ResAdminLogin } from './gate/admin/PtlAdminLogin';
import { ReqBanUser, ResBanUser } from './gate/admin/PtlBanUser';
import { ReqBatchBanUsers, ResBatchBanUsers } from './gate/admin/PtlBatchBanUsers';
import { ReqBatchSendMail, ResBatchSendMail } from './gate/admin/PtlBatchSendMail';
import { ReqCreateAdmin, ResCreateAdmin } from './gate/admin/PtlCreateAdmin';
import { ReqCreateAnnouncement, ResCreateAnnouncement } from './gate/admin/PtlCreateAnnouncement';
import { ReqCreateEvent, ResCreateEvent } from './gate/admin/PtlCreateEvent';
import { ReqDeleteAnnouncement, ResDeleteAnnouncement } from './gate/admin/PtlDeleteAnnouncement';
import { ReqDeleteEvent, ResDeleteEvent } from './gate/admin/PtlDeleteEvent';
import { ReqDeliverOrder, ResDeliverOrder } from './gate/admin/PtlDeliverOrder';
import { ReqDisableCdk, ResDisableCdk } from './gate/admin/PtlDisableCdk';
import { ReqExportInviteLeaderboard, ResExportInviteLeaderboard } from './gate/admin/PtlExportInviteLeaderboard';
import { ReqGenerateCdk, ResGenerateCdk } from './gate/admin/PtlGenerateCdk';
import { ReqGetActiveAlerts, ResGetActiveAlerts } from './gate/admin/PtlGetActiveAlerts';
import { ReqGetAdmins, ResGetAdmins } from './gate/admin/PtlGetAdmins';
import { ReqGetAdvancedStats, ResGetAdvancedStats } from './gate/admin/PtlGetAdvancedStats';
import { ReqGetAnnouncements, ResGetAnnouncements } from './gate/admin/PtlGetAnnouncements';
import { ReqGetAuditLogs, ResGetAuditLogs } from './gate/admin/PtlGetAuditLogs';
import { ReqGetAuditStatistics, ResGetAuditStatistics } from './gate/admin/PtlGetAuditStatistics';
import { ReqGetCdkHistory, ResGetCdkHistory } from './gate/admin/PtlGetCdkHistory';
import { ReqGetCdkList, ResGetCdkList } from './gate/admin/PtlGetCdkList';
import { ReqGetConfig, ResGetConfig } from './gate/admin/PtlGetConfig';
import { ReqGetConfigHistory, ResGetConfigHistory } from './gate/admin/PtlGetConfigHistory';
import { ReqGetEvents, ResGetEvents } from './gate/admin/PtlGetEvents';
import { ReqGetFinancialStats, ResGetFinancialStats } from './gate/admin/PtlGetFinancialStats';
import { ReqGetInviteLeaderboard, ResGetInviteLeaderboard } from './gate/admin/PtlGetInviteLeaderboard';
import { ReqGetInviteRewardConfig, ResGetInviteRewardConfig } from './gate/admin/PtlGetInviteRewardConfig';
import { ReqGetInviteRewardHistory, ResGetInviteRewardHistory } from './gate/admin/PtlGetInviteRewardHistory';
import { ReqGetLiveLogs, ResGetLiveLogs } from './gate/admin/PtlGetLiveLogs';
import { ReqGetLogAnalytics, ResGetLogAnalytics } from './gate/admin/PtlGetLogAnalytics';
import { ReqGetLogs, ResGetLogs } from './gate/admin/PtlGetLogs';
import { ReqGetNotifications, ResGetNotifications } from './gate/admin/PtlGetNotifications';
import { ReqGetOrders, ResGetOrders } from './gate/admin/PtlGetOrders';
import { ReqGetRefunds, ResGetRefunds } from './gate/admin/PtlGetRefunds';
import { ReqGetStatistics, ResGetStatistics } from './gate/admin/PtlGetStatistics';
import { ReqGetSystemConfig, ResGetSystemConfig } from './gate/admin/PtlGetSystemConfig';
import { ReqGetSystemMetrics, ResGetSystemMetrics } from './gate/admin/PtlGetSystemMetrics';
import { ReqGetTickets, ResGetTickets } from './gate/admin/PtlGetTickets';
import { ReqGetUserDetail, ResGetUserDetail } from './gate/admin/PtlGetUserDetail';
import { ReqGetUsers, ResGetUsers } from './gate/admin/PtlGetUsers';
import { ReqGrantReward, ResGrantReward } from './gate/admin/PtlGrantReward';
import { ReqProcessRefund, ResProcessRefund } from './gate/admin/PtlProcessRefund';
import { ReqReplyTicket, ResReplyTicket } from './gate/admin/PtlReplyTicket';
import { ReqResendOrderReward, ResResendOrderReward } from './gate/admin/PtlResendOrderReward';
import { ReqRollbackConfig, ResRollbackConfig } from './gate/admin/PtlRollbackConfig';
import { ReqSendMail, ResSendMail } from './gate/admin/PtlSendMail';
import { ReqSetMaintenance, ResSetMaintenance } from './gate/admin/PtlSetMaintenance';
import { ReqUnbanUser, ResUnbanUser } from './gate/admin/PtlUnbanUser';
import { ReqUpdateAdminStatus, ResUpdateAdminStatus } from './gate/admin/PtlUpdateAdminStatus';
import { ReqUpdateAnnouncement, ResUpdateAnnouncement } from './gate/admin/PtlUpdateAnnouncement';
import { ReqUpdateConfig, ResUpdateConfig } from './gate/admin/PtlUpdateConfig';
import { ReqUpdateEvent, ResUpdateEvent } from './gate/admin/PtlUpdateEvent';
import { ReqUpdateInviteRewardConfig, ResUpdateInviteRewardConfig } from './gate/admin/PtlUpdateInviteRewardConfig';
import { ReqUpdateOrderStatus, ResUpdateOrderStatus } from './gate/admin/PtlUpdateOrderStatus';
import { ReqAddGold, ResAddGold } from './gate/internal/PtlAddGold';
import { ReqCollectWithReward, ResCollectWithReward } from './gate/internal/PtlCollectWithReward';
import { ReqDeductGold, ResDeductGold } from './gate/internal/PtlDeductGold';
import { ReqAcceptInvite, ResAcceptInvite } from './gate/PtlAcceptInvite';
import { ReqAddExp, ResAddExp } from './gate/PtlAddExp';
import { ReqApplyToGuild, ResApplyToGuild } from './gate/PtlApplyToGuild';
import { ReqCheckin, ResCheckin } from './gate/PtlCheckin';
import { ReqClaimAchievementReward, ResClaimAchievementReward } from './gate/PtlClaimAchievementReward';
import { ReqClaimMailReward, ResClaimMailReward } from './gate/PtlClaimMailReward';
import { ReqClaimSeasonReward, ResClaimSeasonReward } from './gate/PtlClaimSeasonReward';
import { ReqClaimTaskReward, ResClaimTaskReward } from './gate/PtlClaimTaskReward';
import { ReqCollectCoin, ResCollectCoin } from './gate/PtlCollectCoin';
import { ReqConsumeGold, ResConsumeGold } from './gate/PtlConsumeGold';
import { ReqCreateGuild, ResCreateGuild } from './gate/PtlCreateGuild';
import { ReqCreatePaymentOrder, ResCreatePaymentOrder } from './gate/PtlCreatePaymentOrder';
import { ReqDrawLottery, ResDrawLottery } from './gate/PtlDrawLottery';
import { ReqExchangeCdk, ResExchangeCdk } from './gate/PtlExchangeCdk';
import { ReqExpandInventory, ResExpandInventory } from './gate/PtlExpandInventory';
import { ReqGameArea, ResGameArea } from './gate/PtlGameArea';
import { ReqGetBuffs, ResGetBuffs } from './gate/PtlGetBuffs';
import { ReqGetFriendList, ResGetFriendList } from './gate/PtlGetFriendList';
import { ReqGetGuildInfo, ResGetGuildInfo } from './gate/PtlGetGuildInfo';
import { ReqGetInventory, ResGetInventory } from './gate/PtlGetInventory';
import { ReqGetInviteInfo, ResGetInviteInfo } from './gate/PtlGetInviteInfo';
import { ReqGetJackpotProgress, ResGetJackpotProgress } from './gate/PtlGetJackpotProgress';
import { ReqGetLeaderboard, ResGetLeaderboard } from './gate/PtlGetLeaderboard';
import { ReqGetLevelInfo, ResGetLevelInfo } from './gate/PtlGetLevelInfo';
import { ReqGetMailList, ResGetMailList } from './gate/PtlGetMailList';
import { ReqGetSeasonInfo, ResGetSeasonInfo } from './gate/PtlGetSeasonInfo';
import { ReqGetShareStats, ResGetShareStats } from './gate/PtlGetShareStats';
import { ReqGetShopProducts, ResGetShopProducts } from './gate/PtlGetShopProducts';
import { ReqGetSignInInfo, ResGetSignInInfo } from './gate/PtlGetSignInInfo';
import { ReqGetUserAchievements, ResGetUserAchievements } from './gate/PtlGetUserAchievements';
import { ReqGetUserRank, ResGetUserRank } from './gate/PtlGetUserRank';
import { ReqGetUserTasks, ResGetUserTasks } from './gate/PtlGetUserTasks';
import { ReqGetVIPInfo, ResGetVIPInfo } from './gate/PtlGetVIPInfo';
import { ReqGuildDonate, ResGuildDonate } from './gate/PtlGuildDonate';
import { ReqHandleFriendRequest, ResHandleFriendRequest } from './gate/PtlHandleFriendRequest';
import { ReqLogin, ResLogin } from './gate/PtlLogin';
import { ReqPurchaseBattlePass, ResPurchaseBattlePass } from './gate/PtlPurchaseBattlePass';
import { ReqPurchaseProduct, ResPurchaseProduct } from './gate/PtlPurchaseProduct';
import { ReqPurchaseVIP, ResPurchaseVIP } from './gate/PtlPurchaseVIP';
import { ReqRegister, ResRegister } from './gate/PtlRegister';
import { ReqSendFriendGift, ResSendFriendGift } from './gate/PtlSendFriendGift';
import { ReqSendFriendRequest, ResSendFriendRequest } from './gate/PtlSendFriendRequest';
import { ReqShare, ResShare } from './gate/PtlShare';
import { ReqSignIn, ResSignIn } from './gate/PtlSignIn';
import { ReqUseItem, ResUseItem } from './gate/PtlUseItem';
import { ReqValidateIntegrity, ResValidateIntegrity } from './gate/PtlValidateIntegrity';

export interface ServiceType {
    api: {
        "admin/AdminLogin": {
            req: ReqAdminLogin,
            res: ResAdminLogin
        },
        "admin/BanUser": {
            req: ReqBanUser,
            res: ResBanUser
        },
        "admin/BatchBanUsers": {
            req: ReqBatchBanUsers,
            res: ResBatchBanUsers
        },
        "admin/BatchSendMail": {
            req: ReqBatchSendMail,
            res: ResBatchSendMail
        },
        "admin/CreateAdmin": {
            req: ReqCreateAdmin,
            res: ResCreateAdmin
        },
        "admin/CreateAnnouncement": {
            req: ReqCreateAnnouncement,
            res: ResCreateAnnouncement
        },
        "admin/CreateEvent": {
            req: ReqCreateEvent,
            res: ResCreateEvent
        },
        "admin/DeleteAnnouncement": {
            req: ReqDeleteAnnouncement,
            res: ResDeleteAnnouncement
        },
        "admin/DeleteEvent": {
            req: ReqDeleteEvent,
            res: ResDeleteEvent
        },
        "admin/DeliverOrder": {
            req: ReqDeliverOrder,
            res: ResDeliverOrder
        },
        "admin/DisableCdk": {
            req: ReqDisableCdk,
            res: ResDisableCdk
        },
        "admin/ExportInviteLeaderboard": {
            req: ReqExportInviteLeaderboard,
            res: ResExportInviteLeaderboard
        },
        "admin/GenerateCdk": {
            req: ReqGenerateCdk,
            res: ResGenerateCdk
        },
        "admin/GetActiveAlerts": {
            req: ReqGetActiveAlerts,
            res: ResGetActiveAlerts
        },
        "admin/GetAdmins": {
            req: ReqGetAdmins,
            res: ResGetAdmins
        },
        "admin/GetAdvancedStats": {
            req: ReqGetAdvancedStats,
            res: ResGetAdvancedStats
        },
        "admin/GetAnnouncements": {
            req: ReqGetAnnouncements,
            res: ResGetAnnouncements
        },
        "admin/GetAuditLogs": {
            req: ReqGetAuditLogs,
            res: ResGetAuditLogs
        },
        "admin/GetAuditStatistics": {
            req: ReqGetAuditStatistics,
            res: ResGetAuditStatistics
        },
        "admin/GetCdkHistory": {
            req: ReqGetCdkHistory,
            res: ResGetCdkHistory
        },
        "admin/GetCdkList": {
            req: ReqGetCdkList,
            res: ResGetCdkList
        },
        "admin/GetConfig": {
            req: ReqGetConfig,
            res: ResGetConfig
        },
        "admin/GetConfigHistory": {
            req: ReqGetConfigHistory,
            res: ResGetConfigHistory
        },
        "admin/GetEvents": {
            req: ReqGetEvents,
            res: ResGetEvents
        },
        "admin/GetFinancialStats": {
            req: ReqGetFinancialStats,
            res: ResGetFinancialStats
        },
        "admin/GetInviteLeaderboard": {
            req: ReqGetInviteLeaderboard,
            res: ResGetInviteLeaderboard
        },
        "admin/GetInviteRewardConfig": {
            req: ReqGetInviteRewardConfig,
            res: ResGetInviteRewardConfig
        },
        "admin/GetInviteRewardHistory": {
            req: ReqGetInviteRewardHistory,
            res: ResGetInviteRewardHistory
        },
        "admin/GetLiveLogs": {
            req: ReqGetLiveLogs,
            res: ResGetLiveLogs
        },
        "admin/GetLogAnalytics": {
            req: ReqGetLogAnalytics,
            res: ResGetLogAnalytics
        },
        "admin/GetLogs": {
            req: ReqGetLogs,
            res: ResGetLogs
        },
        "admin/GetNotifications": {
            req: ReqGetNotifications,
            res: ResGetNotifications
        },
        "admin/GetOrders": {
            req: ReqGetOrders,
            res: ResGetOrders
        },
        "admin/GetRefunds": {
            req: ReqGetRefunds,
            res: ResGetRefunds
        },
        "admin/GetStatistics": {
            req: ReqGetStatistics,
            res: ResGetStatistics
        },
        "admin/GetSystemConfig": {
            req: ReqGetSystemConfig,
            res: ResGetSystemConfig
        },
        "admin/GetSystemMetrics": {
            req: ReqGetSystemMetrics,
            res: ResGetSystemMetrics
        },
        "admin/GetTickets": {
            req: ReqGetTickets,
            res: ResGetTickets
        },
        "admin/GetUserDetail": {
            req: ReqGetUserDetail,
            res: ResGetUserDetail
        },
        "admin/GetUsers": {
            req: ReqGetUsers,
            res: ResGetUsers
        },
        "admin/GrantReward": {
            req: ReqGrantReward,
            res: ResGrantReward
        },
        "admin/ProcessRefund": {
            req: ReqProcessRefund,
            res: ResProcessRefund
        },
        "admin/ReplyTicket": {
            req: ReqReplyTicket,
            res: ResReplyTicket
        },
        "admin/ResendOrderReward": {
            req: ReqResendOrderReward,
            res: ResResendOrderReward
        },
        "admin/RollbackConfig": {
            req: ReqRollbackConfig,
            res: ResRollbackConfig
        },
        "admin/SendMail": {
            req: ReqSendMail,
            res: ResSendMail
        },
        "admin/SetMaintenance": {
            req: ReqSetMaintenance,
            res: ResSetMaintenance
        },
        "admin/UnbanUser": {
            req: ReqUnbanUser,
            res: ResUnbanUser
        },
        "admin/UpdateAdminStatus": {
            req: ReqUpdateAdminStatus,
            res: ResUpdateAdminStatus
        },
        "admin/UpdateAnnouncement": {
            req: ReqUpdateAnnouncement,
            res: ResUpdateAnnouncement
        },
        "admin/UpdateConfig": {
            req: ReqUpdateConfig,
            res: ResUpdateConfig
        },
        "admin/UpdateEvent": {
            req: ReqUpdateEvent,
            res: ResUpdateEvent
        },
        "admin/UpdateInviteRewardConfig": {
            req: ReqUpdateInviteRewardConfig,
            res: ResUpdateInviteRewardConfig
        },
        "admin/UpdateOrderStatus": {
            req: ReqUpdateOrderStatus,
            res: ResUpdateOrderStatus
        },
        "internal/AddGold": {
            req: ReqAddGold,
            res: ResAddGold
        },
        "internal/CollectWithReward": {
            req: ReqCollectWithReward,
            res: ResCollectWithReward
        },
        "internal/DeductGold": {
            req: ReqDeductGold,
            res: ResDeductGold
        },
        "AcceptInvite": {
            req: ReqAcceptInvite,
            res: ResAcceptInvite
        },
        "AddExp": {
            req: ReqAddExp,
            res: ResAddExp
        },
        "ApplyToGuild": {
            req: ReqApplyToGuild,
            res: ResApplyToGuild
        },
        "Checkin": {
            req: ReqCheckin,
            res: ResCheckin
        },
        "ClaimAchievementReward": {
            req: ReqClaimAchievementReward,
            res: ResClaimAchievementReward
        },
        "ClaimMailReward": {
            req: ReqClaimMailReward,
            res: ResClaimMailReward
        },
        "ClaimSeasonReward": {
            req: ReqClaimSeasonReward,
            res: ResClaimSeasonReward
        },
        "ClaimTaskReward": {
            req: ReqClaimTaskReward,
            res: ResClaimTaskReward
        },
        "CollectCoin": {
            req: ReqCollectCoin,
            res: ResCollectCoin
        },
        "ConsumeGold": {
            req: ReqConsumeGold,
            res: ResConsumeGold
        },
        "CreateGuild": {
            req: ReqCreateGuild,
            res: ResCreateGuild
        },
        "CreatePaymentOrder": {
            req: ReqCreatePaymentOrder,
            res: ResCreatePaymentOrder
        },
        "DrawLottery": {
            req: ReqDrawLottery,
            res: ResDrawLottery
        },
        "ExchangeCdk": {
            req: ReqExchangeCdk,
            res: ResExchangeCdk
        },
        "ExpandInventory": {
            req: ReqExpandInventory,
            res: ResExpandInventory
        },
        "GameArea": {
            req: ReqGameArea,
            res: ResGameArea
        },
        "GetBuffs": {
            req: ReqGetBuffs,
            res: ResGetBuffs
        },
        "GetFriendList": {
            req: ReqGetFriendList,
            res: ResGetFriendList
        },
        "GetGuildInfo": {
            req: ReqGetGuildInfo,
            res: ResGetGuildInfo
        },
        "GetInventory": {
            req: ReqGetInventory,
            res: ResGetInventory
        },
        "GetInviteInfo": {
            req: ReqGetInviteInfo,
            res: ResGetInviteInfo
        },
        "GetJackpotProgress": {
            req: ReqGetJackpotProgress,
            res: ResGetJackpotProgress
        },
        "GetLeaderboard": {
            req: ReqGetLeaderboard,
            res: ResGetLeaderboard
        },
        "GetLevelInfo": {
            req: ReqGetLevelInfo,
            res: ResGetLevelInfo
        },
        "GetMailList": {
            req: ReqGetMailList,
            res: ResGetMailList
        },
        "GetSeasonInfo": {
            req: ReqGetSeasonInfo,
            res: ResGetSeasonInfo
        },
        "GetShareStats": {
            req: ReqGetShareStats,
            res: ResGetShareStats
        },
        "GetShopProducts": {
            req: ReqGetShopProducts,
            res: ResGetShopProducts
        },
        "GetSignInInfo": {
            req: ReqGetSignInInfo,
            res: ResGetSignInInfo
        },
        "GetUserAchievements": {
            req: ReqGetUserAchievements,
            res: ResGetUserAchievements
        },
        "GetUserRank": {
            req: ReqGetUserRank,
            res: ResGetUserRank
        },
        "GetUserTasks": {
            req: ReqGetUserTasks,
            res: ResGetUserTasks
        },
        "GetVIPInfo": {
            req: ReqGetVIPInfo,
            res: ResGetVIPInfo
        },
        "GuildDonate": {
            req: ReqGuildDonate,
            res: ResGuildDonate
        },
        "HandleFriendRequest": {
            req: ReqHandleFriendRequest,
            res: ResHandleFriendRequest
        },
        "Login": {
            req: ReqLogin,
            res: ResLogin
        },
        "PurchaseBattlePass": {
            req: ReqPurchaseBattlePass,
            res: ResPurchaseBattlePass
        },
        "PurchaseProduct": {
            req: ReqPurchaseProduct,
            res: ResPurchaseProduct
        },
        "PurchaseVIP": {
            req: ReqPurchaseVIP,
            res: ResPurchaseVIP
        },
        "Register": {
            req: ReqRegister,
            res: ResRegister
        },
        "SendFriendGift": {
            req: ReqSendFriendGift,
            res: ResSendFriendGift
        },
        "SendFriendRequest": {
            req: ReqSendFriendRequest,
            res: ResSendFriendRequest
        },
        "Share": {
            req: ReqShare,
            res: ResShare
        },
        "SignIn": {
            req: ReqSignIn,
            res: ResSignIn
        },
        "UseItem": {
            req: ReqUseItem,
            res: ResUseItem
        },
        "ValidateIntegrity": {
            req: ReqValidateIntegrity,
            res: ResValidateIntegrity
        }
    },
    msg: {

    }
}

export const serviceProto: ServiceProto<ServiceType> = {
    "version": 30,
    "services": [
        {
            "id": 47,
            "name": "admin/AdminLogin",
            "type": "api"
        },
        {
            "id": 48,
            "name": "admin/BanUser",
            "type": "api"
        },
        {
            "id": 49,
            "name": "admin/BatchBanUsers",
            "type": "api"
        },
        {
            "id": 50,
            "name": "admin/BatchSendMail",
            "type": "api"
        },
        {
            "id": 68,
            "name": "admin/CreateAdmin",
            "type": "api"
        },
        {
            "id": 80,
            "name": "admin/CreateAnnouncement",
            "type": "api"
        },
        {
            "id": 51,
            "name": "admin/CreateEvent",
            "type": "api"
        },
        {
            "id": 81,
            "name": "admin/DeleteAnnouncement",
            "type": "api"
        },
        {
            "id": 52,
            "name": "admin/DeleteEvent",
            "type": "api"
        },
        {
            "id": 101,
            "name": "admin/DeliverOrder",
            "type": "api"
        },
        {
            "id": 84,
            "name": "admin/DisableCdk",
            "type": "api"
        },
        {
            "id": 94,
            "name": "admin/ExportInviteLeaderboard",
            "type": "api"
        },
        {
            "id": 85,
            "name": "admin/GenerateCdk",
            "type": "api"
        },
        {
            "id": 74,
            "name": "admin/GetActiveAlerts",
            "type": "api"
        },
        {
            "id": 69,
            "name": "admin/GetAdmins",
            "type": "api"
        },
        {
            "id": 88,
            "name": "admin/GetAdvancedStats",
            "type": "api"
        },
        {
            "id": 82,
            "name": "admin/GetAnnouncements",
            "type": "api"
        },
        {
            "id": 72,
            "name": "admin/GetAuditLogs",
            "type": "api"
        },
        {
            "id": 73,
            "name": "admin/GetAuditStatistics",
            "type": "api"
        },
        {
            "id": 95,
            "name": "admin/GetCdkHistory",
            "type": "api"
        },
        {
            "id": 86,
            "name": "admin/GetCdkList",
            "type": "api"
        },
        {
            "id": 53,
            "name": "admin/GetConfig",
            "type": "api"
        },
        {
            "id": 54,
            "name": "admin/GetConfigHistory",
            "type": "api"
        },
        {
            "id": 55,
            "name": "admin/GetEvents",
            "type": "api"
        },
        {
            "id": 76,
            "name": "admin/GetFinancialStats",
            "type": "api"
        },
        {
            "id": 96,
            "name": "admin/GetInviteLeaderboard",
            "type": "api"
        },
        {
            "id": 97,
            "name": "admin/GetInviteRewardConfig",
            "type": "api"
        },
        {
            "id": 98,
            "name": "admin/GetInviteRewardHistory",
            "type": "api"
        },
        {
            "id": 89,
            "name": "admin/GetLiveLogs",
            "type": "api"
        },
        {
            "id": 56,
            "name": "admin/GetLogAnalytics",
            "type": "api"
        },
        {
            "id": 57,
            "name": "admin/GetLogs",
            "type": "api"
        },
        {
            "id": 58,
            "name": "admin/GetNotifications",
            "type": "api"
        },
        {
            "id": 77,
            "name": "admin/GetOrders",
            "type": "api"
        },
        {
            "id": 78,
            "name": "admin/GetRefunds",
            "type": "api"
        },
        {
            "id": 59,
            "name": "admin/GetStatistics",
            "type": "api"
        },
        {
            "id": 90,
            "name": "admin/GetSystemConfig",
            "type": "api"
        },
        {
            "id": 75,
            "name": "admin/GetSystemMetrics",
            "type": "api"
        },
        {
            "id": 91,
            "name": "admin/GetTickets",
            "type": "api"
        },
        {
            "id": 60,
            "name": "admin/GetUserDetail",
            "type": "api"
        },
        {
            "id": 61,
            "name": "admin/GetUsers",
            "type": "api"
        },
        {
            "id": 62,
            "name": "admin/GrantReward",
            "type": "api"
        },
        {
            "id": 79,
            "name": "admin/ProcessRefund",
            "type": "api"
        },
        {
            "id": 92,
            "name": "admin/ReplyTicket",
            "type": "api"
        },
        {
            "id": 102,
            "name": "admin/ResendOrderReward",
            "type": "api"
        },
        {
            "id": 63,
            "name": "admin/RollbackConfig",
            "type": "api"
        },
        {
            "id": 64,
            "name": "admin/SendMail",
            "type": "api"
        },
        {
            "id": 93,
            "name": "admin/SetMaintenance",
            "type": "api"
        },
        {
            "id": 65,
            "name": "admin/UnbanUser",
            "type": "api"
        },
        {
            "id": 70,
            "name": "admin/UpdateAdminStatus",
            "type": "api"
        },
        {
            "id": 83,
            "name": "admin/UpdateAnnouncement",
            "type": "api"
        },
        {
            "id": 66,
            "name": "admin/UpdateConfig",
            "type": "api"
        },
        {
            "id": 67,
            "name": "admin/UpdateEvent",
            "type": "api"
        },
        {
            "id": 99,
            "name": "admin/UpdateInviteRewardConfig",
            "type": "api"
        },
        {
            "id": 100,
            "name": "admin/UpdateOrderStatus",
            "type": "api"
        },
        {
            "id": 5,
            "name": "internal/AddGold",
            "type": "api"
        },
        {
            "id": 7,
            "name": "internal/CollectWithReward",
            "type": "api",
            "conf": {
                "needCheckAddress": true
            }
        },
        {
            "id": 6,
            "name": "internal/DeductGold",
            "type": "api"
        },
        {
            "id": 8,
            "name": "AcceptInvite",
            "type": "api"
        },
        {
            "id": 9,
            "name": "AddExp",
            "type": "api"
        },
        {
            "id": 10,
            "name": "ApplyToGuild",
            "type": "api"
        },
        {
            "id": 11,
            "name": "Checkin",
            "type": "api"
        },
        {
            "id": 12,
            "name": "ClaimAchievementReward",
            "type": "api"
        },
        {
            "id": 13,
            "name": "ClaimMailReward",
            "type": "api"
        },
        {
            "id": 14,
            "name": "ClaimSeasonReward",
            "type": "api"
        },
        {
            "id": 15,
            "name": "ClaimTaskReward",
            "type": "api"
        },
        {
            "id": 3,
            "name": "CollectCoin",
            "type": "api",
            "conf": {}
        },
        {
            "id": 4,
            "name": "ConsumeGold",
            "type": "api",
            "conf": {}
        },
        {
            "id": 16,
            "name": "CreateGuild",
            "type": "api"
        },
        {
            "id": 17,
            "name": "CreatePaymentOrder",
            "type": "api"
        },
        {
            "id": 18,
            "name": "DrawLottery",
            "type": "api",
            "conf": {
                "needLogin": true
            }
        },
        {
            "id": 87,
            "name": "ExchangeCdk",
            "type": "api"
        },
        {
            "id": 19,
            "name": "ExpandInventory",
            "type": "api"
        },
        {
            "id": 2,
            "name": "GameArea",
            "type": "api"
        },
        {
            "id": 20,
            "name": "GetBuffs",
            "type": "api"
        },
        {
            "id": 21,
            "name": "GetFriendList",
            "type": "api"
        },
        {
            "id": 22,
            "name": "GetGuildInfo",
            "type": "api"
        },
        {
            "id": 23,
            "name": "GetInventory",
            "type": "api",
            "conf": {
                "needLogin": true
            }
        },
        {
            "id": 24,
            "name": "GetInviteInfo",
            "type": "api"
        },
        {
            "id": 25,
            "name": "GetJackpotProgress",
            "type": "api",
            "conf": {
                "needLogin": true
            }
        },
        {
            "id": 26,
            "name": "GetLeaderboard",
            "type": "api"
        },
        {
            "id": 27,
            "name": "GetLevelInfo",
            "type": "api"
        },
        {
            "id": 28,
            "name": "GetMailList",
            "type": "api"
        },
        {
            "id": 29,
            "name": "GetSeasonInfo",
            "type": "api"
        },
        {
            "id": 30,
            "name": "GetShareStats",
            "type": "api"
        },
        {
            "id": 31,
            "name": "GetShopProducts",
            "type": "api"
        },
        {
            "id": 32,
            "name": "GetSignInInfo",
            "type": "api"
        },
        {
            "id": 33,
            "name": "GetUserAchievements",
            "type": "api"
        },
        {
            "id": 34,
            "name": "GetUserRank",
            "type": "api"
        },
        {
            "id": 35,
            "name": "GetUserTasks",
            "type": "api"
        },
        {
            "id": 36,
            "name": "GetVIPInfo",
            "type": "api"
        },
        {
            "id": 37,
            "name": "GuildDonate",
            "type": "api"
        },
        {
            "id": 38,
            "name": "HandleFriendRequest",
            "type": "api"
        },
        {
            "id": 0,
            "name": "Login",
            "type": "api",
            "conf": {}
        },
        {
            "id": 39,
            "name": "PurchaseBattlePass",
            "type": "api"
        },
        {
            "id": 40,
            "name": "PurchaseProduct",
            "type": "api"
        },
        {
            "id": 41,
            "name": "PurchaseVIP",
            "type": "api"
        },
        {
            "id": 1,
            "name": "Register",
            "type": "api"
        },
        {
            "id": 42,
            "name": "SendFriendGift",
            "type": "api"
        },
        {
            "id": 43,
            "name": "SendFriendRequest",
            "type": "api"
        },
        {
            "id": 44,
            "name": "Share",
            "type": "api"
        },
        {
            "id": 45,
            "name": "SignIn",
            "type": "api"
        },
        {
            "id": 46,
            "name": "UseItem",
            "type": "api"
        },
        {
            "id": 71,
            "name": "ValidateIntegrity",
            "type": "api"
        }
    ],
    "types": {
        "admin/PtlAdminLogin/ReqAdminLogin": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "username",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "password",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "twoFactorCode",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "__clientIp",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlAdminLogin/ResAdminLogin": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "token",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "adminUser",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "adminId",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 1,
                                "name": "username",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 2,
                                "name": "role",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 3,
                                "name": "permissions",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "String"
                                    }
                                }
                            },
                            {
                                "id": 4,
                                "name": "email",
                                "type": {
                                    "type": "String"
                                },
                                "optional": true
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "requireTwoFactor",
                    "type": {
                        "type": "Boolean"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlBanUser/ReqBanUser": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "reason",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "duration",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "admin/PtlBanUser/ResBanUser": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlBatchBanUsers/ReqBatchBanUsers": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "userIds",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    }
                },
                {
                    "id": 2,
                    "name": "reason",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "duration",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "admin/PtlBatchBanUsers/ResBatchBanUsers": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "successCount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "failedCount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "details",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "userId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "success",
                                    "type": {
                                        "type": "Boolean"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "message",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                }
                            ]
                        }
                    }
                }
            ]
        },
        "admin/PtlBatchSendMail/ReqBatchSendMail": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "userIds",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    }
                },
                {
                    "id": 2,
                    "name": "title",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "rewards",
                    "type": {
                        "type": "Any"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "expireAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlBatchSendMail/ResBatchSendMail": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "successCount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "failedCount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "details",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "userId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "success",
                                    "type": {
                                        "type": "Boolean"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "message",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                }
                            ]
                        }
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlCreateAdmin/ReqCreateAdmin": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "username",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "password",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "role",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Literal",
                                    "literal": "super_admin"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": "operator"
                                }
                            },
                            {
                                "id": 2,
                                "type": {
                                    "type": "Literal",
                                    "literal": "customer_service"
                                }
                            },
                            {
                                "id": 3,
                                "type": {
                                    "type": "Literal",
                                    "literal": "analyst"
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 4,
                    "name": "email",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlCreateAdmin/ResCreateAdmin": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "adminId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlCreateAnnouncement/ReqCreateAnnouncement": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/AnnouncementSystem/AnnouncementType"
                    }
                },
                {
                    "id": 2,
                    "name": "title",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "priority",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "platforms",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "imageUrl",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "linkUrl",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/AnnouncementSystem/AnnouncementType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "notice"
                },
                {
                    "id": 1,
                    "value": "scroll"
                },
                {
                    "id": 2,
                    "value": "activity"
                }
            ]
        },
        "admin/PtlCreateAnnouncement/ResCreateAnnouncement": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "announcementId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlCreateEvent/ReqCreateEvent": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "eventType",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "title",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "description",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "config",
                    "type": {
                        "type": "Any"
                    }
                },
                {
                    "id": 7,
                    "name": "rewards",
                    "type": {
                        "type": "Any"
                    }
                }
            ]
        },
        "admin/PtlCreateEvent/ResCreateEvent": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "eventId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlDeleteAnnouncement/ReqDeleteAnnouncement": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "announcementId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlDeleteAnnouncement/ResDeleteAnnouncement": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlDeleteEvent/ReqDeleteEvent": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "eventId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlDeleteEvent/ResDeleteEvent": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlDeliverOrder/ReqDeliverOrder": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "orderId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlDeliverOrder/ResDeliverOrder": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                }
            ]
        },
        "admin/PtlDisableCdk/ReqDisableCdk": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "code",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "disableBatch",
                    "type": {
                        "type": "Boolean"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "reason",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlDisableCdk/ResDisableCdk": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "affected",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlExportInviteLeaderboard/ReqExportInviteLeaderboard": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "sortBy",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteAdminSystem/InviteLeaderboardSort"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "search",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/InviteAdminSystem/InviteLeaderboardSort": {
            "type": "Union",
            "members": [
                {
                    "id": 0,
                    "type": {
                        "type": "Literal",
                        "literal": "invites"
                    }
                },
                {
                    "id": 1,
                    "type": {
                        "type": "Literal",
                        "literal": "rewards"
                    }
                }
            ]
        },
        "admin/PtlExportInviteLeaderboard/ResExportInviteLeaderboard": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "fileName",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "csvBase64",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "generatedAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "admin/PtlGenerateCdk/ReqGenerateCdk": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/CdkSystem/CdkType"
                    }
                },
                {
                    "id": 3,
                    "name": "rewards",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/CdkSystem/CdkReward"
                    }
                },
                {
                    "id": 4,
                    "name": "count",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "usageLimit",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "prefix",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "expireAt",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/CdkSystem/CdkType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "single"
                },
                {
                    "id": 1,
                    "value": "universal"
                }
            ]
        },
        "../../../server/gate/bll/CdkSystem/CdkReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "gold",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "tickets",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "items",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "itemId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "quantity",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGenerateCdk/ResGenerateCdk": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "batchId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "codes",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetActiveAlerts/ReqGetActiveAlerts": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetActiveAlerts/ResGetActiveAlerts": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "alerts",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "id",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "type",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "level",
                                    "type": {
                                        "type": "Union",
                                        "members": [
                                            {
                                                "id": 0,
                                                "type": {
                                                    "type": "Literal",
                                                    "literal": "info"
                                                }
                                            },
                                            {
                                                "id": 1,
                                                "type": {
                                                    "type": "Literal",
                                                    "literal": "warning"
                                                }
                                            },
                                            {
                                                "id": 2,
                                                "type": {
                                                    "type": "Literal",
                                                    "literal": "critical"
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    "id": 3,
                                    "name": "title",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 4,
                                    "name": "message",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 5,
                                    "name": "value",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 6,
                                    "name": "threshold",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 7,
                                    "name": "timestamp",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAdmins/ReqGetAdmins": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAdmins/ResGetAdmins": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "admins",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "adminId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "username",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "role",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 3,
                                    "name": "email",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                },
                                {
                                    "id": 4,
                                    "name": "status",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 5,
                                    "name": "createdAt",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 6,
                                    "name": "lastLoginAt",
                                    "type": {
                                        "type": "Number"
                                    },
                                    "optional": true
                                }
                            ]
                        }
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAdvancedStats/ReqGetAdvancedStats": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "type",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Literal",
                                    "literal": "ltv"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": "retention"
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 2,
                    "name": "days",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAdvancedStats/ResGetAdvancedStats": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "data",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Any"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAnnouncements/ReqGetAnnouncements": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/AnnouncementSystem/AnnouncementType"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "activeOnly",
                    "type": {
                        "type": "Boolean"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAnnouncements/ResGetAnnouncements": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "list",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/AnnouncementSystem/Announcement"
                        }
                    }
                },
                {
                    "id": 2,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/AnnouncementSystem/Announcement": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "announcementId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/AnnouncementSystem/AnnouncementType"
                    }
                },
                {
                    "id": 2,
                    "name": "title",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "priority",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "platforms",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "active",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 9,
                    "name": "imageUrl",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 10,
                    "name": "linkUrl",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 11,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 12,
                    "name": "createdBy",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 13,
                    "name": "updatedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 14,
                    "name": "updatedBy",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAuditLogs/ReqGetAuditLogs": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "adminId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "action",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "category",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Literal",
                                    "literal": "user_management"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": "admin_management"
                                }
                            },
                            {
                                "id": 2,
                                "type": {
                                    "type": "Literal",
                                    "literal": "system_config"
                                }
                            },
                            {
                                "id": 3,
                                "type": {
                                    "type": "Literal",
                                    "literal": "game_data"
                                }
                            },
                            {
                                "id": 4,
                                "type": {
                                    "type": "Literal",
                                    "literal": "financial"
                                }
                            },
                            {
                                "id": 5,
                                "type": {
                                    "type": "Literal",
                                    "literal": "security"
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "targetId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "result",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Literal",
                                    "literal": "success"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": "failed"
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAuditLogs/ResGetAuditLogs": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "logs",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "logId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "adminId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "adminUsername",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 3,
                                    "name": "action",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 4,
                                    "name": "category",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 5,
                                    "name": "targetType",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                },
                                {
                                    "id": 6,
                                    "name": "targetId",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                },
                                {
                                    "id": 7,
                                    "name": "targetName",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                },
                                {
                                    "id": 8,
                                    "name": "details",
                                    "type": {
                                        "type": "Any"
                                    }
                                },
                                {
                                    "id": 9,
                                    "name": "ipAddress",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 10,
                                    "name": "userAgent",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                },
                                {
                                    "id": 11,
                                    "name": "result",
                                    "type": {
                                        "type": "Union",
                                        "members": [
                                            {
                                                "id": 0,
                                                "type": {
                                                    "type": "Literal",
                                                    "literal": "success"
                                                }
                                            },
                                            {
                                                "id": 1,
                                                "type": {
                                                    "type": "Literal",
                                                    "literal": "failed"
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    "id": 12,
                                    "name": "errorMessage",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                },
                                {
                                    "id": 13,
                                    "name": "createdAt",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "pageSize",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAuditStatistics/ReqGetAuditStatistics": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetAuditStatistics/ResGetAuditStatistics": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "data",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "totalLogs",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 1,
                                "name": "successRate",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "topActions",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Interface",
                                        "properties": [
                                            {
                                                "id": 0,
                                                "name": "action",
                                                "type": {
                                                    "type": "String"
                                                }
                                            },
                                            {
                                                "id": 1,
                                                "name": "count",
                                                "type": {
                                                    "type": "Number"
                                                }
                                            }
                                        ]
                                    }
                                }
                            },
                            {
                                "id": 3,
                                "name": "topAdmins",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Interface",
                                        "properties": [
                                            {
                                                "id": 0,
                                                "name": "adminId",
                                                "type": {
                                                    "type": "String"
                                                }
                                            },
                                            {
                                                "id": 1,
                                                "name": "adminUsername",
                                                "type": {
                                                    "type": "String"
                                                }
                                            },
                                            {
                                                "id": 2,
                                                "name": "count",
                                                "type": {
                                                    "type": "Number"
                                                }
                                            }
                                        ]
                                    }
                                }
                            },
                            {
                                "id": 4,
                                "name": "categoryDistribution",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Interface",
                                        "properties": [
                                            {
                                                "id": 0,
                                                "name": "category",
                                                "type": {
                                                    "type": "String"
                                                }
                                            },
                                            {
                                                "id": 1,
                                                "name": "count",
                                                "type": {
                                                    "type": "Number"
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetCdkHistory/ReqGetCdkHistory": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "batchId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "code",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "admin/PtlGetCdkHistory/CdkHistoryType"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetCdkHistory/CdkHistoryType": {
            "type": "Union",
            "members": [
                {
                    "id": 0,
                    "type": {
                        "type": "Literal",
                        "literal": "usage"
                    }
                },
                {
                    "id": 1,
                    "type": {
                        "type": "Literal",
                        "literal": "actions"
                    }
                },
                {
                    "id": 2,
                    "type": {
                        "type": "Literal",
                        "literal": "all"
                    }
                }
            ]
        },
        "admin/PtlGetCdkHistory/ResGetCdkHistory": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "usage",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "list",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Reference",
                                        "target": "../../../server/gate/bll/CdkSystem/CdkUsageLog"
                                    }
                                }
                            },
                            {
                                "id": 1,
                                "name": "total",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "page",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 3,
                                "name": "pageSize",
                                "type": {
                                    "type": "Number"
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 1,
                    "name": "actions",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "list",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Reference",
                                        "target": "../../../server/gate/bll/CdkAdminSystem/CdkAdminActionLog"
                                    }
                                }
                            },
                            {
                                "id": 1,
                                "name": "total",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "page",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 3,
                                "name": "pageSize",
                                "type": {
                                    "type": "Number"
                                }
                            }
                        ]
                    }
                }
            ]
        },
        "../../../server/gate/bll/CdkSystem/CdkUsageLog": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "code",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "rewards",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/CdkSystem/CdkReward"
                    }
                },
                {
                    "id": 3,
                    "name": "batchId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "usedAt",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/CdkAdminSystem/CdkAdminActionLog": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "actionId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "action",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/CdkAdminSystem/CdkAdminActionType"
                    }
                },
                {
                    "id": 2,
                    "name": "batchId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "code",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "adminId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 5,
                    "name": "adminName",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 6,
                    "name": "comment",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "payload",
                    "type": {
                        "type": "Interface",
                        "indexSignature": {
                            "keyType": "String",
                            "type": {
                                "type": "Any"
                            }
                        }
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/CdkAdminSystem/CdkAdminActionType": {
            "type": "Union",
            "members": [
                {
                    "id": 0,
                    "type": {
                        "type": "Literal",
                        "literal": "generate"
                    }
                },
                {
                    "id": 1,
                    "type": {
                        "type": "Literal",
                        "literal": "disable_code"
                    }
                },
                {
                    "id": 2,
                    "type": {
                        "type": "Literal",
                        "literal": "disable_batch"
                    }
                },
                {
                    "id": 3,
                    "type": {
                        "type": "Literal",
                        "literal": "export"
                    }
                }
            ]
        },
        "admin/PtlGetCdkList/ReqGetCdkList": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "batchId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "code",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/CdkSystem/CdkType"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "active",
                    "type": {
                        "type": "Boolean"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetCdkList/ResGetCdkList": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "list",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/CdkSystem/CdkCode"
                        }
                    }
                },
                {
                    "id": 2,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/CdkSystem/CdkCode": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "code",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "batchId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/CdkSystem/CdkType"
                    }
                },
                {
                    "id": 3,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "rewards",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/CdkSystem/CdkReward"
                    }
                },
                {
                    "id": 5,
                    "name": "usageLimit",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "usageCount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "usedBy",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "expireAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 10,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 11,
                    "name": "createdBy",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 12,
                    "name": "active",
                    "type": {
                        "type": "Boolean"
                    }
                }
            ]
        },
        "admin/PtlGetConfig/ReqGetConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "configType",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlGetConfig/ResGetConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "configType",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "config",
                    "type": {
                        "type": "Any"
                    }
                },
                {
                    "id": 2,
                    "name": "version",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "lastUpdatedAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "lastUpdatedBy",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetConfigHistory/ReqGetConfigHistory": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "configType",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetConfigHistory/ResGetConfigHistory": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "history",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "historyId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "version",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "config",
                                    "type": {
                                        "type": "Any"
                                    }
                                },
                                {
                                    "id": 3,
                                    "name": "updatedBy",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 4,
                                    "name": "updatedAt",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 5,
                                    "name": "comment",
                                    "type": {
                                        "type": "String"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetEvents/ReqGetEvents": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "status",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetEvents/ResGetEvents": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "events",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "eventId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "eventType",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "title",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 3,
                                    "name": "description",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 4,
                                    "name": "startTime",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 5,
                                    "name": "endTime",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 6,
                                    "name": "status",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 7,
                                    "name": "config",
                                    "type": {
                                        "type": "Any"
                                    }
                                },
                                {
                                    "id": 8,
                                    "name": "rewards",
                                    "type": {
                                        "type": "Any"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetFinancialStats/ReqGetFinancialStats": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "startDate",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "endDate",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "admin/PtlGetFinancialStats/ResGetFinancialStats": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "dailyRevenue",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "date",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "revenue",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "orders",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 3,
                    "name": "totalRevenue",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "totalOrders",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "avgOrderValue",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "topSpenders",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "userId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "total",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        },
        "admin/PtlGetInviteLeaderboard/ReqGetInviteLeaderboard": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "sortBy",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteAdminSystem/InviteLeaderboardSort"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "search",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetInviteLeaderboard/ResGetInviteLeaderboard": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "list",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/InviteAdminSystem/InviteLeaderboardEntry"
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "pageSize",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "summary",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "totalInvites",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 1,
                                "name": "totalRewards",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "totalInviters",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 3,
                                "name": "todaysNewInvites",
                                "type": {
                                    "type": "Number"
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 5,
                    "name": "configVersion",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/InviteAdminSystem/InviteLeaderboardEntry": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "inviteCode",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "inviteLink",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "totalInvites",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "validInvites",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "totalRewards",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "rank",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "admin/PtlGetInviteRewardConfig/ReqGetInviteRewardConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetInviteRewardConfig/ResGetInviteRewardConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "version",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "config",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteSystem/InviteRewardConfig"
                    }
                },
                {
                    "id": 2,
                    "name": "updatedAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "updatedBy",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "adminId",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 1,
                                "name": "username",
                                "type": {
                                    "type": "String"
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 4,
                    "name": "reviewer",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "adminId",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 1,
                                "name": "username",
                                "type": {
                                    "type": "String"
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "reviewStatus",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteConfigSystem/InviteConfigReviewStatus"
                    }
                },
                {
                    "id": 6,
                    "name": "comment",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/InviteSystem/InviteRewardConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "registerReward",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "registerRewardInviter",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "firstChargeRate",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "level10Reward",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "level20Reward",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "level30Reward",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/InviteConfigSystem/InviteConfigReviewStatus": {
            "type": "Union",
            "members": [
                {
                    "id": 0,
                    "type": {
                        "type": "Literal",
                        "literal": "approved"
                    }
                },
                {
                    "id": 1,
                    "type": {
                        "type": "Literal",
                        "literal": "pending"
                    }
                },
                {
                    "id": 2,
                    "type": {
                        "type": "Literal",
                        "literal": "rejected"
                    }
                }
            ]
        },
        "admin/PtlGetInviteRewardHistory/ReqGetInviteRewardHistory": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteConfigSystem/InviteConfigReviewStatus"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetInviteRewardHistory/ResGetInviteRewardHistory": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "history",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/InviteConfigSystem/InviteRewardConfigHistory"
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "pageSize",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/InviteConfigSystem/InviteRewardConfigHistory": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteConfigSystem/InviteRewardConfigRecord"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "historyId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/InviteConfigSystem/InviteRewardConfigRecord": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "_id",
                    "type": {
                        "type": "Reference",
                        "target": "?mongodb/ObjectId"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "version",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "config",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteSystem/InviteRewardConfig"
                    }
                },
                {
                    "id": 3,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteConfigSystem/InviteConfigStatus"
                    }
                },
                {
                    "id": 4,
                    "name": "reviewStatus",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteConfigSystem/InviteConfigReviewStatus"
                    }
                },
                {
                    "id": 5,
                    "name": "updatedAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "updatedBy",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "adminId",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 1,
                                "name": "username",
                                "type": {
                                    "type": "String"
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 7,
                    "name": "comment",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "reviewer",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "adminId",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 1,
                                "name": "username",
                                "type": {
                                    "type": "String"
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "reviewedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/InviteConfigSystem/InviteConfigStatus": {
            "type": "Union",
            "members": [
                {
                    "id": 0,
                    "type": {
                        "type": "Literal",
                        "literal": "active"
                    }
                },
                {
                    "id": 1,
                    "type": {
                        "type": "Literal",
                        "literal": "pending"
                    }
                },
                {
                    "id": 2,
                    "type": {
                        "type": "Literal",
                        "literal": "archived"
                    }
                }
            ]
        },
        "admin/PtlGetLiveLogs/ReqGetLiveLogs": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "lines",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "grep",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetLiveLogs/ResGetLiveLogs": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "logs",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetLogAnalytics/ReqGetLogAnalytics": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetLogAnalytics/ResGetLogAnalytics": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "actionStats",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "action",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "count",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "percentage",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "adminStats",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "adminId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "adminName",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                },
                                {
                                    "id": 2,
                                    "name": "operationCount",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 3,
                                    "name": "lastOperation",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 2,
                    "name": "timeDistribution",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "hour",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "count",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 3,
                    "name": "dailyTrend",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "date",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "count",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 4,
                    "name": "totalOperations",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "activeAdmins",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "mostCommonAction",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlGetLogs/ReqGetLogs": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "type",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetLogs/ResGetLogs": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "logs",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "logId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "type",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "userId",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                },
                                {
                                    "id": 3,
                                    "name": "action",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 4,
                                    "name": "details",
                                    "type": {
                                        "type": "Any"
                                    }
                                },
                                {
                                    "id": 5,
                                    "name": "timestamp",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetNotifications/ReqGetNotifications": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "since",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetNotifications/ResGetNotifications": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "notifications",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "id",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "type",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "title",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 3,
                                    "name": "message",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 4,
                                    "name": "data",
                                    "type": {
                                        "type": "Any"
                                    },
                                    "optional": true
                                },
                                {
                                    "id": 5,
                                    "name": "timestamp",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 6,
                                    "name": "adminName",
                                    "type": {
                                        "type": "String"
                                    },
                                    "optional": true
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "hasMore",
                    "type": {
                        "type": "Boolean"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "listenerCount",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetOrders/ReqGetOrders": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/PaymentSystem/OrderStatus"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "orderId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "startDate",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "endDate",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/PaymentSystem/OrderStatus": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "pending"
                },
                {
                    "id": 1,
                    "value": "paid"
                },
                {
                    "id": 2,
                    "value": "delivered"
                },
                {
                    "id": 3,
                    "value": "cancelled"
                },
                {
                    "id": 4,
                    "value": "refunded"
                },
                {
                    "id": 5,
                    "value": "failed"
                }
            ]
        },
        "admin/PtlGetOrders/ResGetOrders": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "orders",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/PaymentSystem/PaymentOrder"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/PaymentSystem/PaymentOrder": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "orderId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "productId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "productName",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "amount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "currency",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 6,
                    "name": "channel",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/PaymentSystem/PaymentChannel"
                    }
                },
                {
                    "id": 7,
                    "name": "channelOrderId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "paymentUrl",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/PaymentSystem/OrderStatus"
                    }
                },
                {
                    "id": 10,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 11,
                    "name": "paidAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 12,
                    "name": "deliveredAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 16,
                    "name": "refundedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 13,
                    "name": "notifyUrl",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 14,
                    "name": "returnUrl",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 15,
                    "name": "metadata",
                    "type": {
                        "type": "Any"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/PaymentSystem/PaymentChannel": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "wechat"
                },
                {
                    "id": 1,
                    "value": "alipay"
                },
                {
                    "id": 2,
                    "value": "paypal"
                },
                {
                    "id": 3,
                    "value": "stripe"
                },
                {
                    "id": 4,
                    "value": "sui"
                }
            ]
        },
        "admin/PtlGetRefunds/ReqGetRefunds": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "status",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetRefunds/ResGetRefunds": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "refunds",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/PaymentSystem/RefundRequest"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/PaymentSystem/RefundRequest": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "refundId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "orderId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "amount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "reason",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 5,
                    "name": "status",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Literal",
                                    "literal": "pending"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": "approved"
                                }
                            },
                            {
                                "id": 2,
                                "type": {
                                    "type": "Literal",
                                    "literal": "rejected"
                                }
                            },
                            {
                                "id": 3,
                                "type": {
                                    "type": "Literal",
                                    "literal": "completed"
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 6,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "processedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "processedBy",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "processedByName",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 10,
                    "name": "channelRefundId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 11,
                    "name": "adminNote",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 12,
                    "name": "evidenceUrls",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetStatistics/ReqGetStatistics": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetStatistics/ResGetStatistics": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "totalUsers",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "activeUsers",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "totalRevenue",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "newUsersToday",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "dau",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "mau",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "todayRevenue",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "arpu",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "arppu",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "payRate",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 10,
                    "name": "totalMatches",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 11,
                    "name": "avgSessionTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetSystemConfig/ReqGetSystemConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "key",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlGetSystemConfig/ResGetSystemConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "value",
                    "type": {
                        "type": "Any"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetSystemMetrics/ReqGetSystemMetrics": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetSystemMetrics/ResGetSystemMetrics": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "server",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "cpu",
                                "type": {
                                    "type": "Interface",
                                    "properties": [
                                        {
                                            "id": 0,
                                            "name": "usage",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 1,
                                            "name": "cores",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 2,
                                            "name": "loadAverage",
                                            "type": {
                                                "type": "Array",
                                                "elementType": {
                                                    "type": "Number"
                                                }
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "id": 1,
                                "name": "memory",
                                "type": {
                                    "type": "Interface",
                                    "properties": [
                                        {
                                            "id": 0,
                                            "name": "total",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 1,
                                            "name": "used",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 2,
                                            "name": "free",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 3,
                                            "name": "usage",
                                            "type": {
                                                "type": "Number"
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "id": 2,
                                "name": "requests",
                                "type": {
                                    "type": "Interface",
                                    "properties": [
                                        {
                                            "id": 0,
                                            "name": "qps",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 1,
                                            "name": "avgResponseTime",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 2,
                                            "name": "errorRate",
                                            "type": {
                                                "type": "Number"
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "business",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "users",
                                "type": {
                                    "type": "Interface",
                                    "properties": [
                                        {
                                            "id": 0,
                                            "name": "online",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 1,
                                            "name": "dau",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 2,
                                            "name": "newToday",
                                            "type": {
                                                "type": "Number"
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "id": 1,
                                "name": "game",
                                "type": {
                                    "type": "Interface",
                                    "properties": [
                                        {
                                            "id": 0,
                                            "name": "activeMatches",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 1,
                                            "name": "totalMatches",
                                            "type": {
                                                "type": "Number"
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "id": 2,
                                "name": "revenue",
                                "type": {
                                    "type": "Interface",
                                    "properties": [
                                        {
                                            "id": 0,
                                            "name": "todayRevenue",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 1,
                                            "name": "orderCount",
                                            "type": {
                                                "type": "Number"
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "id": 3,
                                "name": "errors",
                                "type": {
                                    "type": "Interface",
                                    "properties": [
                                        {
                                            "id": 0,
                                            "name": "gameErrors",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 1,
                                            "name": "paymentErrors",
                                            "type": {
                                                "type": "Number"
                                            }
                                        },
                                        {
                                            "id": 2,
                                            "name": "serverErrors",
                                            "type": {
                                                "type": "Number"
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetTickets/ReqGetTickets": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TicketSystem/TicketStatus"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TicketSystem/TicketType"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/TicketSystem/TicketStatus": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "open"
                },
                {
                    "id": 1,
                    "value": "progress"
                },
                {
                    "id": 2,
                    "value": "replied"
                },
                {
                    "id": 3,
                    "value": "closed"
                }
            ]
        },
        "../../../server/gate/bll/TicketSystem/TicketType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "bug"
                },
                {
                    "id": 1,
                    "value": "payment"
                },
                {
                    "id": 2,
                    "value": "report"
                },
                {
                    "id": 3,
                    "value": "account"
                },
                {
                    "id": 4,
                    "value": "other"
                }
            ]
        },
        "admin/PtlGetTickets/ResGetTickets": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "tickets",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/TicketSystem/Ticket"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/TicketSystem/Ticket": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "ticketId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TicketSystem/TicketType"
                    }
                },
                {
                    "id": 3,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TicketSystem/TicketStatus"
                    }
                },
                {
                    "id": 4,
                    "name": "subject",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 5,
                    "name": "messages",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/TicketSystem/TicketMessage"
                        }
                    }
                },
                {
                    "id": 6,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "updatedAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 8,
                    "name": "closedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "deviceModel",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 10,
                    "name": "appVersion",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/TicketSystem/TicketMessage": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "sender",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Literal",
                                    "literal": "user"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": "admin"
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 1,
                    "name": "senderId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "senderName",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "imageUrl",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "timestamp",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "admin/PtlGetUserDetail/ReqGetUserDetail": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlGetUserDetail/ResGetUserDetail": {
            "type": "Interface",
            "properties": [
                {
                    "id": 1,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 0,
                    "name": "user",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "userId",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 1,
                                "name": "username",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 8,
                                "name": "nickname",
                                "type": {
                                    "type": "String"
                                },
                                "optional": true
                            },
                            {
                                "id": 9,
                                "name": "avatar",
                                "type": {
                                    "type": "String"
                                },
                                "optional": true
                            },
                            {
                                "id": 2,
                                "name": "gold",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 3,
                                "name": "tickets",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 10,
                                "name": "gems",
                                "type": {
                                    "type": "Number"
                                },
                                "optional": true
                            },
                            {
                                "id": 11,
                                "name": "exp",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 12,
                                "name": "level",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 13,
                                "name": "vipLevel",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 4,
                                "name": "status",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 14,
                                "name": "createdAt",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 5,
                                "name": "lastLoginTime",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 15,
                                "name": "lastLoginIp",
                                "type": {
                                    "type": "String"
                                },
                                "optional": true
                            },
                            {
                                "id": 16,
                                "name": "deviceModel",
                                "type": {
                                    "type": "String"
                                },
                                "optional": true
                            },
                            {
                                "id": 17,
                                "name": "totalRecharge",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 18,
                                "name": "totalGames",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 19,
                                "name": "winRate",
                                "type": {
                                    "type": "Number"
                                },
                                "optional": true
                            },
                            {
                                "id": 7,
                                "name": "inventory",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Any"
                                    }
                                },
                                "optional": true
                            },
                            {
                                "id": 20,
                                "name": "activeBuffs",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Any"
                                    }
                                },
                                "optional": true
                            },
                            {
                                "id": 21,
                                "name": "tags",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "String"
                                    }
                                },
                                "optional": true
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "recentOrders",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Any"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "recentLogs",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Any"
                        }
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetUsers/ReqGetUsers": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "search",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "status",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlGetUsers/ResGetUsers": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "users",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "userId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "username",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "gold",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 3,
                                    "name": "status",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 4,
                                    "name": "lastLoginTime",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 5,
                                    "name": "createdAt",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "admin/PtlGrantReward/ReqGrantReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "reason",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "rewards",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "gold",
                                "type": {
                                    "type": "Number"
                                },
                                "optional": true
                            },
                            {
                                "id": 1,
                                "name": "tickets",
                                "type": {
                                    "type": "Number"
                                },
                                "optional": true
                            },
                            {
                                "id": 2,
                                "name": "exp",
                                "type": {
                                    "type": "Number"
                                },
                                "optional": true
                            },
                            {
                                "id": 3,
                                "name": "items",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Interface",
                                        "properties": [
                                            {
                                                "id": 0,
                                                "name": "itemId",
                                                "type": {
                                                    "type": "String"
                                                }
                                            },
                                            {
                                                "id": 1,
                                                "name": "quantity",
                                                "type": {
                                                    "type": "Number"
                                                }
                                            }
                                        ]
                                    }
                                },
                                "optional": true
                            },
                            {
                                "id": 4,
                                "name": "skins",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "String"
                                    }
                                },
                                "optional": true
                            },
                            {
                                "id": 5,
                                "name": "vipDays",
                                "type": {
                                    "type": "Number"
                                },
                                "optional": true
                            }
                        ]
                    }
                }
            ]
        },
        "admin/PtlGrantReward/ResGrantReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlProcessRefund/ReqProcessRefund": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "refundId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "approved",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 3,
                    "name": "note",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlProcessRefund/ResProcessRefund": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlReplyTicket/ReqReplyTicket": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "ticketId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "closeTicket",
                    "type": {
                        "type": "Boolean"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlReplyTicket/ResReplyTicket": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlResendOrderReward/ReqResendOrderReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "orderId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlResendOrderReward/ResResendOrderReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                }
            ]
        },
        "admin/PtlRollbackConfig/ReqRollbackConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "configType",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "historyId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlRollbackConfig/ResRollbackConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "version",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlSendMail/ReqSendMail": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "type",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "userIds",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "title",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 5,
                    "name": "rewards",
                    "type": {
                        "type": "Any"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "expireAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlSendMail/ResSendMail": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "sentCount",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlSetMaintenance/ReqSetMaintenance": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "enabled",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 2,
                    "name": "reason",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "whitelistIps",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "whitelistUsers",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlSetMaintenance/ResSetMaintenance": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlUnbanUser/ReqUnbanUser": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "admin/PtlUnbanUser/ResUnbanUser": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlUpdateAdminStatus/ReqUpdateAdminStatus": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "adminId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "status",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Literal",
                                    "literal": "active"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": "disabled"
                                }
                            }
                        ]
                    }
                }
            ]
        },
        "admin/PtlUpdateAdminStatus/ResUpdateAdminStatus": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlUpdateAnnouncement/ReqUpdateAnnouncement": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "announcementId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "updates",
                    "type": {
                        "type": "Partial",
                        "target": {
                            "target": {
                                "type": "Reference",
                                "target": "../../../server/gate/bll/AnnouncementSystem/Announcement"
                            },
                            "keys": [
                                "announcementId",
                                "createdAt",
                                "createdBy"
                            ],
                            "type": "Omit"
                        }
                    }
                }
            ]
        },
        "admin/PtlUpdateAnnouncement/ResUpdateAnnouncement": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlUpdateConfig/ReqUpdateConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "configType",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "config",
                    "type": {
                        "type": "Any"
                    }
                },
                {
                    "id": 3,
                    "name": "comment",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlUpdateConfig/ResUpdateConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "version",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlUpdateEvent/ReqUpdateEvent": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "eventId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "title",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "description",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "status",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "enabled",
                    "type": {
                        "type": "Boolean"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "config",
                    "type": {
                        "type": "Any"
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "rewards",
                    "type": {
                        "type": "Any"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlUpdateEvent/ResUpdateEvent": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlUpdateInviteRewardConfig/ReqUpdateInviteRewardConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "config",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteSystem/InviteRewardConfig"
                    }
                },
                {
                    "id": 2,
                    "name": "comment",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "reviewerId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "reviewerName",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "reviewStatus",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteConfigSystem/InviteConfigReviewStatus"
                    },
                    "optional": true
                }
            ]
        },
        "admin/PtlUpdateInviteRewardConfig/ResUpdateInviteRewardConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "version",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteConfigSystem/InviteConfigReviewStatus"
                    }
                },
                {
                    "id": 3,
                    "name": "updatedAt",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "admin/PtlUpdateOrderStatus/ReqUpdateOrderStatus": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "orderId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/PaymentSystem/OrderStatus"
                    }
                }
            ]
        },
        "admin/PtlUpdateOrderStatus/ResUpdateOrderStatus": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                }
            ]
        },
        "internal/PtlAddGold/ReqAddGold": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseRequest"
                    }
                }
            ],
            "properties": [
                {
                    "id": 3,
                    "name": "transactionId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "amount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "reason",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "signature",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "timestamp",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../base/BaseRequest": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "internal/PtlAddGold/ResAddGold": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseResponse"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "balance",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "isDuplicate",
                    "type": {
                        "type": "Boolean"
                    },
                    "optional": true
                }
            ]
        },
        "../base/BaseResponse": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "internal/PtlCollectWithReward/ReqCollectWithReward": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseRequest"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "transactionId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "baseAmount",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "internal/PtlCollectWithReward/ResCollectWithReward": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseResponse"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "baseReward",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "bonusReward",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "totalReward",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "tickets",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "rewardType",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 6,
                    "name": "rewardMessage",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 7,
                    "name": "jackpotProgress",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 8,
                    "name": "shouldBroadcast",
                    "type": {
                        "type": "Boolean"
                    }
                }
            ]
        },
        "internal/PtlDeductGold/ReqDeductGold": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseRequest"
                    }
                }
            ],
            "properties": [
                {
                    "id": 3,
                    "name": "transactionId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "amount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "reason",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "__ssoToken",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "signature",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "timestamp",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "internal/PtlDeductGold/ResDeductGold": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseResponse"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "balance",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "isDuplicate",
                    "type": {
                        "type": "Boolean"
                    },
                    "optional": true
                }
            ]
        },
        "PtlAcceptInvite/ReqAcceptInvite": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "inviteCode",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlAcceptInvite/ResAcceptInvite": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlAddExp/ReqAddExp": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "exp",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlAddExp/ResAddExp": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "leveledUp",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 2,
                    "name": "oldLevel",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "newLevel",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "rewards",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/LevelSystem/LevelReward"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/LevelSystem/LevelReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "gold",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "tickets",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "multiplier",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "dropRateBonus",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "unlockedSkins",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "unlockedItems",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "title",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlApplyToGuild/ReqApplyToGuild": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "guildId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlApplyToGuild/ResApplyToGuild": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "applicationId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlCheckin/ReqCheckin": {
            "type": "Interface"
        },
        "PtlCheckin/ResCheckin": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "reward",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskReward"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "checkinDays",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "consecutiveDays",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "checkinInfo",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/CheckinData"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/TaskSystem/TaskReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "gold",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "tickets",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "exp",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "items",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "itemId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "quantity",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/TaskSystem/CheckinData": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "checkinDays",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "consecutiveDays",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "lastCheckinDate",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "checkinHistory",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    }
                }
            ]
        },
        "PtlClaimAchievementReward/ReqClaimAchievementReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "achievementId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlClaimAchievementReward/ResClaimAchievementReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "reward",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskReward"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "title",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlClaimMailReward/ReqClaimMailReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "mailId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlClaimMailReward/ResClaimMailReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "rewards",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/MailSystem/MailReward"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/MailSystem/MailReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "gold",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "tickets",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "items",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "itemId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "quantity",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "skins",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "exp",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "PtlClaimSeasonReward/ReqClaimSeasonReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "level",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/SeasonSystem/BattlePassType"
                    }
                }
            ]
        },
        "../../../server/gate/bll/SeasonSystem/BattlePassType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "free"
                },
                {
                    "id": 1,
                    "value": "premium"
                }
            ]
        },
        "PtlClaimSeasonReward/ResClaimSeasonReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "reward",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskReward"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlClaimTaskReward/ReqClaimTaskReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "taskId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlClaimTaskReward/ResClaimTaskReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "reward",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskReward"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlCollectCoin/ReqCollectCoin": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseRequest"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "amount",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlCollectCoin/ResCollectCoin": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseResponse"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "currentGold",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlConsumeGold/ReqConsumeGold": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseRequest"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "amount",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlConsumeGold/ResConsumeGold": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseResponse"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "currentGold",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlCreateGuild/ReqCreateGuild": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "tag",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "description",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlCreateGuild/ResCreateGuild": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "guildId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlCreatePaymentOrder/ReqCreatePaymentOrder": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "productId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "channel",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/PaymentSystem/PaymentChannel"
                    }
                }
            ]
        },
        "PtlCreatePaymentOrder/ResCreatePaymentOrder": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "order",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/PaymentSystem/PaymentOrder"
                    },
                    "optional": true
                }
            ]
        },
        "PtlDrawLottery/ReqDrawLottery": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseRequest"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlDrawLottery/ResDrawLottery": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseResponse"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "item",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "itemId",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 1,
                                "name": "itemName",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 2,
                                "name": "itemType",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 3,
                                "name": "rarity",
                                "type": {
                                    "type": "String"
                                }
                            },
                            {
                                "id": 4,
                                "name": "quantity",
                                "type": {
                                    "type": "Number"
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "isGuaranteed",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 3,
                    "name": "remainingTickets",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "pullStats",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "pullsSinceEpic",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 1,
                                "name": "pullsSinceLegendary",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "totalPulls",
                                "type": {
                                    "type": "Number"
                                }
                            }
                        ]
                    },
                    "optional": true
                }
            ]
        },
        "PtlExchangeCdk/ReqExchangeCdk": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "code",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlExchangeCdk/ResExchangeCdk": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "rewards",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/CdkSystem/CdkReward"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlExpandInventory/ReqExpandInventory": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlExpandInventory/ResExpandInventory": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "newMaxSlots",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "cost",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "PtlGameArea/ReqGameArea": {
            "type": "Interface"
        },
        "PtlGameArea/ResGameArea": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "area",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "name",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "server",
                                    "type": {
                                        "type": "String"
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        },
        "PtlGetBuffs/ReqGetBuffs": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlGetBuffs/ResGetBuffs": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "activeBuffs",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/BuffSystem/BuffData"
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "effects",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/BuffSystem/BuffEffect"
                        }
                    }
                },
                {
                    "id": 2,
                    "name": "timers",
                    "type": {
                        "type": "Interface",
                        "indexSignature": {
                            "keyType": "String",
                            "type": {
                                "type": "Number"
                            }
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/BuffSystem/BuffData": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "buffId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "buffType",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/BuffSystem/BuffType"
                    }
                },
                {
                    "id": 3,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/BuffSystem/BuffStatus"
                    }
                },
                {
                    "id": 4,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "expiresAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "duration",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "params",
                    "type": {
                        "type": "Any"
                    }
                }
            ]
        },
        "../../../server/gate/bll/BuffSystem/BuffType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "reward_multiplier"
                },
                {
                    "id": 1,
                    "value": "magnet"
                },
                {
                    "id": 2,
                    "value": "lucky_charm"
                },
                {
                    "id": 3,
                    "value": "hammer_push"
                },
                {
                    "id": 4,
                    "value": "super_push"
                }
            ]
        },
        "../../../server/gate/bll/BuffSystem/BuffStatus": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "active"
                },
                {
                    "id": 1,
                    "value": "expired"
                }
            ]
        },
        "../../../server/gate/bll/BuffSystem/BuffEffect": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "buffType",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/BuffSystem/BuffType"
                    }
                },
                {
                    "id": 1,
                    "name": "multiplier",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "radius",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "force",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "bonus",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "amount",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "PtlGetFriendList/ReqGetFriendList": {
            "type": "Interface"
        },
        "PtlGetFriendList/ResGetFriendList": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "friends",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Intersection",
                            "members": [
                                {
                                    "id": 0,
                                    "type": {
                                        "type": "Reference",
                                        "target": "../../../server/gate/bll/SocialSystem/Friend"
                                    }
                                },
                                {
                                    "id": 1,
                                    "type": {
                                        "type": "Interface",
                                        "properties": [
                                            {
                                                "id": 0,
                                                "name": "online",
                                                "type": {
                                                    "type": "Boolean"
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "receivedRequests",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/SocialSystem/FriendRequest"
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/SocialSystem/Friend": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "username",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/SocialSystem/FriendStatus"
                    }
                },
                {
                    "id": 3,
                    "name": "addedAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "lastInteraction",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/SocialSystem/FriendStatus": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "pending"
                },
                {
                    "id": 1,
                    "value": "accepted"
                },
                {
                    "id": 2,
                    "value": "rejected"
                },
                {
                    "id": 3,
                    "value": "blocked"
                }
            ]
        },
        "../../../server/gate/bll/SocialSystem/FriendRequest": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "requestId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "fromUserId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "fromUsername",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "toUserId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/SocialSystem/FriendStatus"
                    }
                },
                {
                    "id": 6,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlGetGuildInfo/ReqGetGuildInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "guildId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlGetGuildInfo/ResGetGuildInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "guild",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Reference",
                                    "target": "../../../server/gate/bll/GuildSystem/GuildData"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": null
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 1,
                    "name": "benefits",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/GuildSystem/GuildBenefits"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/GuildSystem/GuildData": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "guildId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "tag",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "description",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "level",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "exp",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "expToNext",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "members",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/GuildSystem/GuildMember"
                        }
                    }
                },
                {
                    "id": 8,
                    "name": "maxMembers",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 9,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 10,
                    "name": "createdBy",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 11,
                    "name": "funds",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 12,
                    "name": "settings",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/GuildSystem/GuildSettings"
                    }
                }
            ]
        },
        "../../../server/gate/bll/GuildSystem/GuildMember": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "username",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "role",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/GuildSystem/GuildRole"
                    }
                },
                {
                    "id": 3,
                    "name": "joinedAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "contribution",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "lastActive",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/GuildSystem/GuildRole": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "leader"
                },
                {
                    "id": 1,
                    "value": "officer"
                },
                {
                    "id": 2,
                    "value": "member"
                }
            ]
        },
        "../../../server/gate/bll/GuildSystem/GuildSettings": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "autoAccept",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "minLevel",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "announcement",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "../../../server/gate/bll/GuildSystem/GuildBenefits": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "expBonus",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "goldBonus",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "shopDiscount",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlGetInventory/ReqGetInventory": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseRequest"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlGetInventory/ResGetInventory": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseResponse"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "inventory",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "itemId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "itemName",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "itemType",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 3,
                                    "name": "rarity",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 4,
                                    "name": "quantity",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 5,
                                    "name": "obtainedAt",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "tickets",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "totalItems",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlGetInviteInfo/ReqGetInviteInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlGetInviteInfo/ResGetInviteInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "inviteInfo",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/InviteSystem/InviteStats"
                    }
                },
                {
                    "id": 1,
                    "name": "inviteList",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "inviteeId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "invitedAt",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 2,
                                    "name": "rewardGiven",
                                    "type": {
                                        "type": "Boolean"
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/InviteSystem/InviteStats": {
            "type": "Interface",
            "properties": [
                {
                    "id": 6,
                    "name": "_id",
                    "type": {
                        "type": "Reference",
                        "target": "?mongodb/ObjectId"
                    },
                    "optional": true
                },
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "totalInvites",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "validInvites",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "totalRewards",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "inviteCode",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 5,
                    "name": "inviteLink",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlGetJackpotProgress/ReqGetJackpotProgress": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseRequest"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlGetJackpotProgress/ResGetJackpotProgress": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseResponse"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "jackpotProgress",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "threshold",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "totalDrops",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "progressPerDrop",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "estimatedDropsToJackpot",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlGetLeaderboard/ReqGetLeaderboard": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/LeaderboardSystemV2/LeaderboardType"
                    }
                },
                {
                    "id": 1,
                    "name": "category",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/LeaderboardSystemV2/LeaderboardCategory"
                    }
                },
                {
                    "id": 2,
                    "name": "limit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/LeaderboardSystemV2/LeaderboardType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "daily"
                },
                {
                    "id": 1,
                    "value": "weekly"
                },
                {
                    "id": 2,
                    "value": "monthly"
                },
                {
                    "id": 3,
                    "value": "all_time"
                }
            ]
        },
        "../../../server/gate/bll/LeaderboardSystemV2/LeaderboardCategory": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "total_reward"
                },
                {
                    "id": 1,
                    "value": "total_drops"
                },
                {
                    "id": 2,
                    "value": "big_prizes"
                },
                {
                    "id": 3,
                    "value": "jackpots"
                }
            ]
        },
        "PtlGetLeaderboard/ResGetLeaderboard": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "leaderboard",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/LeaderboardSystemV2/LeaderboardEntry"
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "userRank",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "rank",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 1,
                                "name": "score",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "total",
                                "type": {
                                    "type": "Number"
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "stats",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "totalPlayers",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 1,
                                "name": "totalScore",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "avgScore",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 3,
                                "name": "topScore",
                                "type": {
                                    "type": "Number"
                                }
                            }
                        ]
                    }
                }
            ]
        },
        "../../../server/gate/bll/LeaderboardSystemV2/LeaderboardEntry": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "rank",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "username",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "score",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "lastUpdated",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "PtlGetLevelInfo/ReqGetLevelInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlGetLevelInfo/ResGetLevelInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "levelData",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/LevelSystem/LevelData"
                    }
                }
            ]
        },
        "../../../server/gate/bll/LevelSystem/LevelData": {
            "type": "Interface",
            "properties": [
                {
                    "id": 7,
                    "name": "_id",
                    "type": {
                        "type": "Reference",
                        "target": "?mongodb/ObjectId"
                    },
                    "optional": true
                },
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "level",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "exp",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "expToNext",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "totalExp",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "lastLevelUpTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "levelUpCount",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlGetMailList/ReqGetMailList": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/MailSystem/MailStatus"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "pageSize",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/MailSystem/MailStatus": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "unread"
                },
                {
                    "id": 1,
                    "value": "read"
                },
                {
                    "id": 2,
                    "value": "claimed"
                },
                {
                    "id": 3,
                    "value": "expired"
                }
            ]
        },
        "PtlGetMailList/ResGetMailList": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "mails",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/MailSystem/Mail"
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "unreadCount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "page",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "pageSize",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "hasMore",
                    "type": {
                        "type": "Boolean"
                    }
                }
            ]
        },
        "../../../server/gate/bll/MailSystem/Mail": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "mailId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/MailSystem/MailType"
                    }
                },
                {
                    "id": 3,
                    "name": "title",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 5,
                    "name": "sender",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 6,
                    "name": "rewards",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/MailSystem/MailReward"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/MailSystem/MailStatus"
                    }
                },
                {
                    "id": 8,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 9,
                    "name": "expiresAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 10,
                    "name": "readAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 11,
                    "name": "claimedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 12,
                    "name": "metadata",
                    "type": {
                        "type": "Any"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/MailSystem/MailType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "system"
                },
                {
                    "id": 1,
                    "value": "reward"
                },
                {
                    "id": 2,
                    "value": "activity"
                },
                {
                    "id": 3,
                    "value": "admin"
                }
            ]
        },
        "PtlGetSeasonInfo/ReqGetSeasonInfo": {
            "type": "Interface"
        },
        "PtlGetSeasonInfo/ResGetSeasonInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "currentSeason",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/SeasonSystem/SeasonConfig"
                    }
                },
                {
                    "id": 1,
                    "name": "userData",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/SeasonSystem/UserSeasonData"
                    }
                },
                {
                    "id": 2,
                    "name": "stats",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "level",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 1,
                                "name": "exp",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "expToNext",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 3,
                                "name": "progress",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 4,
                                "name": "hasPremiumPass",
                                "type": {
                                    "type": "Boolean"
                                }
                            },
                            {
                                "id": 5,
                                "name": "multiplier",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 6,
                                "name": "totalClaimedRewards",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 7,
                                "name": "daysRemaining",
                                "type": {
                                    "type": "Number"
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 3,
                    "name": "claimableRewards",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "free",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Number"
                                    }
                                }
                            },
                            {
                                "id": 1,
                                "name": "premium",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "Number"
                                    }
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 4,
                    "name": "allRewards",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/SeasonSystem/LevelReward"
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/SeasonSystem/SeasonConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "seasonId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "seasonNumber",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "theme",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/SeasonSystem/SeasonStatus"
                    }
                },
                {
                    "id": 7,
                    "name": "maxLevel",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/SeasonSystem/SeasonStatus": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "active"
                },
                {
                    "id": 1,
                    "value": "ended"
                },
                {
                    "id": 2,
                    "value": "upcoming"
                }
            ]
        },
        "../../../server/gate/bll/SeasonSystem/UserSeasonData": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "seasonId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "level",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "exp",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "expToNext",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "hasPremiumPass",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 6,
                    "name": "claimedFreeRewards",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Number"
                        }
                    }
                },
                {
                    "id": 7,
                    "name": "claimedPremiumRewards",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Number"
                        }
                    }
                },
                {
                    "id": 8,
                    "name": "multiplier",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/SeasonSystem/LevelReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "level",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "freeReward",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskReward"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "premiumReward",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskReward"
                    },
                    "optional": true
                }
            ]
        },
        "PtlGetShareStats/ReqGetShareStats": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlGetShareStats/ResGetShareStats": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "stats",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Reference",
                                    "target": "../../../server/gate/bll/ShareSystem/ShareStats"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": null
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 1,
                    "name": "history",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/ShareSystem/ShareRecord"
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/ShareSystem/ShareStats": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "totalShares",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "totalClicks",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "totalConverts",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "totalRewards",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "sharesByChannel",
                    "type": {
                        "type": "Interface",
                        "indexSignature": {
                            "keyType": "String",
                            "type": {
                                "type": "Number"
                            }
                        }
                    }
                },
                {
                    "id": 6,
                    "name": "sharesByType",
                    "type": {
                        "type": "Interface",
                        "indexSignature": {
                            "keyType": "String",
                            "type": {
                                "type": "Number"
                            }
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/ShareSystem/ShareRecord": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "shareId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShareSystem/ShareType"
                    }
                },
                {
                    "id": 3,
                    "name": "channel",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShareSystem/ShareChannel"
                    }
                },
                {
                    "id": 4,
                    "name": "content",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShareSystem/ShareContent"
                    }
                },
                {
                    "id": 5,
                    "name": "sharedAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "clicks",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "converts",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 8,
                    "name": "rewardGiven",
                    "type": {
                        "type": "Boolean"
                    }
                }
            ]
        },
        "../../../server/gate/bll/ShareSystem/ShareType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "invite"
                },
                {
                    "id": 1,
                    "value": "achievement"
                },
                {
                    "id": 2,
                    "value": "big_prize"
                },
                {
                    "id": 3,
                    "value": "jackpot"
                },
                {
                    "id": 4,
                    "value": "rank"
                },
                {
                    "id": 5,
                    "value": "season"
                }
            ]
        },
        "../../../server/gate/bll/ShareSystem/ShareChannel": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "discord"
                },
                {
                    "id": 1,
                    "value": "twitter"
                },
                {
                    "id": 2,
                    "value": "facebook"
                },
                {
                    "id": 3,
                    "value": "link"
                },
                {
                    "id": 4,
                    "value": "wechat"
                },
                {
                    "id": 5,
                    "value": "qq"
                }
            ]
        },
        "../../../server/gate/bll/ShareSystem/ShareContent": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "title",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "description",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "imageUrl",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "link",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "metadata",
                    "type": {
                        "type": "Any"
                    },
                    "optional": true
                }
            ]
        },
        "PtlGetShopProducts/ReqGetShopProducts": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "category",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "tags",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                }
            ]
        },
        "PtlGetShopProducts/ResGetShopProducts": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "products",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/ShopSystem/ProductConfig"
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "hotProducts",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/ShopSystem/ProductConfig"
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/ShopSystem/ProductConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "productId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShopSystem/ProductType"
                    }
                },
                {
                    "id": 2,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "description",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 4,
                    "name": "icon",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShopSystem/ProductStatus"
                    }
                },
                {
                    "id": 6,
                    "name": "price",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "currency",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShopSystem/CurrencyType"
                    }
                },
                {
                    "id": 8,
                    "name": "originalPrice",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "discount",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 10,
                    "name": "content",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShopSystem/ProductContent"
                    }
                },
                {
                    "id": 11,
                    "name": "dailyLimit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 12,
                    "name": "totalLimit",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 13,
                    "name": "levelRequirement",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 14,
                    "name": "vipRequirement",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 15,
                    "name": "startTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 16,
                    "name": "endTime",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 17,
                    "name": "tags",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    }
                },
                {
                    "id": 18,
                    "name": "category",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 19,
                    "name": "sortOrder",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/ShopSystem/ProductType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "item"
                },
                {
                    "id": 1,
                    "value": "battle_pass"
                },
                {
                    "id": 2,
                    "value": "gold_pack"
                },
                {
                    "id": 3,
                    "value": "ticket_pack"
                },
                {
                    "id": 4,
                    "value": "vip"
                },
                {
                    "id": 5,
                    "value": "skin"
                }
            ]
        },
        "../../../server/gate/bll/ShopSystem/ProductStatus": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "available"
                },
                {
                    "id": 1,
                    "value": "sold_out"
                },
                {
                    "id": 2,
                    "value": "coming_soon"
                },
                {
                    "id": 3,
                    "value": "disabled"
                }
            ]
        },
        "../../../server/gate/bll/ShopSystem/CurrencyType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "gold"
                },
                {
                    "id": 1,
                    "value": "rmb"
                },
                {
                    "id": 2,
                    "value": "usd"
                }
            ]
        },
        "../../../server/gate/bll/ShopSystem/ProductContent": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "items",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "itemId",
                                    "type": {
                                        "type": "String"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "quantity",
                                    "type": {
                                        "type": "Number"
                                    }
                                }
                            ]
                        }
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "goldAmount",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "bonusGold",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "ticketAmount",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "bonusTickets",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "vipLevel",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "vipDays",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "vipDuration",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "seasonId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 8,
                    "name": "skinId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 10,
                    "name": "skins",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                }
            ]
        },
        "PtlGetSignInInfo/ReqGetSignInInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlGetSignInInfo/ResGetSignInInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "record",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Reference",
                                    "target": "../../../server/gate/bll/SignInSystem/SignInRecord"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": null
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 1,
                    "name": "todaySigned",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 2,
                    "name": "canSignIn",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 3,
                    "name": "nextReward",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/SignInSystem/SignInConfig"
                    }
                },
                {
                    "id": 4,
                    "name": "monthlyCalendar",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Interface",
                            "properties": [
                                {
                                    "id": 0,
                                    "name": "date",
                                    "type": {
                                        "type": "Number"
                                    }
                                },
                                {
                                    "id": 1,
                                    "name": "signed",
                                    "type": {
                                        "type": "Boolean"
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/SignInSystem/SignInRecord": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "signInDate",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "consecutiveDays",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "totalDays",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "lastSignInTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "monthlySignIns",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "rewards",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/SignInSystem/SignInReward"
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/SignInSystem/SignInReward": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "day",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "gold",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "tickets",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "items",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "skinId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "claimed",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 6,
                    "name": "claimedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/SignInSystem/SignInConfig": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "day",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "gold",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "tickets",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "items",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "skinId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "multiplier",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "special",
                    "type": {
                        "type": "Boolean"
                    }
                }
            ]
        },
        "PtlGetUserAchievements/ReqGetUserAchievements": {
            "type": "Interface"
        },
        "PtlGetUserAchievements/ResGetUserAchievements": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "achievements",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/AchievementSystem/UserAchievement"
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "stats",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "totalCompleted",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 1,
                                "name": "totalCount",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "completionRate",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 3,
                                "name": "unlockedTitles",
                                "type": {
                                    "type": "Array",
                                    "elementType": {
                                        "type": "String"
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        },
        "../../../server/gate/bll/AchievementSystem/UserAchievement": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "achievementId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "category",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/AchievementSystem/AchievementCategory"
                    }
                },
                {
                    "id": 2,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/AchievementSystem/AchievementStatus"
                    }
                },
                {
                    "id": 3,
                    "name": "currentProgress",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "goalValue",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "unlockedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "claimedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/AchievementSystem/AchievementCategory": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "beginner"
                },
                {
                    "id": 1,
                    "value": "drop"
                },
                {
                    "id": 2,
                    "value": "prize"
                },
                {
                    "id": 3,
                    "value": "lottery"
                },
                {
                    "id": 4,
                    "value": "wealth"
                },
                {
                    "id": 5,
                    "value": "social"
                },
                {
                    "id": 6,
                    "value": "master"
                }
            ]
        },
        "../../../server/gate/bll/AchievementSystem/AchievementStatus": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "locked"
                },
                {
                    "id": 1,
                    "value": "in_progress"
                },
                {
                    "id": 2,
                    "value": "unlocked"
                },
                {
                    "id": 3,
                    "value": "claimed"
                }
            ]
        },
        "PtlGetUserRank/ReqGetUserRank": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/LeaderboardSystemV2/LeaderboardType"
                    }
                },
                {
                    "id": 1,
                    "name": "category",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/LeaderboardSystemV2/LeaderboardCategory"
                    }
                }
            ]
        },
        "PtlGetUserRank/ResGetUserRank": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "rank",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": null
                                }
                            }
                        ]
                    }
                },
                {
                    "id": 1,
                    "name": "score",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "total",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "surroundings",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/LeaderboardSystemV2/LeaderboardEntry"
                        }
                    }
                }
            ]
        },
        "PtlGetUserTasks/ReqGetUserTasks": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "taskType",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskType"
                    }
                }
            ]
        },
        "../../../server/gate/bll/TaskSystem/TaskType": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "daily"
                },
                {
                    "id": 1,
                    "value": "weekly"
                },
                {
                    "id": 2,
                    "value": "checkin"
                }
            ]
        },
        "PtlGetUserTasks/ResGetUserTasks": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "tasks",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/TaskSystem/UserTask"
                        }
                    }
                },
                {
                    "id": 1,
                    "name": "stats",
                    "type": {
                        "type": "Interface",
                        "properties": [
                            {
                                "id": 0,
                                "name": "dailyCompleted",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 1,
                                "name": "dailyTotal",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 2,
                                "name": "weeklyCompleted",
                                "type": {
                                    "type": "Number"
                                }
                            },
                            {
                                "id": 3,
                                "name": "weeklyTotal",
                                "type": {
                                    "type": "Number"
                                }
                            }
                        ]
                    }
                }
            ]
        },
        "../../../server/gate/bll/TaskSystem/UserTask": {
            "type": "Interface",
            "properties": [
                {
                    "id": 8,
                    "name": "_id",
                    "type": {
                        "type": "Reference",
                        "target": "?mongodb/ObjectId"
                    },
                    "optional": true
                },
                {
                    "id": 0,
                    "name": "taskId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "taskType",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskType"
                    }
                },
                {
                    "id": 2,
                    "name": "status",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskStatus"
                    }
                },
                {
                    "id": 3,
                    "name": "currentProgress",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "goalValue",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "reward",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/TaskSystem/TaskReward"
                    }
                },
                {
                    "id": 6,
                    "name": "completedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 7,
                    "name": "claimedAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 9,
                    "name": "createdAt",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/TaskSystem/TaskStatus": {
            "type": "Enum",
            "members": [
                {
                    "id": 0,
                    "value": "locked"
                },
                {
                    "id": 1,
                    "value": "active"
                },
                {
                    "id": 2,
                    "value": "completed"
                },
                {
                    "id": 3,
                    "value": "claimed"
                }
            ]
        },
        "PtlGetVIPInfo/ReqGetVIPInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlGetVIPInfo/ResGetVIPInfo": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "vipData",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/VIPSystem/VIPData"
                    }
                }
            ]
        },
        "../../../server/gate/bll/VIPSystem/VIPData": {
            "type": "Interface",
            "properties": [
                {
                    "id": 7,
                    "name": "_id",
                    "type": {
                        "type": "Reference",
                        "target": "?mongodb/ObjectId"
                    },
                    "optional": true
                },
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "vipLevel",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/VIPSystem/VIPLevel"
                    }
                },
                {
                    "id": 2,
                    "name": "vipExpireAt",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "totalRecharge",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "lastRechargeTime",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "privileges",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/VIPSystem/VIPPrivileges"
                    }
                },
                {
                    "id": 6,
                    "name": "purchaseHistory",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "Reference",
                            "target": "../../../server/gate/bll/VIPSystem/VIPPurchase"
                        }
                    }
                }
            ]
        },
        "../../../server/gate/bll/VIPSystem/VIPLevel": {
            "type": "Union",
            "members": [
                {
                    "id": 0,
                    "type": {
                        "type": "Literal",
                        "literal": 0
                    }
                },
                {
                    "id": 1,
                    "type": {
                        "type": "Literal",
                        "literal": 1
                    }
                },
                {
                    "id": 2,
                    "type": {
                        "type": "Literal",
                        "literal": 2
                    }
                },
                {
                    "id": 3,
                    "type": {
                        "type": "Literal",
                        "literal": 3
                    }
                },
                {
                    "id": 4,
                    "type": {
                        "type": "Literal",
                        "literal": 4
                    }
                },
                {
                    "id": 5,
                    "type": {
                        "type": "Literal",
                        "literal": 5
                    }
                },
                {
                    "id": 6,
                    "type": {
                        "type": "Literal",
                        "literal": 6
                    }
                },
                {
                    "id": 7,
                    "type": {
                        "type": "Literal",
                        "literal": 7
                    }
                },
                {
                    "id": 8,
                    "type": {
                        "type": "Literal",
                        "literal": 8
                    }
                },
                {
                    "id": 9,
                    "type": {
                        "type": "Literal",
                        "literal": 9
                    }
                },
                {
                    "id": 10,
                    "type": {
                        "type": "Literal",
                        "literal": 10
                    }
                }
            ]
        },
        "../../../server/gate/bll/VIPSystem/VIPPrivileges": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "dailyGoldBonus",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "dailyTicketBonus",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 2,
                    "name": "expMultiplier",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "goldMultiplier",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "dropRateBonus",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 5,
                    "name": "shopDiscount",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 6,
                    "name": "signInBonus",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "exclusiveSkins",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    }
                },
                {
                    "id": 8,
                    "name": "exclusiveItems",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    }
                },
                {
                    "id": 9,
                    "name": "dailyFreeDraws",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "../../../server/gate/bll/VIPSystem/VIPPurchase": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "orderId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "vipLevel",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/VIPSystem/VIPLevel"
                    }
                },
                {
                    "id": 2,
                    "name": "duration",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 3,
                    "name": "price",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 4,
                    "name": "purchasedAt",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlGuildDonate/ReqGuildDonate": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "amount",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlGuildDonate/ResGuildDonate": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "contribution",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "guildExp",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "PtlHandleFriendRequest/ReqHandleFriendRequest": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "requestId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "accept",
                    "type": {
                        "type": "Boolean"
                    }
                }
            ]
        },
        "PtlHandleFriendRequest/ResHandleFriendRequest": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlLogin/ReqLogin": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseRequest"
                    }
                }
            ],
            "properties": [
                {
                    "id": 0,
                    "name": "username",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlLogin/ResLogin": {
            "type": "Interface",
            "extends": [
                {
                    "id": 0,
                    "type": {
                        "type": "Reference",
                        "target": "../base/BaseResponse"
                    }
                }
            ],
            "properties": [
                {
                    "id": 4,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 5,
                    "name": "token",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 6,
                    "name": "gold",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 7,
                    "name": "offlineReward",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 8,
                    "name": "matchUrl",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlPurchaseBattlePass/ReqPurchaseBattlePass": {
            "type": "Interface"
        },
        "PtlPurchaseBattlePass/ResPurchaseBattlePass": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlPurchaseProduct/ReqPurchaseProduct": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "productId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "quantity",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "PtlPurchaseProduct/ResPurchaseProduct": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "recordId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlPurchaseVIP/ReqPurchaseVIP": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "vipLevel",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/VIPSystem/VIPLevel"
                    }
                },
                {
                    "id": 2,
                    "name": "duration",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlPurchaseVIP/ResPurchaseVIP": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "orderId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlRegister/ReqRegister": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "username",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlRegister/ResRegister": {
            "type": "Interface",
            "properties": [
                {
                    "id": 1,
                    "name": "key",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlSendFriendGift/ReqSendFriendGift": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "friendId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlSendFriendGift/ResSendFriendGift": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlSendFriendRequest/ReqSendFriendRequest": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "toUserId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlSendFriendRequest/ResSendFriendRequest": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "requestId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "PtlShare/ReqShare": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "type",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShareSystem/ShareType"
                    }
                },
                {
                    "id": 2,
                    "name": "channel",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShareSystem/ShareChannel"
                    }
                },
                {
                    "id": 3,
                    "name": "metadata",
                    "type": {
                        "type": "Any"
                    },
                    "optional": true
                }
            ]
        },
        "PtlShare/ResShare": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "shareId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "content",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ShareSystem/ShareContent"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "reward",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "PtlSignIn/ReqSignIn": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlSignIn/ResSignIn": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "reward",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/SignInSystem/SignInReward"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "consecutiveDays",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "totalDays",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "PtlUseItem/ReqUseItem": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "userId",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "itemId",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlUseItem/ResUseItem": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "success",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "error",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "effect",
                    "type": {
                        "type": "Reference",
                        "target": "../../../server/gate/bll/ItemSystem/ItemEffect"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "buffId",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        },
        "../../../server/gate/bll/ItemSystem/ItemEffect": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "hammerPushForce",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 1,
                    "name": "rewardMultiplier",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 2,
                    "name": "magnetRadius",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "magnetForce",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "luckyBonus",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "pushAmount",
                    "type": {
                        "type": "Number"
                    },
                    "optional": true
                }
            ]
        },
        "PtlValidateIntegrity/ReqValidateIntegrity": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "clientVersion",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 1,
                    "name": "fileHashes",
                    "type": {
                        "type": "Interface",
                        "indexSignature": {
                            "keyType": "String",
                            "type": {
                                "type": "String"
                            }
                        }
                    }
                }
            ]
        },
        "PtlValidateIntegrity/ResValidateIntegrity": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "valid",
                    "type": {
                        "type": "Boolean"
                    }
                },
                {
                    "id": 1,
                    "name": "serverVersion",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "errors",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 3,
                    "name": "missingFiles",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 4,
                    "name": "modifiedFiles",
                    "type": {
                        "type": "Array",
                        "elementType": {
                            "type": "String"
                        }
                    },
                    "optional": true
                },
                {
                    "id": 5,
                    "name": "action",
                    "type": {
                        "type": "Union",
                        "members": [
                            {
                                "id": 0,
                                "type": {
                                    "type": "Literal",
                                    "literal": "allow"
                                }
                            },
                            {
                                "id": 1,
                                "type": {
                                    "type": "Literal",
                                    "literal": "warn"
                                }
                            },
                            {
                                "id": 2,
                                "type": {
                                    "type": "Literal",
                                    "literal": "block"
                                }
                            }
                        ]
                    },
                    "optional": true
                },
                {
                    "id": 6,
                    "name": "message",
                    "type": {
                        "type": "String"
                    },
                    "optional": true
                }
            ]
        }
    }
};