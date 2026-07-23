/**
 * Multi-tenant query helpers — cabinet / client isolation for shared SaaS instance.
 */

import { UserContext } from './permissions';
import { UserRole } from '@/models/Cabinet';
import User from '@/models/User';
import Client from '@/models/Client';

export interface FilterParams {
  cabinetId?: string | null;
  clientId?: string | null;
  regulationType?: string | null;
}

function isValidFilter(value?: string | null): value is string {
  return !!value && value !== 'all' && value !== 'null';
}

/**
 * Build a data query based on role + optional view filters.
 * Isolation is by cabinetId / clientId on documents (not separate DB instances).
 */
export async function buildDataQuery(
  userContext: UserContext,
  filterParams?: FilterParams
): Promise<{ userIds: string[]; query: Record<string, any> }> {
  const query: Record<string, any> = {};
  let userIds: string[] = [userContext.userId];

  try {
    if (userContext.role === UserRole.PLATFORM_ADMIN) {
      if (isValidFilter(filterParams?.clientId)) {
        query.clientId = String(filterParams!.clientId);
      } else if (isValidFilter(filterParams?.cabinetId)) {
        query.cabinetId = String(filterParams!.cabinetId);
      } else if (userContext.cabinetId) {
        query.cabinetId = String(userContext.cabinetId);
      } else {
        // Thin platform admin: no broad data dump without explicit filter
        query.userId = String(userContext.userId);
      }
    } else if (userContext.role === UserRole.CABINET_ADMIN || userContext.role === UserRole.CABINET_LAWYER) {
      const cabinetId = userContext.cabinetId;
      if (!cabinetId) {
        query.userId = String(userContext.userId);
      } else if (isValidFilter(filterParams?.clientId)) {
        // Ensure client belongs to this cabinet
        const client = await Client.findOne({
          clientId: filterParams!.clientId,
          cabinetId: String(cabinetId),
        });
        if (client) {
          query.clientId = String(filterParams!.clientId);
          query.cabinetId = String(cabinetId);
        } else {
          // Deny cross-cabinet access
          query.clientId = '__denied__';
          query.cabinetId = String(cabinetId);
        }
      } else {
        query.cabinetId = String(cabinetId);
      }
    } else {
      // CLIENT_USER — own client only
      if (userContext.clientId) {
        query.clientId = String(userContext.clientId);
      }
      if (userContext.cabinetId) {
        query.cabinetId = String(userContext.cabinetId);
      }
      query.userId = String(userContext.userId);
    }

    // Optional regulation filter (orthogonal to tenancy)
    if (isValidFilter(filterParams?.regulationType)) {
      query.regulationType = filterParams!.regulationType;
    }

    // Resolve related user ids for cabinet-wide views (optional consumers)
    if (query.clientId && query.clientId !== '__denied__') {
      const users = await User.find({ clientId: query.clientId });
      userIds = users.map((u: any) => String(u._id));
      if (userIds.length === 0) userIds = [userContext.userId];
    } else if (query.cabinetId && !query.clientId) {
      const users = await User.find({ cabinetId: query.cabinetId });
      userIds = users.map((u: any) => String(u._id));
      if (userIds.length === 0) userIds = [userContext.userId];
    }
  } catch (error) {
    console.error('Error in buildDataQuery:', error);
    return {
      userIds: [userContext.userId],
      query: {
        userId: userContext.userId,
        ...(userContext.clientId && { clientId: userContext.clientId }),
        ...(userContext.cabinetId && { cabinetId: userContext.cabinetId }),
      },
    };
  }

  return { userIds, query };
}

export function extractFilterParams(request: {
  nextUrl: { searchParams: URLSearchParams };
}): FilterParams {
  const { searchParams } = request.nextUrl;
  return {
    cabinetId: searchParams.get('cabinetId'),
    clientId: searchParams.get('clientId'),
    regulationType: searchParams.get('regulation') || searchParams.get('regulationType'),
  };
}

/**
 * Resolve cabinetId/clientId to stamp on create/update.
 */
export function resolveTenantStamp(
  userContext: UserContext,
  body: { cabinetId?: string; clientId?: string } = {},
  filterParams?: FilterParams
): { cabinetId?: string; clientId?: string } {
  if (userContext.role === UserRole.PLATFORM_ADMIN) {
    return {
      cabinetId: body.cabinetId || filterParams?.cabinetId || userContext.cabinetId || undefined,
      clientId: body.clientId || filterParams?.clientId || userContext.clientId || undefined,
    };
  }

  if (userContext.role === UserRole.CABINET_ADMIN || userContext.role === UserRole.CABINET_LAWYER) {
    return {
      cabinetId: userContext.cabinetId,
      clientId: body.clientId || filterParams?.clientId || userContext.clientId || undefined,
    };
  }

  return {
    cabinetId: userContext.cabinetId,
    clientId: userContext.clientId,
  };
}

export async function safeBuildDataQuery(
  userContext: UserContext,
  filterParams?: FilterParams
): Promise<{ userIds: string[]; query: Record<string, any> }> {
  try {
    return await buildDataQuery(userContext, filterParams);
  } catch (error) {
    console.error('Error in safeBuildDataQuery:', error);
    return {
      userIds: [userContext.userId],
      query: {
        userId: userContext.userId,
        ...(userContext.clientId && { clientId: userContext.clientId }),
        ...(userContext.cabinetId && { cabinetId: userContext.cabinetId }),
      },
    };
  }
}
