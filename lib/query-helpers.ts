/**
 * Helper functions for building multi-tenant queries
 */

import { UserContext } from './permissions';
import { UserRole } from '@/models/Organization';
import User from '@/models/User';

export interface FilterParams {
  organizationId?: string | null;
  affiliateId?: string | null;
  legalFramework?: string | null;
}

/**
 * Build a query filter based on user context and optional filter parameters
 * For SuperAdmin: can filter by organizationId/affiliateId from params
 * For other users: always filter by their assigned organizationId/affiliateId
 */
export async function buildDataQuery(
  userContext: UserContext,
  filterParams?: FilterParams
): Promise<{ userIds: string[]; query: any }> {
  const query: any = {};
  let userIds: string[] = [];

  try {
    // Determine which users' data to fetch
    if (userContext.role === UserRole.SUPER_ADMIN) {
      // SuperAdmin can filter by organization/affiliate from params
      if (filterParams?.affiliateId && filterParams.affiliateId !== 'all' && filterParams.affiliateId !== 'null') {
        try {
          // CRITICAL: When filtering by affiliateId, only get users from that specific affiliate
          const users = await User.find({ affiliateId: filterParams.affiliateId });
          userIds = users.map(u => String(u._id));
          console.log(`🔍 Found ${userIds.length} users for affiliateId: ${filterParams.affiliateId}`);
        } catch (error) {
          console.warn('Error finding users by affiliateId:', error);
          userIds = [userContext.userId]; // Fallback to current user
        }
      } else if (filterParams?.organizationId && filterParams.organizationId !== 'all' && filterParams.organizationId !== 'null') {
        try {
          const users = await User.find({ organizationId: filterParams.organizationId });
          userIds = users.map(u => String(u._id));
        } catch (error) {
          console.warn('Error finding users by organizationId:', error);
          userIds = [userContext.userId]; // Fallback to current user
        }
      } else if (userContext.organizationId) {
        try {
          const users = await User.find({ organizationId: userContext.organizationId });
          userIds = users.map(u => String(u._id));
        } catch (error) {
          console.warn('Error finding users by userContext.organizationId:', error);
          userIds = [userContext.userId]; // Fallback to current user
        }
      } else {
        // If no filter, use current user only
        userIds = [userContext.userId];
      }
    } else {
      // Non-SuperAdmin: only their own data
      userIds = [userContext.userId];
    }
  } catch (error) {
    console.error('Error in buildDataQuery user lookup:', error);
    // Fallback to current user only
    userIds = [userContext.userId];
  }

  // Build query - ALWAYS filter by organizationId/affiliateId for proper data isolation
  // This ensures complete data separation between organizations/affiliates
  if (userContext.role === UserRole.SUPER_ADMIN) {
    // SuperAdmin: filter by selected organization/affiliate if provided
    if (filterParams?.affiliateId && filterParams.affiliateId !== 'all' && filterParams.affiliateId !== 'null') {
      // CRITICAL: When filtering by affiliateId, this is the PRIMARY and ONLY filter needed
      // The affiliateId filter alone ensures complete data isolation per affiliate
      // We should NOT add userId filter here because it could include users from other affiliates
      // if the user lookup was done incorrectly
      query.affiliateId = String(filterParams.affiliateId);
      console.log(`🔒 Filtering by affiliateId ONLY: ${query.affiliateId}`);
      console.log(`   NOT adding userId filter to ensure strict affiliate isolation`);
      
      // DO NOT add userId filter when filtering by affiliateId
      // The affiliateId filter is sufficient and more reliable
    } else if (filterParams?.organizationId && filterParams.organizationId !== 'all' && filterParams.organizationId !== 'null') {
      query.organizationId = String(filterParams.organizationId);
      console.log(`🔒 Filtering by organizationId: ${query.organizationId}`);
      
      // For organizationId filter, add userId filter for precision
      if (userIds.length > 0 && userIds.length < 50) {
        query.userId = { $in: userIds };
        console.log(`🔒 Also filtering by userId: ${userIds.length} users`);
      }
    } else if (userContext.organizationId) {
      query.organizationId = String(userContext.organizationId);
      console.log(`🔒 Filtering by userContext.organizationId: ${query.organizationId}`);
      
      if (userIds.length > 0 && userIds.length < 50) {
        query.userId = { $in: userIds };
      }
    } else {
      // If no filter, use current user only
      query.userId = String(userContext.userId);
      console.log(`🔒 No org/affiliate filter, using userId only: ${query.userId}`);
    }
  } else {
    // Non-SuperAdmin: ALWAYS filter by their assigned organization/affiliate
    // This is the primary isolation mechanism
    if (userContext.affiliateId) {
      query.affiliateId = String(userContext.affiliateId);
      console.log(`🔒 Non-SuperAdmin filtering by affiliateId: ${query.affiliateId}`);
    } else if (userContext.organizationId) {
      query.organizationId = String(userContext.organizationId);
      console.log(`🔒 Non-SuperAdmin filtering by organizationId: ${query.organizationId}`);
    }
    
    // Always also filter by userId for non-SuperAdmin (double protection)
    query.userId = String(userContext.userId);
    console.log(`🔒 Non-SuperAdmin also filtering by userId: ${query.userId}`);
  }
  
  // Log the query for debugging
  console.log('🔍 buildDataQuery result:', {
    role: userContext.role,
    filterParams,
    query,
    userIds: userIds.length,
  });

  // Add legalFramework filter if provided (optional - don't force it)
  if (filterParams?.legalFramework && filterParams.legalFramework !== 'all') {
    query.legalFramework = filterParams.legalFramework;
  }
  // Note: We don't force legalFramework in the query to allow backward compatibility
  // New records will have legalFramework='DORA' by default from the model schema

  // Log the query for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 buildDataQuery result:', {
      role: userContext.role,
      filterParams,
      query: JSON.stringify(query, null, 2),
      userIds: userIds.length,
    });
  }

  return { userIds, query };
}

/**
 * Extract filter parameters from request URL
 */
export function extractFilterParams(request: { nextUrl: { searchParams: URLSearchParams } }): FilterParams {
  const { searchParams } = request.nextUrl;
  return {
    organizationId: searchParams.get('organizationId'),
    affiliateId: searchParams.get('affiliateId'),
    legalFramework: searchParams.get('legalFramework'),
  };
}

/**
 * Safe wrapper for buildDataQuery that handles errors gracefully
 */
export async function safeBuildDataQuery(
  userContext: UserContext,
  filterParams?: FilterParams
): Promise<{ userIds: string[]; query: any }> {
  try {
    return await buildDataQuery(userContext, filterParams);
  } catch (error: any) {
    console.error('Error in safeBuildDataQuery:', error);
    // Return a safe fallback query that only returns current user's data
    return {
      userIds: [userContext.userId],
      query: {
        userId: userContext.userId,
        ...(userContext.affiliateId && { affiliateId: userContext.affiliateId }),
        ...(userContext.organizationId && { organizationId: userContext.organizationId }),
      },
    };
  }
}

