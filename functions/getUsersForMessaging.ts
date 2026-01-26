import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate the user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to get all users
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    
    // Filter out the current user and return only necessary fields
    const otherUsers = allUsers
      .filter(u => u.id !== user.id)
      .map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        profile_photo: u.profile_photo,
        is_online: u.is_online,
        last_active_time: u.last_active_time,
      }));

    return Response.json({ users: otherUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});