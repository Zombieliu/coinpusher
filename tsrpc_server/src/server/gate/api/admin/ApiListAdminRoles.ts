import { ApiCall } from "tsrpc";
import { ReqListAdminRoles, ResListAdminRoles } from "../../../../tsrpc/protocols/gate/admin/PtlListAdminRoles";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminRole, RolePermissions } from "../../bll/AdminUserSystem";

export async function ApiListAdminRoles(call: ApiCall<ReqListAdminRoles, ResListAdminRoles>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageAdmins);
    if (!auth.authorized) return;

    const roles = Object.values(AdminRole).map(role => ({
        role,
        permissions: RolePermissions[role] || [],
        description: role
    }));

    call.succ({ roles });
}
